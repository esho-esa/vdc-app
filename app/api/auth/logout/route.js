import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { logStaffActivity } from '@/lib/activity';

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (user) {
      // Record Logout action
      await logStaffActivity({
        staffId: user.id || null,
        staffName: user.name,
        action: 'Logout',
        details: `${user.name} (${user.role}) logged out successfully`
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
