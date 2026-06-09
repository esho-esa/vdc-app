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
              id: result.sid,
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
              id: result.sid,
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
              id: result.sid,
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
              id: result.sid,
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

    // --- 3. PROCESS OUTSTANDING PAYMENT REMINDERS ---
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // Re-use logic from outstanding reports to get pending > 0
    const { data: outPatients } = await supabase.from('patients').select('id, name, phone, email').eq('is_deleted', 0);
    const { data: outTreatments } = await supabase.from('treatments').select('patient_id, cost');
    const { data: outPayments } = await supabase.from('payments').select('patient_id, amount');

    if (outPatients && outTreatments && outPayments) {
      const patientBilling = {};
      outTreatments.forEach(tx => {
        if (!patientBilling[tx.patient_id]) patientBilling[tx.patient_id] = { billed: 0, paid: 0 };
        patientBilling[tx.patient_id].billed += parseFloat(tx.cost) || 0;
      });
      outPayments.forEach(p => {
        if (!patientBilling[p.patient_id]) patientBilling[p.patient_id] = { billed: 0, paid: 0 };
        patientBilling[p.patient_id].paid += parseFloat(p.amount) || 0;
      });

      for (const p of outPatients) {
        if (!p.phone) continue;
        const billing = patientBilling[p.id] || { billed: 0, paid: 0 };
        const pending = Math.max(0, billing.billed - billing.paid);

        if (pending > 0.01) {
          // Check if we already sent an outstanding reminder recently (e.g., in the last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const { data: recentLog } = await supabase.from('reminder_logs')
            .select('id')
            .eq('patient_id', p.id)
            .eq('reminder_type', 'Outstanding')
            .gte('reminder_date', sevenDaysAgo.toISOString())
            .maybeSingle();

          if (!recentLog) {
            const message = `Hello ${p.name}, this is a gentle reminder from Victoria Dental Care. Your account has an outstanding balance of ₹${pending.toFixed(2)}. Please arrange for payment at your earliest convenience. If you have already paid, kindly ignore this message.`;
            const result = await sendWhatsAppReminder(p.phone, message);

            await supabase.from('reminder_logs').insert([
              {
                id: result.sid,
                patient_id: p.id,
                reminder_type: 'Outstanding',
                channel: 'WhatsApp',
                status: result.success ? 'Sent' : 'Failed',
                reminder_date: new Date().toISOString()
              }
            ]);
            
            if (result.success) remindersSentCount++;
            logs.push({ patient: p.name, type: 'Outstanding', timing: 'Overdue', channel: 'WhatsApp', status: result.success ? 'Sent' : 'Failed' });
          }
        }
      }
    }

    // --- 4. RETRY LOGIC FOR FAILED MESSAGES ---
    // Retry messages that failed in the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: failedLogs } = await supabase
      .from('reminder_logs')
      .select('*, patients(phone, name)')
      .eq('status', 'Failed')
      .eq('channel', 'WhatsApp')
      .gte('reminder_date', threeDaysAgo.toISOString());

    if (failedLogs && failedLogs.length > 0) {
      for (const fLog of failedLogs) {
        const patient = fLog.patients;
        if (!patient || !patient.phone) continue;

        // Reconstruct message
        let message = `Hello ${patient.name}, this is Victoria Dental Care calling regarding your missed notification. Please contact us.`;
        if (fLog.reminder_type === 'Outstanding') {
          message = `Hello ${patient.name}, this is a gentle reminder from Victoria Dental Care regarding your outstanding balance. Please contact us.`;
        }

        const retryResult = await sendWhatsAppReminder(patient.phone, message);

        if (retryResult.success) {
          // Update the failed log with the new SID and Sent status
          await supabase.from('reminder_logs').update({
            id: retryResult.sid,
            status: 'Sent',
            reminder_date: new Date().toISOString()
          }).eq('id', fLog.id);
          
          remindersSentCount++;
          logs.push({ patient: patient.name, type: 'Retry', timing: fLog.reminder_type, channel: 'WhatsApp', status: 'Sent' });
        }
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
