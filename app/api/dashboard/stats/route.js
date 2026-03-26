import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET(request) {
  try {
    const supabase = getDB()

    // Check if requesting user is admin (from query param or header)
    const { searchParams } = new URL(request.url)
    const userRole = searchParams.get('role')
    const isAdmin = userRole === 'admin'

    const today = new Date().toISOString().split('T')[0]

    // All queries run in parallel for maximum speed
    const queries = [
      // 1. Patient count (head: true = no row data)
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false),

      // 2. Today's appointments with status counts
      supabase
        .from('appointments')
        .select('status')
        .eq('date', today)
        .eq('is_deleted', false),

      // 3. Recent activity (limited to 8)
      supabase
        .from('activity_log')
        .select('id, text, subtext, color, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]

    // Only fetch revenue data for admin users
    if (isAdmin) {
      // 4. Revenue: today
      queries.push(
        supabase
          .from('prescriptions')
          .select('total_amount, surgeon_fee')
          .eq('date', today)
      )
      // 5. Revenue: total
      queries.push(
        supabase
          .from('prescriptions')
          .select('total_amount, surgeon_fee')
      )
    }

    const results = await Promise.all(queries)

    const [patientsResult, appointmentsResult, activityResult] = results

    // Patient count
    const totalPatients = patientsResult.count || 0

    // Status counts from today's appointments
    const todayAppts = appointmentsResult.data || []
    const statusCounts = {
      confirmed: 0, checkin: 0, engaged: 0, checkout: 0
    }
    for (const a of todayAppts) {
      if (statusCounts[a.status] !== undefined) statusCounts[a.status]++
    }

    // Activity feed
    const activityFeed = (activityResult.data || []).map(log => {
      const date = new Date(log.created_at)
      return {
        id: log.id,
        text: log.text || '',
        subtext: log.subtext || '',
        color: log.color || 'blue',
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    })

    // Revenue (admin only)
    let revenueDetails = { total: 0, treatment: 0, surgery: 0 }
    let todayRevenue = 0

    if (isAdmin && results[3] && results[4]) {
      const todayRx = results[3].data || []
      const allRx = results[4].data || []

      todayRevenue = todayRx.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0)

      let totalRev = 0, treatmentRev = 0, surgeryRev = 0
      for (const r of allRx) {
        const amt = parseFloat(r.total_amount) || 0
        const fee = parseFloat(r.surgeon_fee) || 0
        totalRev += amt
        surgeryRev += fee
        treatmentRev += (amt - fee)
      }
      revenueDetails = { total: totalRev, treatment: treatmentRev, surgery: surgeryRev }
    }

    return NextResponse.json({
      totalPatients,
      revenue: todayRevenue,
      revenueDetails,
      statusCounts,
      activityFeed,
      isAdmin
    })

  } catch (error) {
    console.error('Dashboard Stats Error:', error)
    return NextResponse.json({
      totalPatients: 0,
      revenue: 0,
      revenueDetails: { total: 0, treatment: 0, surgery: 0 },
      statusCounts: { confirmed: 0, checkin: 0, engaged: 0, checkout: 0 },
      activityFeed: [],
      isAdmin: false
    }, { status: 200 })
  }
}