import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { sendWhatsAppReminder } from '@/lib/whatsapp';

export async function POST(request) {
  try {
    const body = await request.json();
    const { patientPhone, patientName, clinicName, appointmentTime, appointmentDate } = body;

    if (!patientPhone || !patientName) {
      return NextResponse.json({ error: 'patientPhone and patientName are required' }, { status: 400 });
    }

    const supabase = getDB();
    const { data: settings, error } = await supabase
      .from('settings')
      .select('reminder_template')
      .eq('id', 1)
      .single();

    let template = settings?.reminder_template || `Hello [Name], this is a reminder for your dental appointment [Date] at [Time]. Please arrive 10 minutes early. 🦷`;
 
    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching reminder template:', error);
    }

    // Replace placeholders
    const message = template
      .replace(/\[Name\]/g, patientName)
      .replace(/\[Date\]/g, appointmentDate === 'tomorrow' ? 'tomorrow' : appointmentDate)
      .replace(/\[Time\]/g, appointmentTime || '10:00 AM');

    const result = await sendWhatsAppReminder(patientPhone, message);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
