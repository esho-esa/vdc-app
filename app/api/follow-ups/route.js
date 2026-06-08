import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();
    let query = supabase
      .from('follow_ups')
      .select('*, patients(name, phone)');

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('followup_date', startDate);
    }
    if (endDate) {
      query = query.lte('followup_date', endDate);
    }

    // Sort: Scheduled or missed first, then chronologically
    const { data: followUps, error } = await query.order('followup_date', { ascending: true });
    if (error) throw error;

    return NextResponse.json(followUps || []);
  } catch (error) {
    console.error('[FollowUps:GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, treatmentId, followupDate, followupType, notes, status } = body;

    if (!patientId || !followupDate || !followupType) {
      return NextResponse.json({ error: 'patientId, followupDate, and followupType are required' }, { status: 400 });
    }

    const supabase = getDB();
    const followUpId = `fol-${uuidv4().substring(0, 8)}`;

    const { data: inserted, error: insertError } = await supabase
      .from('follow_ups')
      .insert([
        {
          id: followUpId,
          patient_id: patientId,
          treatment_id: treatmentId || null,
          followup_date: followupDate,
          followup_type: followupType,
          notes: notes || '',
          status: status || 'Scheduled'
        }
      ])
      .select('*, patients(name, phone)')
      .single();

    if (insertError) throw insertError;

    // Log Activity
    const username = user.name || 'Staff';
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Follow-up scheduled: ${followupType}`,
        subtext: `For patient on ${followupDate} (Created by ${username})`,
        color: 'blue',
        patient_id: patientId
      }
    ]);

    // Insert System Notification if it is scheduled for today
    const todayStr = new Date().toISOString().split('T')[0];
    if (followupDate === todayStr) {
      await supabase.from('notifications').insert([
        {
          id: `not-${uuidv4().substring(0, 8)}`,
          type: 'upcoming',
          title: 'Follow-Up Scheduled Today',
          message: `Follow-up (${followupType}) scheduled today for patient.`,
          patient_id: patientId,
          read: 0
        }
      ]);
    }

    return NextResponse.json(inserted);
  } catch (error) {
    console.error('[FollowUps:POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
