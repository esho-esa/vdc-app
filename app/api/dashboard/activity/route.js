import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = getDB();
    const logs = db.prepare(`
      SELECT l.id, l.text, l.subtext, l.color, l.created_at as time 
      FROM activity_log l
      LEFT JOIN patients p ON l.patient_id = p.id
      WHERE p.id IS NULL OR p.is_deleted = 0
      ORDER BY l.created_at DESC 
      LIMIT 10
    `).all();

    // Format time for UI (e.g., "9:00 AM")
    const formattedLogs = logs.map(log => {
      const date = new Date(log.time);
      return {
        ...log,
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    });

    return NextResponse.json(formattedLogs);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getDB();
    const { text, subtext, color, patientId } = await request.json();
    const id = Math.random().toString(36).substring(2, 9);
    
    db.prepare('INSERT INTO activity_log (id, text, subtext, color, patient_id) VALUES (?, ?, ?, ?, ?)')
      .run(id, text, subtext, color || '', patientId || null);
      
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
