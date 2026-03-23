import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = getDB();
    const today = new Date().toISOString().split('T')[0];

    // Check role for revenue visibility
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const user = token ? verifyToken(token) : null;
    const isAdmin = user?.role === 'admin';

    let revenueData = {
      total: 0,
      treatment: 0,
      surgery: 0
    };

    if (isAdmin) {
      // Detailed Revenue
      // Note: Supabase doesn't support complex aggregates on joins easily without RPC, 
      // but we can join with patients!inner and filter.
      const { data: treatData, error: treatError } = await supabase
        .from('treatments')
        .select('treatment_fee, surgery_fee, consultation_fee, patients!inner(is_deleted)')
        .eq('patients.is_deleted', 0);

      const { data: rxData, error: rxError } = await supabase
        .from('prescriptions')
        .select('total_amount, surgeon_fee, patients!inner(is_deleted)')
        .eq('patients.is_deleted', 0);

      if (treatError) throw treatError;
      if (rxError) throw rxError;

      const treatStats = treatData.reduce((acc, row) => ({
        treatment: acc.treatment + (row.treatment_fee || 0),
        surgery: acc.surgery + (row.surgery_fee || 0),
        consultation: acc.consultation + (row.consultation_fee || 0)
      }), { treatment: 0, surgery: 0, consultation: 0 });

      const rxRevenue = rxData.reduce((acc, row) => ({
        total: acc.total + (row.total_amount || 0),
        surgeonFee: acc.surgeonFee + (row.surgeon_fee || 0)
      }), { total: 0, surgeonFee: 0 });

      revenueData.treatment = treatStats.treatment || 0;
      revenueData.surgery = (treatStats.surgery || 0) + (rxRevenue.surgeonFee || 0);
      revenueData.total = (treatStats.treatment || 0) + 
                          (treatStats.surgery || 0) + 
                          (treatStats.consultation || 0) + 
                          (rxRevenue.total || 0) +
                          (rxRevenue.surgeonFee || 0);
    }

    // Today's Patients Status Counts
    const { data: statusData, error: statusError } = await supabase
      .from('appointments')
      .select('status, patients!inner(is_deleted)')
      .eq('date', today)
      .eq('patients.is_deleted', 0);

    if (statusError) throw statusError;

    const stats = {
      pending: 0,
      checkin: 0,
      engaged: 0,
      checkout: 0,
      confirmed: 0
    };
    
    statusData.forEach(row => {
      if (stats.hasOwnProperty(row.status)) {
        stats[row.status] = (stats[row.status] || 0) + 1;
      }
    });

    // Total Patients (excluding deleted)
    const { count: totalPatients, error: countError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', 0);

    if (countError) throw countError;

    return NextResponse.json({
      revenue: isAdmin ? revenueData.total : null,
      revenueDetails: isAdmin ? revenueData : null,
      statusCounts: stats,
      totalPatients: totalPatients,
      isAdmin
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
