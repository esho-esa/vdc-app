import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    const supabase = getDB();

    // Fetch all prescriptions and treatments in parallel
    const [
      { data: prescriptions, error: rxError },
      { data: treatments, error: txError }
    ] = await Promise.all([
      supabase
        .from('prescriptions')
        .select('id, date, total_amount, surgeon_fee, patient_id, patients(name)')
        .order('date', { ascending: false }),
      supabase
        .from('treatments')
        .select('id, date, cost, surgery_fee, patient_id, patients(name)')
        .order('date', { ascending: false })
    ]);

    if (rxError) throw rxError;
    if (txError) throw txError;

    const rxRows = prescriptions || [];
    const txRows = treatments || [];

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    let todayRevenue = 0;
    let monthlyRevenue = 0;
    let totalRevenue = 0;

    // Monthly buckets for trend chart (last 12 months)
    const monthlyBuckets = {};

    const processRecord = (date, amt) => {
      totalRevenue += amt;

      if (date === today) {
        todayRevenue += amt;
      }

      if (date && date.substring(0, 7) === currentMonth) {
        monthlyRevenue += amt;
      }

      // Build monthly trend
      const monthKey = date ? date.substring(0, 7) : 'unknown';
      if (monthKey !== 'unknown') {
        monthlyBuckets[monthKey] = (monthlyBuckets[monthKey] || 0) + amt;
      }
    };

    rxRows.forEach((rx) => {
      processRecord(rx.date, parseFloat(rx.total_amount) || 0);
    });

    txRows.forEach((tx) => {
      processRecord(tx.date, parseFloat(tx.cost) || 0);
    });

    // Build sorted monthly trend (last 12 months)
    const monthLabels = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().substring(0, 7);
      monthLabels.push(key);
    }

    const monthlyTrend = monthLabels.map((key) => ({
      month: key,
      label: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: monthlyBuckets[key] || 0,
    }));

    // Build payment lists and sort
    const rxPayments = rxRows.map((rx) => ({
      date: rx.date,
      patientName: rx.patients?.name || 'Unknown',
      amount: parseFloat(rx.total_amount) || 0,
      doctorFee: parseFloat(rx.surgeon_fee) || 0,
    }));

    const txPayments = txRows.map((tx) => ({
      date: tx.date,
      patientName: tx.patients?.name || 'Unknown',
      amount: parseFloat(tx.cost) || 0,
      doctorFee: parseFloat(tx.surgery_fee) || 0,
    }));

    const combinedPayments = [...rxPayments, ...txPayments].sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      return db.localeCompare(da);
    });

    const recentPayments = combinedPayments.slice(0, 20);

    return NextResponse.json({
      todayRevenue,
      monthlyRevenue,
      totalRevenue,
      monthlyTrend,
      recentPayments,
    });
  } catch (error) {
    console.error('Revenue API error:', error);
    return NextResponse.json(
      {
        todayRevenue: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        monthlyTrend: [],
        recentPayments: [],
      },
      { status: 200 }
    );
  }
}
