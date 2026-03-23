import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = getDB();
    
    // Fetch all main tables for a comprehensive backup
    const [
      { data: patients },
      { data: appointments },
      { data: treatments },
      { data: prescriptions },
      { data: staff },
      { data: activity_log },
      { data: settings },
      { data: notifications }
    ] = await Promise.all([
      supabase.from('patients').select('*'),
      supabase.from('appointments').select('*'),
      supabase.from('treatments').select('*'),
      supabase.from('prescriptions').select('*'),
      supabase.from('staff').select('*'),
      supabase.from('activity_log').select('*'),
      supabase.from('settings').select('*'),
      supabase.from('notifications').select('*')
    ]);

    const backupData = {
      version: '1.0-supabase',
      exported_at: new Date().toISOString(),
      data: {
        patients,
        appointments,
        treatments,
        prescriptions,
        staff,
        activity_log,
        settings,
        notifications
      }
    };
    
    const fileBuffer = Buffer.from(JSON.stringify(backupData, null, 2));
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Disposition': 'attachment; filename="clinic_supabase_backup.json"',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
