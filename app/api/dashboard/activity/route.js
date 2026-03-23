import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getDB();
    const { data: logs, error } = await supabase
      .from('activity_log')
      .select('*, patients(is_deleted)')
      .or('patients.is_deleted.eq.0,patients.is_deleted.is.null')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Format time for UI (e.g., "9:00 AM")
    const formattedLogs = logs.map(log => {
      const date = new Date(log.created_at);
      return {
        id: log.id,
        text: log.text,
        subtext: log.subtext,
        color: log.color,
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
    const supabase = getDB();
    const { text, subtext, color, patientId } = await request.json();
    const id = Math.random().toString(36).substring(2, 9);
    
    const { error } = await supabase.from('activity_log').insert([
      {
        id,
        text,
        subtext,
        color: color || '',
        patient_id: patientId || null
      }
    ]);
      
    if (error) throw error;
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
