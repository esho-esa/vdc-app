import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const showBin = searchParams.get('bin') === 'true';
    const db = getDB();
    const patients = db.prepare(`
      SELECT id, name, phone, email, age, address, medical_history AS medicalHistory, created_at 
      FROM patients 
      WHERE is_deleted = ${showBin ? 1 : 0}
      ORDER BY created_at DESC
    `).all();
    return NextResponse.json(patients);
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
      'INSERT INTO patients (id, name, phone, email, age, address, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, body.name, body.phone || '', body.email || '', body.age || null, body.address || '', body.medicalHistory || '');

    // Activity Logging for new patients
    const actId = Math.random().toString(36).substring(2, 9);
    db.prepare('INSERT INTO activity_log (id, text, subtext, patient_id) VALUES (?, ?, ?, ?)')
      .run(actId, `New patient registered: ${body.name}`, `Age: ${body.age || 'N/A'}`, id);

    const patient = db.prepare('SELECT id, name, phone, email, age, address, medical_history AS medicalHistory, created_at FROM patients WHERE id = ?').get(id);
    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
