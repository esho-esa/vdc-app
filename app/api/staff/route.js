import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const db = getDB();
    const staff = db.prepare('SELECT id, name, username, email, role, created_at FROM staff ORDER BY created_at ASC').all();
    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getDB();
    const body = await request.json();
    const id = uuidv4();
    const pwHash = hashPassword(body.password || 'changeMe123');
    
    db.prepare(`
      INSERT INTO staff (id, name, username, email, role, password_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, body.name, body.username, body.email, body.role, pwHash);
    
    const newStaff = db.prepare('SELECT id, name, username, email, role, created_at FROM staff WHERE id = ?').get(id);
    return NextResponse.json(newStaff, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
