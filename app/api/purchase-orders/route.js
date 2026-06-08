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
    const { data: pos, error } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(pos || []);
  } catch (error) {
    console.error('[PurchaseOrders:GET] Error:', error);
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
    const { supplierId, orderDate, status, totalAmount, items } = body;

    if (!supplierId || !orderDate || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Supplier, Order Date, and Items are required' }, { status: 400 });
    }

    const supabase = getDB();
    const id = `po-${uuidv4().substring(0, 8)}`;

    const { data: inserted, error: insertErr } = await supabase
      .from('purchase_orders')
      .insert([
        {
          id,
          supplier_id: supplierId,
          order_date: orderDate,
          status: status || 'Draft',
          total_amount: parseFloat(totalAmount) || 0,
          items: items // Store as JSONB
        }
      ])
      .select('*, suppliers(name)')
      .single();

    if (insertErr) throw insertErr;

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `New Purchase Order created: ${id}`,
        subtext: `Status: ${status || 'Draft'} (Created by ${username})`,
        color: 'blue'
      }
    ]);

    return NextResponse.json(inserted);
  } catch (error) {
    console.error('[PurchaseOrders:POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
