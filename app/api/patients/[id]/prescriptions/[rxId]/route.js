import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE(request, { params }) {
  try {
    const { id: patientId, rxId } = await params;
    const supabase = getDB();

    // Get the prescription to find the PDF file path
    const { data: prescription, error: fetchError } = await supabase
      .from('prescriptions')
      .select('pdf_url')
      .eq('id', rxId)
      .eq('patient_id', patientId)
      .single();

    if (fetchError || !prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    // Delete the PDF file if it exists
    if (prescription.pdf_url) {
      // The pdfUrl is stored as /api/pdfs/rx-ID.pdf
      // We need to extract the filename or the original path
      const filename = prescription.pdf_url.split('/').pop();
      const pdfPath = path.join(process.cwd(), 'public', 'pdfs', filename);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('prescriptions')
      .delete()
      .eq('id', rxId)
      .eq('patient_id', patientId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
