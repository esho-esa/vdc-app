import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = getDB();
    
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (patientError || !patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    
    // Map medical_history to medicalHistory for frontend compatibility
    const patientData = {
      ...patient,
      medicalHistory: patient.medical_history
    };

    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', id)
      .order('date', { ascending: false });

    const { data: treatments } = await supabase
      .from('treatments')
      .select('*')
      .eq('patient_id', id)
      .order('date', { ascending: false });

    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', id)
      .order('date', { ascending: false });

    return NextResponse.json({ ...patientData, appointments, treatments, prescriptions });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const supabase = getDB();
    const body = await request.json();

    const { data, error } = await supabase
      .from('patients')
      .update({
        name: body.name,
        phone: body.phone,
        email: body.email,
        age: body.age,
        address: body.address || '',
        medical_history: body.medicalHistory
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    
    const patient = {
      ...data[0],
      medicalHistory: data[0].medical_history
    };
    
    return NextResponse.json(patient);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';
    const supabase = getDB();
    
    if (permanent) {
      // Manual cascading delete (since ON DELETE CASCADE might not be in the remote schema)
      await supabase.from('appointments').delete().eq('patient_id', id);
      await supabase.from('treatments').delete().eq('patient_id', id);
      await supabase.from('prescriptions').delete().eq('patient_id', id);
      await supabase.from('patients').delete().eq('id', id);
    } else {
      // Soft delete
      await supabase.from('patients').update({ is_deleted: 1 }).eq('id', id);
    }
    
    return NextResponse.json({ success: true, permanent });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
