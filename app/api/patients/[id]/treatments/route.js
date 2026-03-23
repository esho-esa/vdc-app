import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { description, treatmentFee, surgeryFee, consultationFee, date, dentist } = body;

    if (!description || !date) {
      return NextResponse.json({ error: 'Description and date are required' }, { status: 400 });
    }

    const supabase = getDB();
    const treatmentId = `t-${uuidv4().substring(0, 8)}`;
    const totalCost = (parseFloat(treatmentFee) || 0) + (parseFloat(surgeryFee) || 0) + (parseFloat(consultationFee) || 0);

    const { data: newTreatment, error: treatError } = await supabase
      .from('treatments')
      .insert([
        {
          id: treatmentId,
          patient_id: id,
          description,
          cost: totalCost,
          treatment_fee: parseFloat(treatmentFee) || 0,
          surgery_fee: parseFloat(surgeryFee) || 0,
          consultation_fee: parseFloat(consultationFee) || 0,
          date,
          dentist: dentist || 'Dr. Anand'
        }
      ])
      .select()
      .single();

    if (treatError) throw treatError;
    
    // Add activity log entry
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `New treatment recorded: ${description}`,
        subtext: `Total: ₹${totalCost}`,
        color: 'green',
        patient_id: id
      }
    ]);

    return NextResponse.json(newTreatment);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
