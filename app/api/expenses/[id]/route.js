import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { logStaffActivity } from '@/lib/activity';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
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

    const supabase = getDB();
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('*, expense_categories(name, color), expense_attachments(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(expense);
  } catch (error) {
    console.error('[Expenses Detail API] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const permitted = await hasPermission(user.role, 'expenses', 'edit');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getDB();
    const body = await request.json();
    const { categoryId, amount, expenseDate, vendorName, paymentMethod, notes, attachmentUrl } = body;

    // Fetch original details for delta logging
    const { data: original } = await supabase.from('expenses').select('amount').eq('id', id).single();

    const { data: updated, error } = await supabase
      .from('expenses')
      .update({
        category_id: categoryId,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        vendor_name: vendorName || '',
        payment_method: paymentMethod || 'Other',
        notes: notes || '',
        attachment_url: attachmentUrl || ''
      })
      .eq('id', id)
      .select('*, expense_categories(name, color)')
      .single();

    if (error) throw error;

    // If attachment changed/added, keep expense_attachments table synchronized
    if (attachmentUrl && attachmentUrl !== original?.attachment_url) {
      // Clean up old attachments
      await supabase.from('expense_attachments').delete().eq('expense_id', id);
      // Insert new one
      const attId = `att-${uuidv4().substring(0, 8)}`;
      await supabase.from('expense_attachments').insert([
        {
          id: attId,
          expense_id: id,
          file_url: attachmentUrl
        }
      ]);
    }

    const catName = updated.expense_categories?.name || 'Category';

    // Log Activity
    const oldAmt = original ? original.amount : 0;
    await logStaffActivity({
      staffId: user.id || null,
      staffName: user.name,
      action: 'Inventory Changes',
      details: `Updated expense for ${catName}: amount changed from ₹${parseFloat(oldAmt).toLocaleString()} to ₹${parseFloat(amount).toLocaleString()}`
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Expenses Detail API] PUT Error:', error);
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

    const permitted = await hasPermission(user.role, 'expenses', 'delete');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getDB();
    
    // Fetch details before delete for logging
    const { data: original } = await supabase
      .from('expenses')
      .select('amount, expense_categories(name)')
      .eq('id', id)
      .single();

    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;

    const catName = original?.expense_categories?.name || 'Category';
    const amount = original ? original.amount : 0;

    // Log Activity
    await logStaffActivity({
      staffId: user.id || null,
      staffName: user.name,
      action: 'Inventory Changes',
      details: `Deleted expense of ₹${parseFloat(amount).toLocaleString()} for ${catName}`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Expenses Detail API] DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
