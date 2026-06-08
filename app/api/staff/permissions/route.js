import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { logStaffActivity } from '@/lib/activity';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();
    const { data: permissions, error } = await supabase
      .from('permissions')
      .select('*')
      .order('role_id', { ascending: true });

    if (error) {
      console.warn('[Permissions API] Error querying permissions table:', error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(permissions || []);
  } catch (error) {
    console.error('[Permissions API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roleId, module, canView, canCreate, canEdit, canDelete, canRefund, canManage, canExport } = body;

    if (!roleId || !module) {
      return NextResponse.json({ error: 'Role ID and Module are required' }, { status: 400 });
    }

    const supabase = getDB();
    const id = `perm-${roleId}-${module}`;

    const { data: upserted, error } = await supabase
      .from('permissions')
      .upsert([
        {
          id,
          role_id: roleId,
          module,
          can_view: !!canView,
          can_create: !!canCreate,
          can_edit: !!canEdit,
          can_delete: !!canDelete,
          can_refund: !!canRefund,
          can_manage: !!canManage,
          can_export: !!canExport
        }
      ], { onConflict: 'role_id,module' })
      .select()
      .single();

    if (error) throw error;

    // Log the permission change action
    await logStaffActivity({
      staffId: currentUser.id || null,
      staffName: currentUser.name,
      action: 'Staff Updates',
      details: `Updated permissions for role: ${roleId}, module: ${module}`
    });

    return NextResponse.json(upserted);
  } catch (error) {
    console.error('[Permissions API] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
