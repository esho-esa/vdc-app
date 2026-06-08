import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = getDB();

    // 1. Fetch active patients
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name, phone, email')
      .eq('is_deleted', 0);

    if (patientsError) throw patientsError;

    // 2. Fetch all treatments to aggregate billed amount
    const { data: treatments, error: txError } = await supabase
      .from('treatments')
      .select('patient_id, cost');

    if (txError) throw txError;

    // 3. Fetch all payments to aggregate paid amount
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('patient_id, amount')
      .then(res => res.error ? { data: [] } : res);

    // Aggregates map
    const patientBilling = {};
    (treatments || []).forEach(tx => {
      if (!patientBilling[tx.patient_id]) {
        patientBilling[tx.patient_id] = { billed: 0, paid: 0 };
      }
      patientBilling[tx.patient_id].billed += parseFloat(tx.cost) || 0;
    });

    (payments || []).forEach(p => {
      if (!patientBilling[p.patient_id]) {
        patientBilling[p.patient_id] = { billed: 0, paid: 0 };
      }
      patientBilling[p.patient_id].paid += parseFloat(p.amount) || 0;
    });

    // Match with patients and filter outstanding
    const outstandingPatients = patients
      .map(p => {
        const billing = patientBilling[p.id] || { billed: 0, paid: 0 };
        const pending = Math.max(0, billing.billed - billing.paid);
        return {
          ...p,
          totalBilled: billing.billed,
          totalPaid: billing.paid,
          pending
        };
      })
      .filter(p => p.pending > 0.01) // ignore negligible dust values
      .sort((a, b) => b.pending - a.pending); // sort highest outstanding first

    return NextResponse.json(outstandingPatients);
  } catch (error) {
    console.error('[OutstandingJSON] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
