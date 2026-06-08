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
    const { itemName, category, unit, currentStock, minimumStock, reorderLevel, purchasePrice, sellingPrice, supplierId, expiryDate } = body;

    const supabase = getDB();
    
    // Fetch current state to check if stock changed
    const { data: existing, error: fetchErr } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const updatePayload = {};
    if (itemName) updatePayload.item_name = itemName;
    if (category) updatePayload.category = category;
    if (unit) updatePayload.unit = unit;
    if (currentStock !== undefined) updatePayload.current_stock = parseInt(currentStock);
    if (minimumStock !== undefined) updatePayload.minimum_stock = parseInt(minimumStock);
    if (reorderLevel !== undefined) updatePayload.reorder_level = parseInt(reorderLevel);
    if (purchasePrice !== undefined) updatePayload.purchase_price = parseFloat(purchasePrice);
    if (sellingPrice !== undefined) updatePayload.selling_price = parseFloat(sellingPrice);
    if (supplierId !== undefined) updatePayload.supplier_id = supplierId || null;
    if (expiryDate !== undefined) updatePayload.expiry_date = expiryDate || null;

    const { data: updated, error: updateErr } = await supabase
      .from('inventory_items')
      .update(updatePayload)
      .eq('id', id)
      .select('*, suppliers(name)')
      .single();

    if (updateErr) throw updateErr;

    // Log transaction if stock changed manually (Adjustment)
    if (currentStock !== undefined && parseInt(currentStock) !== existing.current_stock) {
      const diff = parseInt(currentStock) - existing.current_stock;
      await supabase.from('inventory_transactions').insert([
        {
          id: `itx-${uuidv4().substring(0, 8)}`,
          item_id: id,
          transaction_type: 'Adjustment',
          quantity: diff,
          notes: `Manual adjustment from update (Previous: ${existing.current_stock}, New: ${currentStock})`
        }
      ]);
    }

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Inventory item updated: ${updated.item_name}`,
        subtext: `Updated by ${username}`,
        color: 'blue'
      }
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[InventoryItems:PUT] Error:', error);
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
      .from('inventory_items')
      .select('item_name')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const { error: deleteErr } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Inventory item deleted: ${existing.item_name}`,
        subtext: `Removed by ${username}`,
        color: 'red'
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[InventoryItems:DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
