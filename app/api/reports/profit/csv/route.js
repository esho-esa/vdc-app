import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permitted = await hasPermission(user.role, 'expenses', 'view');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month'; // 'day', 'week', 'month', 'year'

    const today = new Date().toISOString().split('T')[0];
    let startDate = '';

    const getPastDateStr = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    if (range === 'day') {
      startDate = today;
    } else if (range === 'week') {
      startDate = getPastDateStr(7);
    } else if (range === 'month') {
      startDate = getPastDateStr(30);
    } else if (range === 'year') {
      startDate = getPastDateStr(365);
    }

    const supabase = getDB();

    // Fetch payments received (Revenue Cash) and expenses in parallel
    const [
      { data: payments },
      { data: expenses }
    ] = await Promise.all([
      supabase.from('payments').select('payment_date, amount, payment_method, patients(name)').gte('payment_date', startDate),
      supabase.from('expenses').select('expense_date, amount, vendor_name, payment_method, notes, expense_categories(name)').gte('expense_date', startDate)
    ]);

    const ledgerItems = [];

    // Map payments to ledger (Revenue)
    (payments || []).forEach(p => {
      ledgerItems.push({
        date: p.payment_date,
        type: 'Revenue',
        category: 'Patient Payment',
        entity: p.patients?.name || 'Patient',
        method: p.payment_method,
        notes: 'Clinical receipts',
        amount: parseFloat(p.amount)
      });
    });

    // Map expenses to ledger (Expense)
    (expenses || []).forEach(e => {
      ledgerItems.push({
        date: e.expense_date,
        type: 'Expense',
        category: e.expense_categories?.name || 'Other',
        entity: e.vendor_name || 'Vendor',
        method: e.payment_method,
        notes: e.notes || '',
        amount: parseFloat(e.amount)
      });
    });

    // Sort chronologically
    ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Compile CSV string
    const headers = ['Date', 'Type', 'Category', 'Vendor/Patient', 'Payment Method', 'Notes', 'Amount (INR)'];
    const rows = ledgerItems.map(item => [
      item.date,
      item.type,
      item.category,
      item.entity,
      item.method,
      item.notes,
      item.amount.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const fileBuffer = Buffer.from(csvContent);
    const filename = `profit-statement-${range}-${today}.csv`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    });

  } catch (error) {
    console.error('[Profit Report CSV API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
