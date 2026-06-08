import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDB } from '@/lib/db';

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();
    let query = supabase.from('staff_members').update({ last_seen_at: new Date().toISOString() });

    if (user.id) {
      query = query.eq('id', user.id);
    } else if (user.username) {
      query = query.eq('username', user.username);
    } else {
      query = query.eq('email', user.email);
    }

    const { error } = await query;
    if (error) {
      // If table doesn't exist yet or update fails, return success silently so client heartbeat doesn't break UI
      console.warn('[Heartbeat API] Warning updating last_seen_at:', error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Heartbeat API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
