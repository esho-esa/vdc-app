import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { sendWhatsAppReminder } from '@/lib/whatsapp';
import { verifyToken } from '@/lib/auth';

export async function POST(request) {
  try {
    // Auth Check
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getDB();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Compute Tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let remindersSentCount = 0;
    const logs = [];

    // --- 1. PROCESS APPOINTMENTS REMINDERS ---
    // Fetch active appointments for today and tomorrow
    const { data: appts, error: apptsErr } = await supabase
      .from('appointments')
      .select('*, patients(name, phone, email)')
      .in('status', ['confirmed', 'pending'])
      .in('date', [todayStr, tomorrowStr]);

    if (apptsErr) throw apptsErr;

    for (const appt of appts) {
      const isTomorrow = appt.date === tomorrowStr;
      const reminderType = isTomorrow ? '1 Day Before' : 'Same Day';
      const patient = appt.patients;

      if (!patient || !patient.phone) continue;

      // Check if reminder was already sent
      const { data: existingLog, error: logCheckErr } = await supabase
        .from('reminder_logs')
        .select('*')
        .eq('appointment_id', appt.id)
        .eq('reminder_type', reminderType)
        .eq('channel', 'WhatsApp')
        .maybeSingle();

      if (logCheckErr) console.warn(logCheckErr);

      if (!existingLog) {
        // Send WhatsApp Reminder
        const message = `Hello M/s ${patient.name}, this is Victoria Dental Care. Just a friendly reminder that your dental appointment is scheduled for ${appt.date === todayStr ? 'TODAY' : 'TOMORROW'} (${appt.date}) at ${appt.time}. See you soon!`;
        const result = await sendWhatsAppReminder(patient.phone, message);

        if (result.success) {
          // Log to reminder_logs as Sent
          await supabase.from('reminder_logs').insert([
            {
              id: `rem-${uuidv4().substring(0, 8)}`,
              patient_id: appt.patient_id,
              appointment_id: appt.id,
              reminder_type: reminderType,
              channel: 'WhatsApp',
              status: 'Sent',
              reminder_date: new Date().toISOString()
            }
          ]);
          remindersSentCount++;
          logs.push({ patient: patient.name, type: 'Appointment', timing: reminderType, channel: 'WhatsApp', status: 'Sent' });
        } else {
          // Log to reminder_logs as Failed
          await supabase.from('reminder_logs').insert([
            {
              id: `rem-${uuidv4().substring(0, 8)}`,
              patient_id: appt.patient_id,
              appointment_id: appt.id,
              reminder_type: reminderType,
              channel: 'WhatsApp',
              status: 'Failed',
              reminder_date: new Date().toISOString()
            }
          ]);
          logs.push({ patient: patient.name, type: 'Appointment', timing: reminderType, channel: 'WhatsApp', status: 'Failed' });
        }

        // Mock SMS & Email channels as ready
        console.log(`[SMS Reminder Ready] Send to: ${patient.phone} | Msg: ${message}`);
        console.log(`[Email Reminder Ready] Send to: ${patient.email || 'no-email@example.com'} | Subject: Appointment Reminder | Msg: ${message}`);
      }
    }

    // --- 2. PROCESS FOLLOW-UPS REMINDERS ---
    // Fetch follow-ups scheduled for today, tomorrow, or in the past (overdue)
    const { data: followUps, error: followUpsErr } = await supabase
      .from('follow_ups')
      .select('*, patients(name, phone, email)')
      .eq('status', 'Scheduled');

    if (followUpsErr) throw followUpsErr;

    for (const fUp of followUps) {
      let reminderType = '';
      if (fUp.followup_date === tomorrowStr) {
        reminderType = '1 Day Before';
      } else if (fUp.followup_date === todayStr) {
        reminderType = 'Same Day';
      } else if (fUp.followup_date < todayStr) {
        reminderType = 'Overdue';
      }

      if (!reminderType) continue; // Not within reminder scope
      const patient = fUp.patients;
      if (!patient || !patient.phone) continue;

      // Check if reminder was already sent
      const { data: existingLog } = await supabase
        .from('reminder_logs')
        .select('*')
        .eq('followup_id', fUp.id)
        .eq('reminder_type', reminderType)
        .eq('channel', 'WhatsApp')
        .maybeSingle();

      if (!existingLog) {
        let message = `Hi ${patient.name}, this is Victoria Dental Care. It's time for your follow-up visit after your ${fUp.followup_type}. Please call us to schedule an appointment. 😊`;
        
        if (reminderType === 'Overdue') {
          message = `Hi ${patient.name}, this is a friendly notice from Victoria Dental Care. You have an overdue follow-up visit scheduled on ${fUp.followup_date}. Please contact us at 9789124195 to reschedule. Thank you!`;
        }

        const result = await sendWhatsAppReminder(patient.phone, message);

        if (result.success) {
          await supabase.from('reminder_logs').insert([
            {
              id: `rem-${uuidv4().substring(0, 8)}`,
              patient_id: fUp.patient_id,
              followup_id: fUp.id,
              reminder_type: reminderType,
              channel: 'WhatsApp',
              status: 'Sent',
              reminder_date: new Date().toISOString()
            }
          ]);
          remindersSentCount++;
          logs.push({ patient: patient.name, type: `Follow-Up (${fUp.followup_type})`, timing: reminderType, channel: 'WhatsApp', status: 'Sent' });
        } else {
          await supabase.from('reminder_logs').insert([
            {
              id: `rem-${uuidv4().substring(0, 8)}`,
              patient_id: fUp.patient_id,
              followup_id: fUp.id,
              reminder_type: reminderType,
              channel: 'WhatsApp',
              status: 'Failed',
              reminder_date: new Date().toISOString()
            }
          ]);
          logs.push({ patient: patient.name, type: `Follow-Up (${fUp.followup_type})`, timing: reminderType, channel: 'WhatsApp', status: 'Failed' });
        }

        // Mock SMS & Email channels as ready
        console.log(`[SMS Follow-up Ready] Send to: ${patient.phone} | Msg: ${message}`);
        console.log(`[Email Follow-up Ready] Send to: ${patient.email || 'no-email@example.com'} | Subject: Follow-Up Notice | Msg: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      processedAt: new Date().toISOString(),
      remindersSentCount,
      logs
    });
  } catch (error) {
    console.error('[Reminders:Process] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
