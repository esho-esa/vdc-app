import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { followupDate, followupType, notes, status } = body;

    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = user.name || 'Staff';
    const supabase = getDB();

    // Fetch existing follow-up to check for changes and get patient info
    const { data: existing, error: fetchErr } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    const updatePayload = {};
    if (followupDate) updatePayload.followup_date = followupDate;
    if (followupType) updatePayload.followup_type = followupType;
    if (notes !== undefined) updatePayload.notes = notes;
    if (status) updatePayload.status = status;

    const { data: updated, error: updateErr } = await supabase
      .from('follow_ups')
      .update(updatePayload)
      .eq('id', id)
      .select('*, patients(name, phone)')
      .single();

    if (updateErr) throw updateErr;

    // Trigger notification and activity logs on status transition
    if (status && status !== existing.status) {
      let activityText = `Follow-up status updated: ${status}`;
      let activityColor = 'blue';

      if (status === 'Completed') {
        activityText = `Follow-up completed: ${updated.followup_type}`;
        activityColor = 'green';
      } else if (status === 'Missed') {
        activityText = `Follow-up MISSED: ${updated.followup_type}`;
        activityColor = 'red';
        
        // Add a notification for missed follow-up
        await supabase.from('notifications').insert([
          {
            id: `not-${uuidv4().substring(0, 8)}`,
            type: 'missed',
            title: 'Patient Missed Follow-Up',
            message: `${updated.patients?.name || 'Patient'} missed their follow-up scheduled on ${updated.followup_date}.`,
            patient_id: updated.patient_id,
            read: 0
          }
        ]);
      } else if (status === 'Cancelled') {
        activityText = `Follow-up cancelled: ${updated.followup_type}`;
        activityColor = 'orange';
      }

      await supabase.from('activity_log').insert([
        {
          id: `act-${uuidv4().substring(0, 8)}`,
          text: activityText,
          subtext: `Updated by ${username}`,
          color: activityColor,
          patient_id: updated.patient_id
        }
      ]);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[FollowUps:PUT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = user.name || 'Staff';
    const supabase = getDB();

    // Fetch existing follow-up to log activity correctly
    const { data: existing, error: fetchErr } = await supabase
      .from('follow_ups')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    const { error: deleteErr } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id);

    if (deleteErr) throw deleteErr;

    // Log activity
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Follow-up deleted: ${existing.followup_type}`,
        subtext: `Removed by ${username}`,
        color: 'red',
        patient_id: existing.patient_id
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FollowUps:DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
