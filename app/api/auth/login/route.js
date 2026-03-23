import { NextResponse } from 'next/server';
import { generateToken, verifyPassword } from '@/lib/auth';
import { getDB } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const db = getDB();
    const user = db.prepare('SELECT id, name, username, email, role, password_hash FROM staff WHERE username = ?').get(username);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = generateToken({ email: user.email, name: user.name, role: user.role, id: user.id });

    return NextResponse.json({
      success: true,
      token,
      user: { email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
