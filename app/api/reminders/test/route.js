import { NextResponse } from 'next/server';
import { sendWhatsAppReminder } from '@/lib/whatsapp';

export async function POST(request) {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    const result = await sendWhatsAppReminder(phone, message);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[WhatsApp Test] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
