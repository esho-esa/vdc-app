import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const db = getDB();
    const appointments = db.prepare(`
      SELECT a.* 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE p.is_deleted = 0
      ORDER BY a.date ASC, a.time ASC
    `).all();
    return NextResponse.json(appointments);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getDB();
    const body = await request.json();
    const id = uuidv4();
    db.prepare(
      'INSERT INTO appointments (id, patient_id, patient_name, date, time, duration, type, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, body.patientId, body.patientName, body.date, body.time, body.duration || 30, body.type || 'checkup', body.status || 'pending', body.notes || '');
    const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
