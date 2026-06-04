import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf';

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

  try {
    const supabase = getDB();

    // Fetch prescription from database
    const { data: prescription, error: rxError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', prescriptionId)
      .single();

    if (rxError || !prescription) {
      console.error('[PDF:Retrieve] Prescription not found:', prescriptionId, rxError?.message);
      return NextResponse.json(
        { error: 'Prescription not found. It may have been deleted.' },
        { status: 404 }
      );
    }

    console.log('[PDF:Retrieve] Prescription found, fetching patient:', prescription.patient_id);

    // Fetch patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', prescription.patient_id)
      .single();

    if (patientError || !patient) {
      console.error('[PDF:Retrieve] Patient not found:', prescription.patient_id, patientError?.message);
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

    console.log('[PDF:Retrieve] Generating PDF on-the-fly for:', prescription.id);

    // Generate PDF on-the-fly from database data
    const pdfBuffer = await generateInvoicePDF({
      prescription,
      patient,
      settings: settings || undefined
    });

    console.log('[PDF:Retrieve] PDF generated successfully, size:', pdfBuffer.length, 'bytes');

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
    console.error('[PDF:Retrieve] Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF. Please try again.' },
      { status: 500 }
    );
  }
}