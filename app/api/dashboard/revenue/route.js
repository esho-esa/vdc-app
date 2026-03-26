import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    const supabase = getDB();

    // Fetch all prescriptions with patient names
    const { data: prescriptions, error } = await supabase
      .from('prescriptions')
      .select('id, date, total_amount, surgeon_fee, patient_id, patients(name)')
      .order('date', { ascending: false });

    if (error) throw error;

    const rows = prescriptions || [];

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    let todayRevenue = 0;
    let monthlyRevenue = 0;
    let totalRevenue = 0;

    // Monthly buckets for trend chart (last 12 months)
    const monthlyBuckets = {};

    rows.forEach((rx) => {
      const amt = parseFloat(rx.total_amount) || 0;
      totalRevenue += amt;

      if (rx.date === today) {
        todayRevenue += amt;
      }

      if (rx.date && rx.date.substring(0, 7) === currentMonth) {
        monthlyRevenue += amt;
      }

      // Build monthly trend
      const monthKey = rx.date ? rx.date.substring(0, 7) : 'unknown';
      if (monthKey !== 'unknown') {
        monthlyBuckets[monthKey] = (monthlyBuckets[monthKey] || 0) + amt;
      }
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

    // Recent payments (last 20)
    const recentPayments = rows.slice(0, 20).map((rx) => ({
      date: rx.date,
      patientName: rx.patients?.name || 'Unknown',
      amount: parseFloat(rx.total_amount) || 0,
      doctorFee: parseFloat(rx.surgeon_fee) || 0,
    }));

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
