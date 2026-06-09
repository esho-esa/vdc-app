import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Twilio sends form data usually, but if it's application/json we handle it.
    let payload;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData);
    } else {
      payload = await request.json();
    }

    const { MessageSid, MessageStatus } = payload;

    if (!MessageSid || !MessageStatus) {
      return NextResponse.json({ error: 'Missing required Twilio parameters' }, { status: 400 });
    }

    const supabase = getDB();

    // Map Twilio statuses to our system statuses
    let localStatus = 'Sent';
    if (MessageStatus === 'delivered' || MessageStatus === 'read') localStatus = 'Delivered';
    if (MessageStatus === 'failed' || MessageStatus === 'undelivered') localStatus = 'Failed';

    const { error } = await supabase
      .from('reminder_logs')
      .update({ status: localStatus })
      .eq('id', MessageSid);

    if (error) {
      console.error('[WhatsApp Webhook] Database update error:', error);
    }

    return NextResponse.json({ success: true, updatedStatus: localStatus });
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
