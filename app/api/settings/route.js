import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getDB();
    let { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error && error.code === 'PGRST116') { // Not found in Supabase
      const { data: newSettings, error: insertError } = await supabase
        .from('settings')
        .insert([{ id: 1 }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      settings = newSettings;
    } else if (error) {
      throw error;
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = getDB();
    const body = await request.json();
    
    const { data: updated, error } = await supabase
      .from('settings')
      .update({
        clinic_name: body.clinicName || '',
        tagline: body.tagline || '',
        email: body.email || '',
        phone: body.phone || '',
        address: body.address || '',
        accent_color: body.accentColor || '#007aff',
        whatsapp_enabled: body.whatsappEnabled ? 1 : 0,
        whatsapp_number: body.whatsappNumber || '',
        reminder_template: body.reminderTemplate || ''
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
