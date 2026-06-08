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
    const { supplierId, orderDate, status, totalAmount, items } = body;

    const supabase = getDB();

    // Fetch existing PO
    const { data: existing, error: fetchErr } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const updatePayload = {};
    if (supplierId) updatePayload.supplier_id = supplierId;
    if (orderDate) updatePayload.order_date = orderDate;
    if (status) updatePayload.status = status;
    if (totalAmount !== undefined) updatePayload.total_amount = parseFloat(totalAmount);
    if (items) updatePayload.items = items;

    // Check transition to Received
    const isTransitioningToReceived = status === 'Received' && existing.status !== 'Received';

    const { data: updated, error: updateErr } = await supabase
      .from('purchase_orders')
      .update(updatePayload)
      .eq('id', id)
      .select('*, suppliers(supplier_name)')
      .single();

    if (updateErr) throw updateErr;

    // Execute stock increment if transitioned to Received
    if (isTransitioningToReceived) {
      const itemsList = Array.isArray(updated.items) ? updated.items : [];
      for (const poItem of itemsList) {
        const itemId = poItem.itemId;
        const qtyToReceive = parseInt(poItem.quantity) || 0;

        if (itemId && qtyToReceive > 0) {
          // Fetch existing item stock
          const { data: invItem, error: invErr } = await supabase
             .from('inventory_items')
             .select('current_stock, item_name')
             .eq('id', itemId)
             .single();

          if (!invErr && invItem) {
            const newStock = invItem.current_stock + qtyToReceive;
            
            // Update stock
            await supabase
              .from('inventory_items')
              .update({ current_stock: newStock })
              .eq('id', itemId);

            // Log Transaction
            await supabase.from('stock_transactions').insert([
              {
                id: `stx-${uuidv4().substring(0, 8)}`,
                inventory_item_id: itemId,
                transaction_type: 'IN',
                quantity: qtyToReceive,
                reason: `Received from Purchase Order ${id}`,
                staff_id: user.id || null
              }
            ]);
          }
        }
      }
    }

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Purchase Order ${id} updated: ${status || updated.status}`,
        subtext: `Updated by ${username}`,
        color: status === 'Received' ? 'green' : 'blue'
      }
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PurchaseOrders:PUT] Error:', error);
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
    const { data: existing, error: fetchErr } = await supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    // Allow deleting draft or cancelled POs, otherwise mark as cancelled
    if (existing.status === 'Received') {
      return NextResponse.json({ error: 'Cannot delete a received Purchase Order' }, { status: 400 });
    }

    const { error: deleteErr } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Purchase Order deleted: ${id}`,
        subtext: `Removed by ${username}`,
        color: 'red'
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PurchaseOrders:DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
