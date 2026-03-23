import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getDB();
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Format time for UI (e.g., "2 hours ago")
    const formatted = notifications.map(n => {
      const now = new Date();
      const created = new Date(n.created_at);
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
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        patientId: n.patient_id,
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
    const supabase = getDB();
    const { id, read, all } = await request.json();
    
    if (all) {
      await supabase.from('notifications').update({ read: 1 }).neq('read', 1);
    } else {
      await supabase.from('notifications').update({ read: read ? 1 : 0 }).eq('id', id);
    }
      
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = getDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (all) {
      await supabase.from('notifications').delete().neq('id', '0'); // workaround for deleting all if needed, or just delete()
    } else if (id) {
      await supabase.from('notifications').delete().eq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
