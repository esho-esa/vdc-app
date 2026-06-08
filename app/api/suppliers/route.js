import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('supplier_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json(suppliers || []);
  } catch (error) {
    console.error('[Suppliers:GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { supplier_name, phone, email, address } = body;

    if (!supplier_name) {
      return NextResponse.json({ error: 'Supplier Name is required' }, { status: 400 });
    }

    const supabase = getDB();
    const id = `sup-${uuidv4().substring(0, 8)}`;

    const { data: inserted, error: insertError } = await supabase
      .from('suppliers')
      .insert([
        {
          id,
          supplier_name,
          phone: phone || '',
          email: email || '',
          address: address || ''
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `New supplier added: ${supplier_name}`,
        subtext: `Created by ${username}`,
        color: 'blue'
      }
    ]);

    return NextResponse.json(inserted);
  } catch (error) {
    console.error('[Suppliers:POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
