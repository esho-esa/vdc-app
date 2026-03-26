import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const { id: patientId, rxId } = await params;

    const supabase = getDB();

    const { error } = await supabase
      .from('prescriptions')
      .delete()
      .eq('id', rxId)
      .eq('patient_id', patientId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Delete prescription error:', error);
    return NextResponse.json({ error: 'Failed to delete prescription' }, { status: 500 });
  }
}
