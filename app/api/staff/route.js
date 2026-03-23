import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const supabase = getDB();
    const { data: staff, error } = await supabase
      .from('staff')
      .select('id, name, username, email, role, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = getDB();
    const body = await request.json();
    const id = uuidv4();
    const pwHash = hashPassword(body.password || 'changeMe123');
    
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert([
        {
          id,
          name: body.name,
          username: body.username,
          email: body.email,
          role: body.role,
          password_hash: pwHash
        }
      ])
      .select('id, name, username, email, role, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json(newStaff, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
