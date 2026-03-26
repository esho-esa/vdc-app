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

    const defaultTemplate = `Hello M/s [Name],
Your Dental Appointment has been Scheduled on 🗓 [Date] at ⏰ [Time]. For enquiry please contact below number. Thanks.

Don't forget to bring:
1. Prescriptions given by our clinic.
2. X-RAYS taken (if any).
3. Your Regular Medicines (if any).

வணக்கம் [Name], உங்கள் பல் மருத்துவ சிகிச்சைக்கான முன்பதிவு நேரம் 🗓 [Date] அன்று ⏰ [Time] மணிக்கு நியமிக்கப்பட்டுள்ளது. மேலும் விவரங்களுக்கு கீழ்கண்ட எண்ணிற்கு அழைக்கவும். நன்றி.

Victoria Dental Care
Dr. S. Ezhil Ethel Selvam
9789124195`;

    let template = settings?.reminder_template || defaultTemplate;
 
    if (error && error.code !== 'PGRST116') {
      console.warn('Error fetching reminder template:', error);
    }

    // Replace placeholders
    const message = template
      .replace(/\[Name\]/g, patientName)
      .replace(/\[Date\]/g, appointmentDate || '')
      .replace(/\[Time\]/g, appointmentTime || '10:00 AM');

    const result = await sendWhatsAppReminder(patientPhone, message);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
