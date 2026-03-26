import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function GET() {
  try {
    const supabase = getDB()

    const { data: patients } = await supabase
      .from('patients')
      .select('*')

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')

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
    console.error(error)

    return NextResponse.json({
      totalPatients: 0,
      revenue: 0,
      revenueDetails: {
        total: 0,
        treatment: 0,
        surgery: 0
      },
      statusCounts: {},
      isAdmin: false
    })
  }
}