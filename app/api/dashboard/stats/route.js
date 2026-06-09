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
        .eq('is_deleted', 0),

      // 2. Today's appointments with status counts
      supabase
        .from('appointments')
        .select('status')
        .eq('date', today),

      // 3. Recent activity (limited to 8)
      supabase
        .from('activity_log')
        .select('id, text, subtext, color, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
    ]

    // Only fetch revenue data for admin users
    if (isAdmin) {
      // 4. Revenue: today (prescriptions)
      queries.push(
        supabase
          .from('prescriptions')
          .select('total_amount, surgeon_fee')
          .eq('date', today)
      )
      // 5. Revenue: total (prescriptions)
      queries.push(
        supabase
          .from('prescriptions')
          .select('total_amount, surgeon_fee')
      )
      // 6. Revenue: today (treatments)
      queries.push(
        supabase
          .from('treatments')
          .select('cost, treatment_fee, surgery_fee, consultation_fee')
          .eq('date', today)
      )
      // 7. Revenue: total (treatments)
      queries.push(
        supabase
          .from('treatments')
          .select('cost, treatment_fee, surgery_fee, consultation_fee')
      )
      // 8. Payments: today (collected)
      queries.push(
        supabase
          .from('payments')
          .select('amount')
          .eq('payment_date', today)
      )
      // 9. Payments: total (collected)
      queries.push(
        supabase
          .from('payments')
          .select('amount')
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
    let revenueDetails = { total: 0, treatment: 0, surgery: 0, collected: 0, outstanding: 0 }
    let todayRevenue = 0 // represents today's collected payments
    let todayBilledRevenue = 0 // today's billed treatments

    if (isAdmin && results[3] && results[4] && results[5] && results[6]) {
      const todayRx = results[3].data || []
      const allRx = results[4].data || []
      const todayTx = results[5].data || []
      const allTx = results[6].data || []
      const todayPayments = results[7]?.data || []
      const allPayments = results[8]?.data || []

      const todayRxRev = todayRx.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0)
      const todayTxRev = todayTx.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0)
      todayBilledRevenue = todayRxRev + todayTxRev
      
      // Today's collected revenue from actual payments
      todayRevenue = todayPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

      let totalRev = 0, treatmentRev = 0, surgeryRev = 0
      
      for (const r of allRx) {
        const amt = parseFloat(r.total_amount) || 0
        const fee = parseFloat(r.surgeon_fee) || 0
        totalRev += amt
        surgeryRev += fee
        treatmentRev += (amt - fee)
      }

      for (const t of allTx) {
        const cost = parseFloat(t.cost) || 0
        const sFee = parseFloat(t.surgery_fee) || 0
        const tFee = parseFloat(t.treatment_fee) || 0
        const cFee = parseFloat(t.consultation_fee) || 0

        totalRev += cost
        surgeryRev += sFee
        treatmentRev += (tFee + cFee)
      }

      const totalCollected = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
      const outstandingRevenue = Math.max(0, totalRev - totalCollected)

      revenueDetails = {
        total: totalRev,
        treatment: treatmentRev,
        surgery: surgeryRev,
        collected: totalCollected,
        outstanding: outstandingRevenue,
        todayBilled: todayBilledRevenue,
        todayCollected: todayRevenue
      }
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