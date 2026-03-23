import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = getDB();
    const patient = db.prepare('SELECT id, name, phone, email, age, address, medical_history AS medicalHistory, created_at FROM patients WHERE id = ?').get(id);
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    const appointments = db.prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC').all(id);
    const treatments = db.prepare('SELECT * FROM treatments WHERE patient_id = ? ORDER BY date DESC').all(id);
    const prescriptions = db.prepare('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY date DESC').all(id);
    return NextResponse.json({ ...patient, appointments, treatments, prescriptions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const db = getDB();
    const body = await request.json();
    db.prepare(
      'UPDATE patients SET name = ?, phone = ?, email = ?, age = ?, address = ?, medical_history = ? WHERE id = ?'
    ).run(body.name, body.phone, body.email, body.age, body.address || '', body.medicalHistory, id);
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    return NextResponse.json(patient);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';
    const db = getDB();
    
    if (permanent) {
      // Manual cascading delete (since ON DELETE CASCADE is not in schema)
      db.prepare('DELETE FROM appointments WHERE patient_id = ?').run(id);
      db.prepare('DELETE FROM treatments WHERE patient_id = ?').run(id);
      db.prepare('DELETE FROM prescriptions WHERE patient_id = ?').run(id);
      db.prepare('DELETE FROM patients WHERE id = ?').run(id);
    } else {
      // Soft delete
      db.prepare('UPDATE patients SET is_deleted = 1 WHERE id = ?').run(id);
    }
    
    return NextResponse.json({ success: true, permanent });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
