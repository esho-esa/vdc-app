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

    const supabase = getDB();
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('[Categories API] Query failed (check migrations):', error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(categories || []);
  } catch (error) {
    console.error('[Categories API] GET Error:', error);
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

    const permitted = await hasPermission(user.role, 'expenses', 'manage');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, color, budget } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category Name is required' }, { status: 400 });
    }

    const supabase = getDB();
    const id = `exp-cat-${uuidv4().substring(0, 8)}`;

    const { data: inserted, error } = await supabase
      .from('expense_categories')
      .insert([
        {
          id,
          name,
          color: color || '#8e8e93',
          budget: budget ? parseFloat(budget) : 0
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Log Activity
    await logStaffActivity({
      staffId: user.id || null,
      staffName: user.name,
      action: 'Inventory Changes',
      details: `Created new expense category: ${name}`
    });

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error('[Categories API] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permitted = await hasPermission(user.role, 'expenses', 'manage');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, color, budget } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Category ID and Name are required' }, { status: 400 });
    }

    const supabase = getDB();
    const { data: updated, error } = await supabase
      .from('expense_categories')
      .update({
        name,
        color: color || '#8e8e93',
        budget: budget ? parseFloat(budget) : 0
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log Activity
    await logStaffActivity({
      staffId: user.id || null,
      staffName: user.name,
      action: 'Inventory Changes',
      details: `Updated expense category: ${name} (budget limit: ₹${parseFloat(budget || 0).toLocaleString()})`
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Categories API] PUT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permitted = await hasPermission(user.role, 'expenses', 'manage');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    const supabase = getDB();
    
    // Fetch details before delete
    const { data: original } = await supabase.from('expense_categories').select('name').eq('id', id).single();

    const { error } = await supabase.from('expense_categories').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'Cannot delete category containing recorded expenses. Reassign expenses first.' }, { status: 400 });
    }

    // Log Activity
    await logStaffActivity({
      staffId: user.id || null,
      staffName: user.name,
      action: 'Inventory Changes',
      details: `Deleted expense category: ${original?.name || id}`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Categories API] DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
