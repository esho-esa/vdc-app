import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();
    const { data: logs, error } = await supabase
      .from('staff_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('[Activity API] staff_activity_logs query failed:', error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(logs || []);
  } catch (error) {
    console.error('[Activity API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
