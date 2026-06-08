import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supplier_name, phone, email, address } = body;

    const supabase = getDB();
    const updatePayload = {};
    if (supplier_name) updatePayload.supplier_name = supplier_name;
    if (phone !== undefined) updatePayload.phone = phone;
    if (email !== undefined) updatePayload.email = email;
    if (address !== undefined) updatePayload.address = address;

    const { data: updated, error: updateErr } = await supabase
      .from('suppliers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Supplier updated: ${updated.supplier_name}`,
        subtext: `Updated by ${username}`,
        color: 'blue'
      }
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Suppliers:PUT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();
    // Fetch name to log correctly
    const { data: supplier, error: fetchErr } = await supabase
      .from('suppliers')
      .select('supplier_name')
      .eq('id', id)
      .single();

    if (fetchErr || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const { error: deleteErr } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Supplier deleted: ${supplier.supplier_name}`,
        subtext: `Removed by ${username}`,
        color: 'red'
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Suppliers:DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
