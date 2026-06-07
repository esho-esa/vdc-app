import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateInvoicePDF } from '@/lib/pdf';
import { sendWhatsAppReminder } from '@/lib/whatsapp';

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

export async function POST(request, { params }) {
  try {
    const { id: patientId } = await params;
    const body = await request.json();
    const { medications, diagnosis, notes, date, surgeonFee } = body;

    console.log('[Prescription:Create] Starting for patient:', patientId);

    if (!medications || !date) {
      return NextResponse.json(
        { error: 'Medications and date are required' },
        { status: 400 }
      );
    }

    const supabase = getDB();

    // Get patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      console.error('[Prescription:Create] Patient not found:', patientId, patientError?.message);
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get settings for branding
    const { data: settingsData } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    const settings = settingsData || {
      clinic_name: 'Victoria Dental Care',
      tagline: 'Premium Dental Solutions',
      address: 'No 1/334 Injambakkam, Opp to Suga Jeeva Peralayam, Ammathi, Perumal Koil St, Chennai',
      phone: '+91 9176733358',
      email: 'victoriadentalcare2015@gmail.com',
      accent_color: '#007aff'
    };

    const rxId = uuidv4();
    const pdfFilename = `rx-${rxId}.pdf`;
    const pdfUrl = `/api/pdfs/${pdfFilename}`;

    // Calculate total
    const medsArray = Array.isArray(medications) ? medications : [];
    const surgeonFeeNum = parseFloat(surgeonFee) || 0;
    const subtotal = medsArray.reduce((sum, med) => sum + (parseFloat(med.price) || 0), 0);
    const totalAmount = subtotal + surgeonFeeNum;

    console.log('[Prescription:Create] Total amount:', totalAmount);

    // Build prescription record
    const prescriptionRecord = {
      id: rxId,
      patient_id: patientId,
      medications: JSON.stringify(medications),
      diagnosis: diagnosis || '',
      notes: notes || '',
      pdf_url: pdfUrl,
      total_amount: totalAmount,
      surgeon_fee: surgeonFeeNum,
      date: date
    };

    // Generate PDF in-memory
    let pdfBuffer;
    try {
      console.log('[Prescription:Create] Generating invoice PDF buffer...');
      pdfBuffer = await generateInvoicePDF({
        prescription: prescriptionRecord,
        patient,
        settings
      });
      console.log('[Prescription:Create] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    } catch (pdfError) {
      console.error('[Prescription:Create] PDF generation failed:', pdfError);
      return NextResponse.json(
        { error: 'PDF generation failed. Please try again.' },
        { status: 500 }
      );
    }

    // Upload PDF to Supabase Storage
    try {
      await uploadPDFToStorage(supabase, pdfFilename, pdfBuffer);
    } catch (uploadError) {
      console.error('[Prescription:Create] PDF upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Failed to save E-Bill to cloud storage: ' + uploadError.message },
        { status: 500 }
      );
    }

    // Save to DB
    const { data: newRx, error: rxError } = await supabase
      .from('prescriptions')
      .insert([prescriptionRecord])
      .select()
      .single();

    if (rxError) {
      console.error('[Prescription:Create] DB insert failed:', rxError);
      throw rxError;
    }
    console.log('[Prescription:Create] Saved to database:', newRx.id);

    // Log activity
    await supabase.from('activity_log').insert([
      {
        text: `E-Bill generated for ${patient.name}`,
        subtext: `Amount: ₹${totalAmount}`,
        patient_id: patientId
      }
    ]);

    // Send WhatsApp
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const pdfPublicLink = `${siteUrl}${pdfUrl}`;
    const message = `Hello ${patient.name}, your prescription is ready: ${pdfPublicLink}`;

    if (patient.phone) {
      try {
        await sendWhatsAppReminder(patient.phone, message);
        console.log('[Prescription:Create] WhatsApp message sent');
      } catch (waError) {
        console.warn('[Prescription:Create] WhatsApp send failed (non-critical):', waError.message);
      }
    }

    console.log('[Prescription:Create] Complete. Prescription ID:', newRx.id);
    return NextResponse.json(newRx, { status: 201 });

  } catch (error) {
    console.error('[Prescription:Create] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}