import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf';

/**
 * Helper to upload PDF to Supabase Storage.
 * Auto-creates bucket if it does not exist.
 */
async function uploadPDFToStorage(supabase, filename, pdfBuffer) {
  const bucketName = 'ebills';
  console.log(`[PDF:Upload] Attempting to upload ${filename} to Supabase Storage bucket '${bucketName}'...`);
  
  // Try uploading first
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filename, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    console.warn(`[PDF:Upload] Initial upload failed: ${error.message}. Checking if bucket exists...`);
    // Attempt to create bucket if it doesn't exist
    try {
      console.log(`[PDF:Upload] Attempting to create bucket '${bucketName}'...`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError && !createError.message?.includes('already exists')) {
        console.error(`[PDF:Upload] Failed to create bucket '${bucketName}':`, createError.message);
        throw createError;
      }

      console.log(`[PDF:Upload] Bucket '${bucketName}' verified/created. Retrying upload...`);
      const { data: retryData, error: retryError } = await supabase.storage
        .from(bucketName)
        .upload(filename, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (retryError) {
        console.error(`[PDF:Upload] Retry upload failed:`, retryError.message);
        throw retryError;
      }

      console.log(`[PDF:Upload] Retry upload succeeded:`, retryData.path);
      return retryData;
    } catch (bucketErr) {
      console.error(`[PDF:Upload] Bucket auto-creation or retry failed:`, bucketErr.message);
      throw bucketErr;
    }
  }

  console.log(`[PDF:Upload] Upload succeeded:`, data.path);
  return data;
}

export async function GET(request, { params }) {
  const { filename } = await params;

  console.log('[PDF:Retrieve] Request for:', filename);

  // Validate filename format
  if (!filename || !filename.endsWith('.pdf')) {
    console.warn('[PDF:Retrieve] Invalid filename:', filename);
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
  }

  // Extract prescription ID from filename (format: rx-{uuid}.pdf)
  const match = filename.match(/^rx-(.+)\.pdf$/);
  if (!match || !match[1]) {
    console.warn('[PDF:Retrieve] Could not parse prescription ID from:', filename);
    return NextResponse.json({ error: 'Invalid PDF filename format. Expected: rx-{id}.pdf' }, { status: 400 });
  }

  const prescriptionId = match[1];
  console.log('[PDF:Retrieve] Prescription ID:', prescriptionId);

  const supabase = getDB();

  // If supabase is null (local mock preview mode)
  if (!supabase) {
    console.warn('[PDF:Retrieve] Database client is null. Generating mock PDF on-the-fly for local preview.');
    try {
      const mockPrescription = {
        id: prescriptionId,
        patient_id: 'mock-patient',
        medications: JSON.stringify([
          { name: 'Mock Amoxicillin 500mg', price: 45 },
          { name: 'Mock Paracetamol 500mg', price: 20 }
        ]),
        diagnosis: 'Mock Dental Cavity',
        notes: 'Take medicines after meals.',
        pdf_url: `/api/pdfs/${filename}`,
        total_amount: 215,
        surgeon_fee: 150,
        date: new Date().toISOString().split('T')[0]
      };

      const mockPatient = {
        id: 'mock-patient',
        name: 'Mock Patient (Local Preview)',
        phone: '+91 9999999999',
        age: 35,
        address: '123 Mock Street, Chennai'
      };

      const pdfBuffer = await generateInvoicePDF({
        prescription: mockPrescription,
        patient: mockPatient
      });

      console.log('[PDF:Retrieve] Mock PDF generated successfully, size:', pdfBuffer.length, 'bytes');

      const url = new URL(request.url);
      const download = url.searchParams.get('download') === 'true';
      const disposition = download
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`;

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': disposition,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'private, max-age=300',
        },
      });
    } catch (error) {
      console.error('[PDF:Retrieve] Mock generation failed:', error);
      return NextResponse.json({ error: 'Failed to generate preview PDF.' }, { status: 500 });
    }
  }

  try {
    // Fetch prescription from database
    const { data: prescription, error: rxError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', prescriptionId)
      .single();

    if (rxError || !prescription) {
      console.error('[PDF:Retrieve] Prescription not found in database:', prescriptionId, rxError?.message);
      return NextResponse.json(
        { error: 'Prescription not found. It may have been deleted.' },
        { status: 404 }
      );
    }

    console.log('[PDF:Retrieve] Prescription found, checking cloud storage...');

    let pdfBuffer;
    let fileDownloaded = false;

    // Try downloading the PDF from Supabase Storage
    try {
      console.log(`[PDF:Retrieve] Attempting to download PDF: ebills/${filename}...`);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('ebills')
        .download(filename);

      if (downloadError) {
        console.warn(`[PDF:Retrieve] Storage download failed: ${downloadError.message}. Initiating Auto-Recovery...`);
      } else if (fileData) {
        const arrayBuffer = await fileData.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuffer);
        fileDownloaded = true;
        console.log(`[PDF:Retrieve] PDF downloaded successfully from storage, size: ${pdfBuffer.length} bytes`);
      }
    } catch (err) {
      console.error('[PDF:Retrieve] Exception during storage download:', err.message);
    }

    // Auto-Recovery Mode: Regenerate if missing in storage
    if (!fileDownloaded) {
      console.log(`[PDF:Retrieve] Auto-Recovery: Regenerating missing PDF for prescription:`, prescriptionId);

      // Fetch patient data
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', prescription.patient_id)
        .single();

      if (patientError || !patient) {
        console.error('[PDF:Retrieve] Auto-Recovery failed: Patient not found for patient_id:', prescription.patient_id, patientError?.message);
        return NextResponse.json(
          { error: 'Patient record not found for this prescription.' },
          { status: 404 }
        );
      }

      // Fetch clinic settings
      const { data: settings } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();

      // Generate PDF
      console.log('[PDF:Retrieve] Auto-Recovery: Generating PDF buffer on-the-fly...');
      pdfBuffer = await generateInvoicePDF({
        prescription,
        patient,
        settings: settings || undefined
      });
      console.log('[PDF:Retrieve] Auto-Recovery: PDF generated successfully, size:', pdfBuffer.length, 'bytes');

      // Upload regenerated PDF to Storage
      try {
        console.log('[PDF:Retrieve] Auto-Recovery: Uploading regenerated PDF to storage...');
        await uploadPDFToStorage(supabase, filename, pdfBuffer);

        // Update database reference if needed
        const newPdfUrl = `/api/pdfs/${filename}`;
        if (prescription.pdf_url !== newPdfUrl) {
          console.log('[PDF:Retrieve] Auto-Recovery: Updating DB pdf_url to:', newPdfUrl);
          await supabase
            .from('prescriptions')
            .update({ pdf_url: newPdfUrl })
            .eq('id', prescriptionId);
        }
      } catch (uploadError) {
        console.error('[PDF:Retrieve] Auto-Recovery Warning: Failed to save regenerated PDF to storage:', uploadError.message);
      }
    }

    // Check if download was requested
    const url = new URL(request.url);
    const download = url.searchParams.get('download') === 'true';
    const disposition = download
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('[PDF:Retrieve] Error retrieving/generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve or generate PDF. Please try again.' },
      { status: 500 }
    );
  }
}