import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const db = getDB();
    const body = await request.json();
    
    if (body.password) {
      const pwHash = hashPassword(body.password);
      db.prepare('UPDATE staff SET name = ?, username = ?, email = ?, role = ?, password_hash = ? WHERE id = ?')
        .run(body.name, body.username, body.email, body.role, pwHash, id);
    } else {
      db.prepare('UPDATE staff SET name = ?, username = ?, email = ?, role = ? WHERE id = ?')
        .run(body.name, body.username, body.email, body.role, id);
    }
      
    const updated = db.prepare('SELECT id, name, username, email, role, created_at FROM staff WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const db = getDB();
    db.prepare('DELETE FROM staff WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
