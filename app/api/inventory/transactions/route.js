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

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    const supabase = getDB();
    let query = supabase
      .from('inventory_transactions')
      .select('*, inventory_items(item_name, unit, category)')
      .order('created_at', { ascending: false });

    if (itemId) {
      query = query.eq('item_id', itemId);
    }

    const { data: transactions, error } = await query;
    if (error) throw error;

    return NextResponse.json(transactions || []);
  } catch (error) {
    console.error('[InventoryTransactions:GET] Error:', error);
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
    const { itemId, transactionType, quantity, notes } = body;

    if (!itemId || !transactionType || quantity === undefined) {
      return NextResponse.json({ error: 'itemId, transactionType, and quantity are required' }, { status: 400 });
    }

    const supabase = getDB();

    // Fetch existing item
    const { data: item, error: itemErr } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty)) {
      return NextResponse.json({ error: 'Quantity must be an integer' }, { status: 400 });
    }

    const newStock = item.current_stock + qty;
    if (newStock < 0) {
      return NextResponse.json({ error: `Insufficient stock. Current: ${item.current_stock}, Request: ${Math.abs(qty)}` }, { status: 400 });
    }

    // Update item stock
    const { error: updateErr } = await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', itemId);

    if (updateErr) throw updateErr;

    // Create transaction log
    const txId = `itx-${uuidv4().substring(0, 8)}`;
    const { data: inserted, error: insertErr } = await supabase
      .from('inventory_transactions')
      .insert([
        {
          id: txId,
          item_id: itemId,
          transaction_type: transactionType,
          quantity: qty,
          notes: notes || ''
        }
      ])
      .select('*, inventory_items(item_name, unit)')
      .single();

    if (insertErr) throw insertErr;

    // Trigger low stock notifications if necessary
    if (newStock <= item.reorder_level) {
      // Create notification
      await supabase.from('notifications').insert([
        {
          id: `not-${uuidv4().substring(0, 8)}`,
          type: 'inventory',
          title: 'Low Stock Alert',
          message: `Stock for ${item.item_name} has dropped below the reorder level (${newStock} remaining).`,
          read: 0
        }
      ]);
    }

    return NextResponse.json(inserted);
  } catch (error) {
    console.error('[InventoryTransactions:POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
