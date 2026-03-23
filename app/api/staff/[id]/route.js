import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const supabase = getDB();
    const body = await request.json();
    
    const updateData = {
      name: body.name,
      username: body.username,
      email: body.email,
      role: body.role
    };

    if (body.password) {
      updateData.password_hash = hashPassword(body.password);
    }
    
    const { data: updated, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id)
      .select('id, name, username, email, role, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const supabase = getDB();
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
