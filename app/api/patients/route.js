import { getDB } from '@/lib/db'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const showBin = searchParams.get('bin') === 'true'

    const supabase = getDB()

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('is_deleted', showBin ? 1 : 0)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = getDB()
    const body = await request.json()

    const id = uuidv4()

    const { data, error } = await supabase
      .from('patients')
      .insert([
        {
          id,
          name: body.name,
          phone: body.phone || '',
          email: body.email || '',
          age: body.age || null,
          address: body.address || '',
          medical_history: body.medicalHistory || '',
          is_deleted: 0
        }
      ])
      .select()

    if (error) throw error

    // Activity Logging for new patients
    const actId = Math.random().toString(36).substring(2, 9);
    await supabase.from('activity_log').insert([
      {
        id: actId,
        text: `New patient registered: ${body.name}`,
        subtext: `Age: ${body.age || 'N/A'}`,
        patient_id: id
      }
    ]);

    const patient = {
      ...data[0],
      medicalHistory: data[0].medical_history
    };

    return NextResponse.json(patient, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}