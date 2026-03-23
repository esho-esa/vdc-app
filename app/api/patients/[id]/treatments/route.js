import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, treatmentFee, surgeryFee, consultationFee, date, dentist } = body;

    if (!description || !date) {
      return NextResponse.json({ error: 'Description and date are required' }, { status: 400 });
    }

    const db = getDB();
    const treatmentId = `t-${uuidv4().substring(0, 8)}`;
    const totalCost = (parseFloat(treatmentFee) || 0) + (parseFloat(surgeryFee) || 0) + (parseFloat(consultationFee) || 0);

    const stmt = db.prepare(`
      INSERT INTO treatments (id, patient_id, description, cost, treatment_fee, surgery_fee, consultation_fee, date, dentist)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      treatmentId,
      id,
      description,
      totalCost,
      parseFloat(treatmentFee) || 0,
      parseFloat(surgeryFee) || 0,
      parseFloat(consultationFee) || 0,
      date,
      dentist || 'Dr. Anand'
    );

    const newTreatment = db.prepare('SELECT * FROM treatments WHERE id = ?').get(treatmentId);
    
    // Add activity log entry
    db.prepare('INSERT INTO activity_log (id, text, subtext, color, patient_id) VALUES (?, ?, ?, ?, ?)').run(
      `act-${uuidv4().substring(0, 8)}`,
      `New treatment recorded: ${description}`,
      `Total: ₹${totalCost}`,
      'green',
      id
    );

    return NextResponse.json(newTreatment);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
