import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { logStaffActivity } from '@/lib/activity';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryId = searchParams.get('categoryId');
    const vendor = searchParams.get('vendor');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const search = searchParams.get('search');

    const supabase = getDB();
    let query = supabase
      .from('expenses')
      .select('*, expense_categories(name, color)')
      .order('expense_date', { ascending: false });

    if (startDate) query = query.gte('expense_date', startDate);
    if (endDate) query = query.lte('expense_date', endDate);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (vendor) query = query.ilike('vendor_name', `%${vendor}%`);
    if (minAmount) query = query.gte('amount', parseFloat(minAmount));
    if (maxAmount) query = query.lte('amount', parseFloat(maxAmount));
    
    if (search) {
      query = query.or(`vendor_name.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    const { data: expenses, error } = await query;
    if (error) {
      // Check if table exists, fallback to empty array if migrations not run
      console.warn('[Expenses API] Query failed (check migrations):', error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(expenses || []);
  } catch (error) {
    console.error('[Expenses API] GET Error:', error);
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

    const permitted = await hasPermission(user.role, 'expenses', 'create');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { categoryId, amount, expenseDate, vendorName, paymentMethod, notes, attachmentUrl } = body;

    if (!categoryId || !amount || !expenseDate) {
      return NextResponse.json({ error: 'Category, Amount, and Expense Date are required' }, { status: 400 });
    }

    const supabase = getDB();
    const id = `exp-${uuidv4().substring(0, 8)}`;

    const { data: inserted, error } = await supabase
      .from('expenses')
      .insert([
        {
          id,
          category_id: categoryId,
          amount: parseFloat(amount),
          expense_date: expenseDate,
          vendor_name: vendorName || '',
          payment_method: paymentMethod || 'Other',
          notes: notes || '',
          attachment_url: attachmentUrl || '',
          created_by: user.id || null
        }
      ])
      .select('*, expense_categories(name, color)')
      .single();

    if (error) throw error;

    // 1. If attachment is present, create record in expense_attachments
    if (attachmentUrl) {
      const attId = `att-${uuidv4().substring(0, 8)}`;
      await supabase.from('expense_attachments').insert([
        {
          id: attId,
          expense_id: id,
          file_url: attachmentUrl
        }
      ]);
    }

    // 2. Fetch category details for logging description
    const catName = inserted.expense_categories?.name || 'Category';

    // 3. Log Activity
    await logStaffActivity({
      staffId: user.id || null,
      staffName: user.name,
      action: 'Inventory Changes', // Map to inventory/financial activity changes
      details: `Recorded expense of ₹${parseFloat(amount).toLocaleString()} for ${catName} (${vendorName || 'No Vendor'})`
    });

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error('[Expenses API] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
