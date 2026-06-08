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
    const lowStockOnly = searchParams.get('lowStock') === 'true';
    const category = searchParams.get('category');

    const supabase = getDB();
    let query = supabase
      .from('inventory_items')
      .select('*, suppliers(name)');

    if (category) {
      query = query.eq('category', category);
    }

    const { data: items, error } = await query.order('item_name', { ascending: true });
    if (error) throw error;

    let result = items || [];
    if (lowStockOnly) {
      result = result.filter(item => item.current_stock <= item.reorder_level);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[InventoryItems:GET] Error:', error);
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
    const { itemName, category, unit, currentStock, minimumStock, reorderLevel, purchasePrice, sellingPrice, supplierId, expiryDate } = body;

    if (!itemName || !category || !unit) {
      return NextResponse.json({ error: 'Item Name, Category, and Unit are required' }, { status: 400 });
    }

    const supabase = getDB();
    const id = `inv-${uuidv4().substring(0, 8)}`;

    const { data: inserted, error: insertError } = await supabase
      .from('inventory_items')
      .insert([
        {
          id,
          item_name: itemName,
          category,
          unit,
          current_stock: parseInt(currentStock) || 0,
          minimum_stock: parseInt(minimumStock) || 0,
          reorder_level: parseInt(reorderLevel) || 0,
          purchase_price: parseFloat(purchasePrice) || 0,
          selling_price: parseFloat(sellingPrice) || 0,
          supplier_id: supplierId || null,
          expiry_date: expiryDate || null
        }
      ])
      .select('*, suppliers(name)')
      .single();

    if (insertError) throw insertError;

    // Log transaction if initial stock > 0
    if (parseInt(currentStock) > 0) {
      await supabase.from('inventory_transactions').insert([
        {
          id: `itx-${uuidv4().substring(0, 8)}`,
          item_id: id,
          transaction_type: 'Adjustment',
          quantity: parseInt(currentStock),
          notes: 'Initial stock setup'
        }
      ]);
    }

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `New inventory item created: ${itemName}`,
        subtext: `Initial stock: ${currentStock || 0} ${unit} (Created by ${username})`,
        color: 'blue'
      }
    ]);

    return NextResponse.json(inserted);
  } catch (error) {
    console.error('[InventoryItems:POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
