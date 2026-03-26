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
    message = `Hello M/s ${patientName},
Your Dental Appointment has been Scheduled on 🗓 ${appointmentDate} at ⏰ ${appointmentTime}. For enquiry please contact below number. Thanks.

Don't forget to bring:
1. Prescriptions given by our clinic.
2. X-RAYS taken (if any).
3. Your Regular Medicines (if any).

வணக்கம் ${patientName}, உங்கள் பல் மருத்துவ சிகிச்சைக்கான முன்பதிவு நேரம் 🗓 ${appointmentDate} அன்று ⏰ ${appointmentTime} மணிக்கு நியமிக்கப்பட்டுள்ளது. மேலும் விவரங்களுக்கு கீழ்கண்ட எண்ணிற்கு அழைக்கவும். நன்றி.

Victoria Dental Care
Dr. S. Ezhil Ethel Selvam
9789124195`;
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
