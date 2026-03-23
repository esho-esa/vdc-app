import { NextResponse } from 'next/server';
import { getDB } from '../../../../lib/db';

export async function PUT(request, { params }) {
  const { id } = params;
  const { status } = await request.json();

  try {
    const db = getDB();
    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    
    // Log activity
    const actId = Math.random().toString(36).substring(2, 9);
    db.prepare('INSERT INTO activity_log (id, text, subtext, color, patient_id) VALUES (?, ?, ?, ?, ?)')
      .run(actId, `Appointment status updated: ${status}`, `Patient: ${updated.patient_name}`, 'blue', updated.patient_id);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;

  try {
    const db = getDB();
    db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
