import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getDB();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', 0);

    if (error) throw error;
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
