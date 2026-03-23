// WhatsApp reminder integration via Twilio
// Configure env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER

/**
 * Send a WhatsApp reminder message to a patient.
 * 
 * Supports both:
 * 1. (phone, message) - New signature
 * 2. ({ patientPhone, patientName, clinicName, appointmentTime, appointmentDate }) - Legacy signature
 *
 * @param {string|object} arg1 - Phone number or config object
 * @param {string} [arg2] - Message text (if arg1 is phone number)
 */
export async function sendWhatsAppReminder(arg1, arg2) {
  let phone, message;

  if (typeof arg1 === 'string') {
    phone = arg1;
    message = arg2;
  } else {
    // Legacy support
    const { patientPhone, patientName, clinicName, appointmentTime, appointmentDate } = arg1;
    phone = patientPhone;
    message = `Hello ${patientName}, this is a reminder for your dental appointment ${appointmentDate === 'tomorrow' ? 'tomorrow' : `on ${appointmentDate}`} at ${clinicName} at ${appointmentTime}. Please arrive 10 minutes early. 🦷`;
  }

  // --- Twilio Integration ---
  // In production, uncomment and use:
  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // const result = await client.messages.create({
  //   body: message,
  //   from: process.env.TWILIO_WHATSAPP_NUMBER,
  //   to: `whatsapp:${phone}`,
  // });

  console.log(`[WhatsApp Reminder] To: ${phone}`);
  console.log(`[WhatsApp Reminder] Message: ${message}`);

  return {
    success: true,
    sid: `MOCK_${Date.now()}`,
    message,
    demo: true,
  };
}

/**
 * Send follow-up reminder
 */
export async function sendFollowUpReminder({ patientPhone, patientName, clinicName, treatmentType }) {
  const message = `Hi ${patientName}, this is ${clinicName}. It's time for your follow-up visit after your ${treatmentType}. Please call us to schedule an appointment. 😊`;

  console.log(`[WhatsApp Follow-up] To: ${patientPhone}`);
  console.log(`[WhatsApp Follow-up] Message: ${message}`);

  return {
    success: true,
    sid: `MOCK_FOLLOWUP_${Date.now()}`,
    message,
    demo: true,
  };
}
