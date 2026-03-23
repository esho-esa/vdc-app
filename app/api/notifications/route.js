import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = getDB();
    const notifications = db.prepare(`
      SELECT id, type, title, message, patient_id as patientId, read, created_at as time 
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT 20
    `).all();

    // Format time for UI (e.g., "2 hours ago")
    const formatted = notifications.map(n => {
      const now = new Date();
      const created = new Date(n.time);
      const diffMs = now - created;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      
      let timeStr = 'Just now';
      if (diffHrs > 0 && diffHrs < 24) timeStr = `${diffHrs} hours ago`;
      else if (diffHrs >= 24) timeStr = `${Math.floor(diffHrs / 24)} days ago`;
      else {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          if (diffMins > 0) timeStr = `${diffMins} mins ago`;
      }

      return {
        ...n,
        read: !!n.read,
        time: timeStr
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const db = getDB();
    const { id, read, all } = await request.json();
    
    if (all) {
      db.prepare('UPDATE notifications SET read = 1').run();
    } else {
      db.prepare('UPDATE notifications SET read = ? WHERE id = ?')
        .run(read ? 1 : 0, id);
    }
      
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (all) {
      db.prepare('DELETE FROM notifications').run();
    } else if (id) {
      db.prepare('DELETE FROM notifications WHERE id = ?').run(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
