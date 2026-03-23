import { NextResponse } from 'next/server';
import { getDB } from '../../../../lib/db';

export async function PUT(request, { params }) {
  const { id } = await params;
  const { status } = await request.json();

  try {
    const supabase = getDB();
    const { data: updated, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Log activity
    await supabase.from('activity_log').insert([
      {
        id: Math.random().toString(36).substring(2, 9),
        text: `Appointment status updated: ${status}`,
        subtext: `Patient: ${updated.patient_name}`,
        color: 'blue',
        patient_id: updated.patient_id
      }
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;

  try {
    const supabase = getDB();
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
