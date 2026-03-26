import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { sendWhatsAppReminder } from '@/lib/whatsapp';

export async function POST(request, { params }) {
  try {

    const { id: patientId } = params;
    const body = await request.json();
    const { medications, diagnosis, notes, date, surgeonFee } = body;

    if (!medications || !date) {
      return NextResponse.json(
        { error: 'Medications and date are required' },
        { status: 400 }
      );
    }

    const supabase = getDB();

    // Get patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Get settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    const settings = settingsData || {
      clinic_name: 'Victoria Dental Care',
      tagline: 'Premium Dental Solutions',
      address:
        'No 1/334 Injambakkam, Opp to Suga Jeeva Peralayam, Ammathi, Perumal Koil St, Chennai',
      phone: '+91 9176733358',
      email: 'victoriadentalcare2015@gmail.com',
      accent_color: '#007aff'
    };

    const rxId = uuidv4();
    const pdfFilename = `rx-${rxId}.pdf`;

    // Vercel safe folder
    const pdfDir = '/tmp/pdfs';

    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfPath = path.join(pdfDir, pdfFilename);
    const pdfUrl = `/api/pdfs/${pdfFilename}`;

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const primaryColor = settings.accent_color || '#007aff';
    const textColor = '#1d1d1f';

    const surgeonFeeNum = parseFloat(surgeonFee) || 0;

    const medsArray = Array.isArray(medications) ? medications : [];

    let subtotal = surgeonFeeNum;

    medsArray.forEach((med) => {
      subtotal += parseFloat(med.price) || 0;
    });

    doc.fontSize(20).text(settings.clinic_name);
    doc.moveDown();
    doc.fontSize(12).text(`Patient: ${patient.name}`);
    doc.text(`Date: ${date}`);
    doc.moveDown();

    medsArray.forEach((med) => {
      doc.text(`${med.name} - ₹${med.price}`);
    });

    if (surgeonFeeNum > 0) {
      doc.moveDown();
      doc.text(`Surgeon Fee: ₹${surgeonFeeNum}`);
    }

    doc.moveDown();
    doc.text(`Total: ₹${subtotal}`);

    doc.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Save to DB
    const { data: newRx, error: rxError } = await supabase
      .from('prescriptions')
      .insert([
        {
          id: rxId,
          patient_id: patientId,
          medicines: JSON.stringify(medications),
          diagnosis: diagnosis || '',
          notes: notes || '',
          surgeon_fee: surgeonFeeNum
        }
      ])
      .select()
      .single();

    if (rxError) throw rxError;

    // Log activity
    await supabase.from('activity_log').insert([
      {
        text: `E-Bill generated for ${patient.name}`,
        subtext: `Amount: ₹${subtotal}`,
        patient_id: patientId
      }
    ]);

    // Send WhatsApp
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';

    const pdfPublicLink = `${siteUrl}${pdfUrl}`;

    const message = `Hello ${patient.name}, your prescription is ready: ${pdfPublicLink}`;

    if (patient.phone) {
      await sendWhatsAppReminder(patient.phone, message);
    }

    return NextResponse.json(newRx, { status: 201 });

  } catch (error) {

    console.error('Prescription error:', error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}