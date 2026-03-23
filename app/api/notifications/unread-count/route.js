import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = getDB();
    const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE read = 0').get();
    return NextResponse.json({ count: row.count });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
