import { getDB } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = getDB()

    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error(error)
      return NextResponse.json([])
    }

    const formatted = (data || []).map((log) => {
      const date = new Date(log.created_at)

      return {
        id: log.id,
        text: log.text || '',
        subtext: log.subtext || '',
        color: log.color || 'blue',
        time: date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    })

    return NextResponse.json(formatted)

  } catch (err) {
    console.error(err)
    return NextResponse.json([])
  }
}