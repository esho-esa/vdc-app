import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET() {
  try {
    const supabase = getDB()

    const { data: patients } = await supabase
      .from('patients')
      .select('id')
      .eq('is_deleted', false)

    const { data: appointments } = await supabase
      .from('appointments')
      .select('status')
      .eq('is_deleted', false)

    const totalPatients = patients?.length || 0

    const statusCounts = {
      confirmed: appointments?.filter(a => a.status === 'confirmed').length || 0,
      checkin: appointments?.filter(a => a.status === 'checkin').length || 0,
      engaged: appointments?.filter(a => a.status === 'engaged').length || 0,
      checkout: appointments?.filter(a => a.status === 'checkout').length || 0
    }

    return NextResponse.json({
      totalPatients,
      revenue: 0,
      revenueDetails: {
        total: 0,
        treatment: 0,
        surgery: 0
      },
      statusCounts,
      isAdmin: false
    })

  } catch (error) {
    console.error('Dashboard Stats Error:', error)

    return NextResponse.json({
      totalPatients: 0,
      revenue: 0,
      revenueDetails: {
        total: 0,
        treatment: 0,
        surgery: 0
      },
      statusCounts: {
        confirmed: 0,
        checkin: 0,
        engaged: 0,
        checkout: 0
      },
      isAdmin: false
    }, { status: 200 }) // Return 200 with fallback data to prevent frontend crash
  }
}