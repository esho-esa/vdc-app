import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const db = getDB();
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
      const treatStats = db.prepare(`
        SELECT 
          SUM(t.treatment_fee) as treatment,
          SUM(t.surgery_fee) as surgery,
          SUM(t.consultation_fee) as consultation
        FROM treatments t
        JOIN patients p ON t.patient_id = p.id
        WHERE p.is_deleted = 0
      `).get();

      const rxRevenue = db.prepare(`
        SELECT SUM(r.total_amount) as total, SUM(r.surgeon_fee) as surgeonFee
        FROM prescriptions r
        JOIN patients p ON r.patient_id = p.id
        WHERE p.is_deleted = 0
      `).get();

      revenueData.treatment = treatStats.treatment || 0;
      revenueData.surgery = (treatStats.surgery || 0) + (rxRevenue.surgeonFee || 0);
      revenueData.total = (treatStats.treatment || 0) + 
                          (treatStats.surgery || 0) + 
                          (treatStats.consultation || 0) + 
                          (rxRevenue.total || 0) +
                          (rxRevenue.surgeonFee || 0);
    }

    // Today's Patients Status Counts
    const statusCounts = db.prepare(`
      SELECT a.status, COUNT(*) as count 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.date = ? AND p.is_deleted = 0
      GROUP BY a.status
    `).all(today);

    const stats = {
      pending: 0,
      checkin: 0,
      engaged: 0,
      checkout: 0,
      confirmed: 0
    };
    statusCounts.forEach(row => {
      if (stats.hasOwnProperty(row.status)) {
        stats[row.status] = row.count;
      }
    });

    // Total Patients (excluding deleted)
    const totalPatientsRow = db.prepare('SELECT COUNT(*) as total FROM patients WHERE is_deleted = 0').get();

    return NextResponse.json({
      revenue: isAdmin ? revenueData.total : null,
      revenueDetails: isAdmin ? revenueData : null,
      statusCounts: stats,
      totalPatients: totalPatientsRow.total,
      isAdmin
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
