import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    
    if (!user || (user.role !== 'admin' && user.role !== 'receptionist')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();
    const { data: logs, error } = await supabase
      .from('reminder_logs')
      .select('*, patients(name)')
      .order('reminder_date', { ascending: false })
      .limit(500);

    if (error) throw error;
    return NextResponse.json(logs || []);
  } catch (error) {
    console.error('[RemindersHistory:GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
