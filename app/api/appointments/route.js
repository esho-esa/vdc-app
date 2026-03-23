import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const supabase = getDB();
    // Using Supabase inner join logic by selecting patients and filtering on is_deleted
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients!inner(is_deleted)
      `)
      .eq('patients.is_deleted', 0)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) throw error;
    
    // Clean up the returned data to flatten the patient check if needed, 
    // although the existing frontend likely expects the flat appointment object.
    const flattened = appointments.map(({ patients, ...rest }) => rest);
    
    return NextResponse.json(flattened);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = getDB();
    const body = await request.json();
    const id = uuidv4();
    
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([
        {
          id,
          patient_id: body.patientId,
          patient_name: body.patientName,
          date: body.date,
          time: body.time,
          duration: body.duration || 30,
          type: body.type || 'checkup',
          status: body.status || 'pending',
          notes: body.notes || ''
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
