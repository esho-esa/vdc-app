import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { hashPassword, verifyToken } from '@/lib/auth';
import { logStaffActivity } from '@/lib/activity';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Only administrators can modify staff accounts.' }, { status: 403 });
    }

    const supabase = getDB();
    const body = await request.json();
    
    const updateData = {
      name: body.name,
      username: body.username,
      email: body.email,
      phone: body.phone,
      role: body.role,
      joining_date: body.joining_date,
      status: body.status,
      profile_photo: body.profile_photo
    };

    if (body.password) {
      updateData.password_hash = hashPassword(body.password);
    }
    
    // 1. Try updating staff_members
    try {
      const { data: updated, error } = await supabase
        .from('staff_members')
        .update(updateData)
        .eq('id', id)
        .select('id, name, username, email, phone, role, joining_date, status, profile_photo, created_at')
        .single();

      if (!error && updated) {
        // Log activity
        await logStaffActivity({
          staffId: currentUser.id || null,
          staffName: currentUser.name,
          action: 'Staff Updated',
          details: `Updated staff account: ${body.name} (${body.role})`
        });

        return NextResponse.json(updated);
      }
    } catch (e) {
      console.warn('[Staff API:PUT] staff_members update failed, trying fallback...', e.message);
    }

    // 2. Legacy fallback
    const legacyUpdate = {
      name: body.name,
      username: body.username,
      email: body.email,
      role: body.role
    };

    if (body.password) {
      legacyUpdate.password_hash = hashPassword(body.password);
    }

    const { data: updatedLegacy, error: legacyError } = await supabase
      .from('staff')
      .update(legacyUpdate)
      .eq('id', id)
      .select('id, name, username, email, role, created_at')
      .single();

    if (legacyError) throw legacyError;

    // Log legacy activity
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Staff member updated: ${body.name}`,
        subtext: `Modified by ${currentUser.name}`,
        color: 'blue'
      }
    ]);

    return NextResponse.json({
      ...updatedLegacy,
      phone: body.phone || '',
      joining_date: body.joining_date || updatedLegacy.created_at.split('T')[0],
      status: body.status || 'Active',
      profile_photo: body.profile_photo || ''
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const currentUser = token ? verifyToken(token) : null;

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Only administrators can delete staff accounts.' }, { status: 403 });
    }

    const supabase = getDB();
    
    // Fetch details before delete for logging
    let staffName = 'Staff member';
    
    // Try staff_members first
    const { data: staffMember } = await supabase.from('staff_members').select('name').eq('id', id).single();
    if (staffMember) {
      staffName = staffMember.name;
    } else {
      const { data: legacyStaff } = await supabase.from('staff').select('name').eq('id', id).single();
      if (legacyStaff) staffName = legacyStaff.name;
    }

    // Try delete staff_members
    const { error: smError } = await supabase.from('staff_members').delete().eq('id', id);
    
    // Try delete legacy staff too
    const { error: sError } = await supabase.from('staff').delete().eq('id', id);

    if (smError && sError) throw smError;

    // Log activity
    await logStaffActivity({
      staffId: currentUser.id || null,
      staffName: currentUser.name,
      action: 'Staff Deleted',
      details: `Deleted staff account: ${staffName}`
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

