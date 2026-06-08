import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(request, { params }) {
  try {
    const { id: patientId, treatmentId } = await params;
    const body = await request.json();

    const { name, description, notes, treatmentFee, surgeryFee, consultationFee, dentist, date } = body;

    const desc = name || description;
    if (!desc || !date) {
      return NextResponse.json({ error: 'Name/Description and Date are required' }, { status: 400 });
    }

    // Extract user session to track auditing
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    const username = user?.name || 'Staff';

    const supabase = getDB();

    const tf = parseFloat(treatmentFee) || 0;
    const sf = parseFloat(surgeryFee) || 0;
    const cf = parseFloat(consultationFee) || 0;
    const totalCost = tf + sf + cf;

    // Serialize details inside description column
    const serializedDescription = JSON.stringify({
      name: desc,
      notes: notes || '',
      last_modified_by: username,
      last_modified_at: new Date().toISOString()
    });

    const { data: updated, error } = await supabase
      .from('treatments')
      .update({
        description: serializedDescription,
        cost: totalCost,
        treatment_fee: tf,
        surgery_fee: sf,
        consultation_fee: cf,
        dentist: dentist || 'Dr. Anand',
        date
      })
      .eq('id', treatmentId)
      .eq('patient_id', patientId)
      .select()
      .single();

    if (error) throw error;

    // Add activity log
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Updated treatment: ${desc.substring(0, 50)}`,
        subtext: `New Cost: ₹${totalCost}`,
        color: 'blue',
        patient_id: patientId
      }
    ]);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Treatment:Update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: patientId, treatmentId } = await params;
    const supabase = getDB();

    // Get the description of the treatment being deleted to log it in activity feed
    const { data: oldData } = await supabase
      .from('treatments')
      .select('description')
      .eq('id', treatmentId)
      .single();

    const { error } = await supabase
      .from('treatments')
      .delete()
      .eq('id', treatmentId)
      .eq('patient_id', patientId);

    if (error) throw error;

    let displayDesc = 'Treatment record';
    if (oldData?.description) {
      try {
        const parsed = JSON.parse(oldData.description);
        displayDesc = parsed.name || parsed.description || 'Treatment record';
      } catch (e) {
        displayDesc = oldData.description;
      }
    }

    // Add activity log
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Deleted treatment: ${displayDesc.substring(0, 50)}`,
        subtext: `Removed from patient history`,
        color: 'red',
        patient_id: patientId
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Treatment:Delete] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
