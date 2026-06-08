import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyToken } from '@/lib/auth';
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
    
    // 1. Try staff_members table first
    try {
      const { data: staff, error } = await supabase
        .from('staff_members')
        .select('id, name, username, email, phone, role, joining_date, status, profile_photo, last_seen_at, created_at')
        .order('created_at', { ascending: true });

      if (!error && staff) {
        return NextResponse.json(staff);
      }
    } catch (e) {
      console.warn('[Staff API:GET] staff_members query failed, trying fallback...', e.message);
    }

    // 2. Legacy fallback
    const { data: legacyStaff, error: legacyError } = await supabase
      .from('staff')
      .select('id, name, username, email, role, created_at')
      .order('created_at', { ascending: true });

    if (legacyError) throw legacyError;
    
    // Normalize response to include status and default columns
    const normalized = (legacyStaff || []).map(s => ({
      ...s,
      status: 'Active',
      joining_date: s.created_at ? s.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      phone: '',
      profile_photo: ''
    }));

    return NextResponse.json(normalized);
  } catch (error) {
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
      return NextResponse.json({ error: 'Only administrators can create staff accounts.' }, { status: 403 });
    }

    const supabase = getDB();
    const body = await request.json();
    const id = `stf-${uuidv4().substring(0, 8)}`;
    const pwHash = hashPassword(body.password || 'changeMe123');

    // 1. Try inserting into staff_members
    try {
      const { data: newStaff, error } = await supabase
        .from('staff_members')
        .insert([
          {
            id,
            name: body.name,
            username: body.username,
            email: body.email,
            phone: body.phone || '',
            role: body.role || 'assistant',
            joining_date: body.joining_date || new Date().toISOString().split('T')[0],
            status: body.status || 'Active',
            profile_photo: body.profile_photo || '',
            password_hash: pwHash
          }
        ])
        .select('id, name, username, email, phone, role, joining_date, status, profile_photo, created_at')
        .single();

      if (!error && newStaff) {
        // Log activity
        await logStaffActivity({
          staffId: currentUser.id || null,
          staffName: currentUser.name,
          action: 'Staff Created',
          details: `Created staff account: ${body.name} (${body.role})`
        });

        return NextResponse.json(newStaff, { status: 201 });
      } else {
        console.warn('[Staff API:POST] staff_members insert failed, attempting legacy:', error.message);
      }
    } catch (e) {
      console.warn('[Staff API:POST] staff_members query threw error, attempting legacy:', e.message);
    }

    // 2. Legacy fallback insert
    const legacyId = uuidv4();
    const { data: newLegacyStaff, error: legacyError } = await supabase
      .from('staff')
      .insert([
        {
          id: legacyId,
          name: body.name,
          username: body.username,
          email: body.email,
          role: body.role,
          password_hash: pwHash
        }
      ])
      .select('id, name, username, email, role, created_at')
      .single();

    if (legacyError) throw legacyError;

    // Log legacy activity
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `New staff member added: ${body.name}`,
        subtext: `Created by ${currentUser.name}`,
        color: 'blue'
      }
    ]);

    return NextResponse.json({
      ...newLegacyStaff,
      status: 'Active',
      joining_date: newLegacyStaff.created_at ? newLegacyStaff.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      phone: '',
      profile_photo: ''
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

