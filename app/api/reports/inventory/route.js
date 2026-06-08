import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = getDB();

    // 1. Fetch all items
    const { data: items, error: itemsErr } = await supabase
      .from('inventory_items')
      .select('*, suppliers(name)');
    if (itemsErr) throw itemsErr;

    // 2. Fetch all transactions within date range or overall
    let txQuery = supabase
      .from('inventory_transactions')
      .select('*, inventory_items(item_name, unit, category)');
    if (startDate) txQuery = txQuery.gte('created_at', startDate);
    if (endDate) txQuery = txQuery.lte('created_at', endDate);

    const { data: transactions, error: txErr } = await txQuery.order('created_at', { ascending: false });
    if (txErr) throw txErr;

    // 3. Fetch purchase orders to compile Supplier and PO spends
    const { data: purchaseOrders, error: poErr } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)');
    if (poErr) throw poErr;

    // --- Metric Calculations ---
    let totalValue = 0;
    const lowStockItems = [];
    const outOfStockItems = [];
    const expiringItems = [];

    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    (items || []).forEach(item => {
      const stockVal = (item.current_stock || 0) * (parseFloat(item.purchase_price) || 0);
      totalValue += stockVal;

      if (item.current_stock <= 0) {
        outOfStockItems.push(item);
      } else if (item.current_stock <= item.reorder_level) {
        lowStockItems.push(item);
      }

      if (item.expiry_date) {
        const expDate = new Date(item.expiry_date);
        if (expDate <= sixMonthsFromNow) {
          expiringItems.push(item);
        }
      }
    });

    // Consumption Report: Filter usage transactions
    const consumptionList = (transactions || []).filter(tx => tx.transaction_type === 'Usage');
    
    // Purchase Report: Filter purchase transactions
    const purchaseList = (transactions || []).filter(tx => tx.transaction_type === 'Purchase');

    // Supplier Report: Spend by supplier from POs
    const supplierSpends = {};
    const { data: suppliers, error: supErr } = await supabase.from('suppliers').select('id, name');
    if (supErr) throw supErr;

    (suppliers || []).forEach(s => {
      supplierSpends[s.id] = {
        id: s.id,
        name: s.name,
        totalPOValue: 0,
        poCount: 0,
        itemCount: 0
      };
    });

    (items || []).forEach(item => {
      if (item.supplier_id && supplierSpends[item.supplier_id]) {
        supplierSpends[item.supplier_id].itemCount++;
      }
    });

    (purchaseOrders || []).forEach(po => {
      if (po.supplier_id && supplierSpends[po.supplier_id]) {
        supplierSpends[po.supplier_id].poCount++;
        if (po.status === 'Received') {
          supplierSpends[po.supplier_id].totalPOValue += parseFloat(po.total_amount) || 0;
        }
      }
    });

    return NextResponse.json({
      metrics: {
        totalInventoryValue: totalValue,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        expiringCount: expiringItems.length
      },
      lowStockItems,
      outOfStockItems,
      expiringItems,
      stockList: items || [],
      consumptionList,
      purchaseList,
      supplierReport: Object.values(supplierSpends)
    });
  } catch (error) {
    console.error('[InventoryReports:GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
