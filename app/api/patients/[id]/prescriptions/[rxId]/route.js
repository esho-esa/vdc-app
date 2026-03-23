import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE(request, { params }) {
  try {
    const { id: patientId, rxId } = await params;
    const db = getDB();

    // Get the prescription to find the PDF file path
    const prescription = db.prepare('SELECT pdf_url FROM prescriptions WHERE id = ? AND patient_id = ?').get(rxId, patientId);

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    // Delete the PDF file if it exists
    if (prescription.pdf_url) {
      const pdfPath = path.join(process.cwd(), 'assets', prescription.pdf_url);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    // Delete from database
    db.prepare('DELETE FROM prescriptions WHERE id = ? AND patient_id = ?').run(rxId, patientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
