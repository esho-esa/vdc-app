import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = getDB();
    let settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    if (!settings) {
      db.prepare('INSERT INTO settings (id) VALUES (1)').run();
      settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const db = getDB();
    const body = await request.json();
    db.prepare(`
      UPDATE settings SET 
        clinic_name = ?, tagline = ?, email = ?, phone = ?, address = ?,
        accent_color = ?, whatsapp_enabled = ?, whatsapp_number = ?,
        reminder_template = ?
      WHERE id = 1
    `).run(
      body.clinicName || '', body.tagline || '', body.email || '', body.phone || '', body.address || '',
      body.accentColor || '#007aff', body.whatsappEnabled ? 1 : 0, body.whatsappNumber || '',
      body.reminderTemplate || ''
    );
    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
