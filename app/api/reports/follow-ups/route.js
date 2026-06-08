import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const supabase = getDB();

    // 1. Fetch follow-ups with patient details
    const { data: followUps, error: followUpsErr } = await supabase
      .from('follow_ups')
      .select('*, patients(name, phone, email)')
      .order('followup_date', { ascending: false });

    if (followUpsErr) throw followUpsErr;

    // 2. Fetch all treatments to calculate returning patient %
    const { data: treatments, error: treatmentsErr } = await supabase
      .from('treatments')
      .select('patient_id, date');

    if (treatmentsErr) throw treatmentsErr;

    // Calculate returning patient percentage
    const patientVisits = {};
    treatments.forEach(t => {
      if (!patientVisits[t.patient_id]) {
        patientVisits[t.patient_id] = new Set();
      }
      patientVisits[t.patient_id].add(t.date);
    });

    const totalPatientsWithTx = Object.keys(patientVisits).length;
    const returningPatientsCount = Object.values(patientVisits).filter(dates => dates.size > 1).length;
    const returningPatientPercent = totalPatientsWithTx > 0 
      ? parseFloat(((returningPatientsCount / totalPatientsWithTx) * 100).toFixed(1))
      : 0;

    // Calculate completion and missed rates
    const counts = { Scheduled: 0, Completed: 0, Missed: 0, Cancelled: 0 };
    followUps.forEach(f => {
      if (counts[f.status] !== undefined) counts[f.status]++;
    });

    const totalRelevant = counts.Completed + counts.Scheduled + counts.Missed;
    const completionRate = totalRelevant > 0 
      ? parseFloat(((counts.Completed / totalRelevant) * 100).toFixed(1))
      : 0;
    const missedRate = totalRelevant > 0 
      ? parseFloat(((counts.Missed / totalRelevant) * 100).toFixed(1))
      : 0;

    // Missed Patients list (patients who have any missed follow-ups)
    const missedPatientsList = followUps
      .filter(f => f.status === 'Missed')
      .map(f => ({
        id: f.id,
        patientId: f.patient_id,
        name: f.patients?.name || 'N/A',
        phone: f.patients?.phone || 'N/A',
        email: f.patients?.email || 'N/A',
        followupDate: f.followup_date,
        followupType: f.followup_type,
        notes: f.notes
      }));

    return NextResponse.json({
      metrics: {
        completionRate,
        missedRate,
        returningPatientPercent,
        counts
      },
      followUpsList: followUps.map(f => ({
        id: f.id,
        patientId: f.patient_id,
        name: f.patients?.name || 'N/A',
        phone: f.patients?.phone || 'N/A',
        email: f.patients?.email || 'N/A',
        followupDate: f.followup_date,
        followupType: f.followup_type,
        status: f.status,
        notes: f.notes
      })),
      missedPatientsList
    });
  } catch (error) {
    console.error('[FollowUpReports:GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
