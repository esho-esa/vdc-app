import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    const supabase = getDB();

    // Fetch prescriptions, treatments, and payments in parallel
    const [
      { data: prescriptions, error: rxError },
      { data: treatments, error: txError },
      { data: payments }
    ] = await Promise.all([
      supabase
        .from('prescriptions')
        .select('id, date, total_amount, surgeon_fee, patient_id, patients(name)')
        .order('date', { ascending: false }),
      supabase
        .from('treatments')
        .select('id, date, cost, surgery_fee, patient_id, dentist, description, patients(name)')
        .order('date', { ascending: false }),
      supabase
        .from('payments')
        .select('id, payment_date, amount, payment_method, reference_number, patient_id, patients(name)')
        .order('payment_date', { ascending: false })
    ]);

    if (rxError) throw rxError;
    if (txError) throw txError;
    // We do NOT suppress the payment error. If payments fails, the entire dashboard correctly halts and logs the true cause.
    if (payments.error) throw payments.error;

    const rxRows = prescriptions || [];
    const txRows = treatments || [];
    const payRows = payments || [];

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM
    const currentYear = today.substring(0, 4);   // YYYY

    // 1. Calculate Billed Revenue (treatments + prescriptions)
    let todayBilled = 0;
    let monthlyBilled = 0;
    let yearlyBilled = 0;
    let totalBilled = 0;

    const processBilledRecord = (date, amt) => {
      totalBilled += amt;
      if (date === today) todayBilled += amt;
      if (date && date.substring(0, 7) === currentMonth) monthlyBilled += amt;
      if (date && date.substring(0, 4) === currentYear) yearlyBilled += amt;
    };

    const dentistPerformance = {};
    const treatmentTrends = {};

    rxRows.forEach((rx) => {
      processBilledRecord(rx.date, parseFloat(rx.total_amount) || 0);
    });
    txRows.forEach((tx) => {
      const amt = parseFloat(tx.cost) || 0;
      processBilledRecord(tx.date, amt);

      const dentistName = tx.dentist || 'Unknown Dentist';
      dentistPerformance[dentistName] = (dentistPerformance[dentistName] || 0) + amt;

      // Extract base procedure name for trends (e.g., if description is JSON string)
      let procName = 'Other';
      if (tx.description) {
        try {
          const parsed = JSON.parse(tx.description);
          procName = parsed.name || parsed.description || 'Other';
        } catch(e) {
          procName = tx.description;
        }
      }
      treatmentTrends[procName] = (treatmentTrends[procName] || 0) + 1;
    });

    const dentistStats = Object.keys(dentistPerformance).map(k => ({ dentist: k, revenue: dentistPerformance[k] })).sort((a,b) => b.revenue - a.revenue);
    const procedureStats = Object.keys(treatmentTrends).map(k => ({ procedure: k, count: treatmentTrends[k] })).sort((a,b) => b.count - a.count).slice(0, 5);

    // 2. Calculate Collected Revenue (payments)
    let todayCollected = 0;
    let monthlyCollected = 0;
    let yearlyCollected = 0;
    let totalCollected = 0;

    const monthlyBuckets = {}; // for monthly trend chart

    payRows.forEach((p) => {
      const amt = parseFloat(p.amount) || 0;
      const date = p.payment_date;

      totalCollected += amt;
      if (date === today) todayCollected += amt;
      if (date && date.substring(0, 7) === currentMonth) monthlyCollected += amt;
      if (date && date.substring(0, 4) === currentYear) yearlyCollected += amt;

      const monthKey = date ? date.substring(0, 7) : 'unknown';
      if (monthKey !== 'unknown') {
        monthlyBuckets[monthKey] = (monthlyBuckets[monthKey] || 0) + amt;
      }
    });

    // 3. Calculate Outstanding Revenue (Billed - Collected)
    // IMPORTANT: Outstanding today doesn't mean "today's billed - today's collected" 
    // It means "Outstanding balance generated today" 
    // Wait, let's keep it strictly as Billed - Collected for the period, ensuring it never drops below 0.
    const todayOutstanding = Math.max(0, todayBilled - todayCollected);
    const monthlyOutstanding = Math.max(0, monthlyBilled - monthlyCollected);
    const yearlyOutstanding = Math.max(0, yearlyBilled - yearlyCollected);
    const totalOutstanding = Math.max(0, totalBilled - totalCollected);

    // 4. Monthly trend chart - Collected Cash (last 12 months)
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

    // 5. Recent Payments List (actual payments if any, otherwise fallback to prescriptions)
    let recentPayments = [];
    if (payRows.length > 0) {
      recentPayments = payRows.slice(0, 20).map((p) => ({
        date: p.payment_date,
        patientName: p.patients?.name || 'Unknown',
        amount: parseFloat(p.amount) || 0,
        paymentMethod: p.payment_method,
        referenceNumber: p.reference_number || 'N/A'
      }));
    } else {
      // Fallback for legacy database visual
      recentPayments = rxRows.slice(0, 20).map((rx) => ({
        date: rx.date,
        patientName: rx.patients?.name || 'Unknown',
        amount: parseFloat(rx.total_amount) || 0,
        paymentMethod: 'Bill generated',
        referenceNumber: 'Legacy'
      }));
    }

    return NextResponse.json({
      // Legacy compatibility keys
      todayRevenue: todayCollected,
      monthlyRevenue: monthlyCollected,
      totalRevenue: totalCollected,
      
      // New splits
      todayBilled,
      todayCollected,
      todayOutstanding,
      monthlyBilled,
      monthlyCollected,
      monthlyOutstanding,
      yearlyBilled,
      yearlyCollected,
      yearlyOutstanding,
      totalBilled,
      totalCollected,
      totalOutstanding,
      
      monthlyTrend,
      recentPayments,
      dentistStats,
      procedureStats,
    });
  } catch (error) {
    console.error('Revenue API error:', error);
    return NextResponse.json(
      {
        todayRevenue: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        todayBilled: 0,
        todayCollected: 0,
        todayOutstanding: 0,
        monthlyBilled: 0,
        monthlyCollected: 0,
        monthlyOutstanding: 0,
        yearlyBilled: 0,
        yearlyCollected: 0,
        yearlyOutstanding: 0,
        totalBilled: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        monthlyTrend: [],
        recentPayments: [],
        dentistStats: [],
        procedureStats: [],
      },
      { status: 200 }
    );
  }
}
