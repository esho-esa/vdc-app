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
      return NextResponse.json({ error: 'Medications and date are required' }, { status: 400 });
    }

    const supabase = getDB();
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 });

    const { data: settingsData } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    let settings = settingsData || {
      clinic_name: 'Victoria Dental Care',
      tagline: 'Premium Dental Solutions',
      address: 'No 1/334 Injambakkam, Opp to Suga Jeeva Peralayam, Ammathi, Perumal Koil St, Chennai, Tamil Nadu 600115',
      phone: '+91 9176733358',
      email: 'victoriadentalcare2015@gmail.com',
      accent_color: '#007aff'
    };

    const rxId = uuidv4();
    const pdfFilename = `rx-${rxId}.pdf`;
    // Use /tmp for Vercel compatibility
    const pdfDir = path.join('/tmp', 'pdfs');

    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfPath = path.join(pdfDir, pdfFilename);
    const pdfUrl = `/api/pdfs/${pdfFilename}`;

    // Generate PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    const primaryColor = settings.accent_color || '#007aff';
    const secondaryColor = '#6e6e73';
    const textColor = '#1d1d1f';

    const surgeonFeeNum = parseFloat(surgeonFee) || 0;

    // Helper for table rows
    const drawTableRow = (y, desc, qty, rate, total, isHeader = false) => {
      if (isHeader) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
      } else {
        doc.font('Helvetica').fontSize(10).fillColor(textColor);
      }

      doc.text(desc, 50, y, { width: 250 });
      doc.text(qty, 300, y, { width: 80, align: 'center' });
      doc.text(rate, 380, y, { width: 80, align: 'center' });
      doc.text(total, 460, y, { width: 80, align: 'right' });
    };

    // ═══════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════
    doc.rect(0, 0, 612, 10).fill(primaryColor);

    // Left: Clinic Info
    doc.fontSize(18).font('Helvetica-Bold').fillColor(textColor).text(settings.clinic_name || 'Victoria Dental Care', 50, 50);
    doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text(settings.tagline || 'Premium Dental Solutions', 50, 75);

    doc.fontSize(9).fillColor(textColor);
    doc.text(`Phone: ${settings.phone || '+91 9176733358'}`, 50, 100, { width: 250 });
    doc.text(`Email: ${settings.email || 'victoriadentalcare2015@gmail.com'}`, 50, 115, { width: 250 });
    doc.text(`Address: ${settings.address || ''}`, 50, 130, { width: 250 });
    const leftSideBottom = doc.y;

    // Right: Invoice Info
    doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor).text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor(textColor);
    doc.text(`Invoice Number: RX-${rxId.substring(0, 8).toUpperCase()}`, 310, 85, { width: 250, align: 'right' });
    doc.text(`Date Issued: ${date}`, 310, 100, { width: 250, align: 'right' });
    doc.text(`Patient ID: ${patientId.substring(0, 8).toUpperCase()}`, 310, 115, { width: 250, align: 'right' });
    const rightSideBottom = doc.y;

    // ═══════════════════════════════════════════
    // INVOICE TABLE
    // ═══════════════════════════════════════════
    let currentY = Math.max(leftSideBottom, rightSideBottom) + 20;
    if (currentY < 200) currentY = 200;

    doc.rect(50, currentY, 512, 2).fill(textColor);
    currentY += 10;
    drawTableRow(currentY, 'DESCRIPTION', 'QUANTITY', 'RATE', 'TOTAL', true);
    currentY += 20;
    doc.rect(50, currentY, 512, 1).fill(secondaryColor);
    currentY += 5;

    // Table Content
    const medsArray = Array.isArray(medications) ? medications : [];
    let subtotal = 0;

    // Surgeon Fee line item (if > 0)
    if (surgeonFeeNum > 0) {
      doc.rect(50, currentY - 2, 512, 18).fill('#ebf5ff');
      drawTableRow(currentY, 'Surgeon Fee', '1', `Rs. ${surgeonFeeNum.toFixed(2)}`, `Rs. ${surgeonFeeNum.toFixed(2)}`);
      subtotal += surgeonFeeNum;
      currentY += 20;
    }

    // Medicines
    medsArray.forEach((med, i) => {
      const itemPrice = parseFloat(med.price) || 0;
      subtotal += itemPrice;

      // Zebra stripe (offset by surgeon fee row)
      const rowIndex = surgeonFeeNum > 0 ? i + 1 : i;
      if (rowIndex % 2 === 1) {
        doc.rect(50, currentY - 2, 512, 18).fill('#ebf5ff');
      }

      drawTableRow(currentY, med.name, '1', `Rs. ${itemPrice.toFixed(2)}`, `Rs. ${itemPrice.toFixed(2)}`);
      currentY += 20;
    });

    // ═══════════════════════════════════════════
    // TOTAL SECTION
    // ═══════════════════════════════════════════
    currentY += 20;
    doc.rect(50, currentY, 512, 1).fill(secondaryColor);
    currentY += 10;

    doc.font('Helvetica').fontSize(10).fillColor(secondaryColor);
    doc.text('Sub Total:', 350, currentY, { width: 100 });
    doc.fillColor(textColor).text(`Rs. ${subtotal.toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });

    currentY += 15;
    doc.fillColor(secondaryColor).text('Tax (0%):', 350, currentY, { width: 100 });
    doc.fillColor(textColor).text('Rs. 0.00', 450, currentY, { width: 100, align: 'right' });

    currentY += 25;
    doc.rect(340, currentY - 5, 222, 30).fill('#ebf5ff');
    doc.font('Helvetica-Bold').fontSize(14).fillColor(textColor);
    doc.text('TOTAL AMOUNT:', 350, currentY, { width: 100 });
    doc.text(`Rs. ${subtotal.toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });

    // ═══════════════════════════════════════════
    // PATIENT BILL SECTION
    // ═══════════════════════════════════════════
    currentY += 60;
    doc.rect(50, currentY, 512, 1).fill(textColor);
    currentY += 15;

    doc.font('Helvetica-Bold').fontSize(12).text('BILL TO:', 50, currentY);
    doc.font('Helvetica').fontSize(10);
    doc.text(patient.name, 50, currentY + 15);
    doc.text(`Age: ${patient.age || 'N/A'}`, 50, currentY + 30);
    doc.text(patient.phone || '', 50, currentY + 45);
    if (patient.address) {
      doc.text(patient.address, 50, currentY + 60, { width: 250 });
    }

    // Diagnosis & Notes on right
    if (diagnosis || notes) {
      doc.font('Helvetica-Bold').fontSize(12).text('DIAGNOSIS & NOTES:', 350, currentY);
      doc.font('Helvetica').fontSize(10);
      if (diagnosis) doc.text(`Diagnosis: ${diagnosis}`, 350, currentY + 15, { width: 200 });
      if (notes) doc.text(`Note: ${notes}`, 350, currentY + 30, { width: 200 });
    }

    // ═══════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════
    currentY += 100;
    doc.font('Helvetica-Bold').fontSize(10).text('TERM AND CONDITIONS:', 50, currentY);
    doc.font('Helvetica').fontSize(8).fillColor(secondaryColor).text(
      'Payment is due upon receipt of invoice.\nThis is a computer-generated document and does not require a physical signature.',
      50, currentY + 15, { width: 500 }
    );

    // Bottom Band
    doc.rect(0, 832, 612, 10).fill(primaryColor);

    doc.end();

    // Wait for the PDF to finish writing
    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Save to DB
    const medicationsStr = typeof medications === 'string' ? medications : JSON.stringify(medications);

    const { data: newRx, error: rxError } = await supabase
      .from('prescriptions')
      .insert([
        {
          id: rxId,
          patient_id: patientId,
          medications: medicationsStr,
          diagnosis: diagnosis || '',
          notes: notes || '',
          pdf_url: pdfUrl,
          total_amount: subtotal,
          surgeon_fee: surgeonFeeNum,
          date: date
        }
      ])
      .select()
      .single();

    if (rxError) throw rxError;

    // Log activity
    await supabase.from('activity_log').insert([
      {
        text: `E-Bill generated for ${patient.name}`,
        subtext: `Amount: ₹${subtotal.toFixed(2)}`,
        patient_id: patientId
      }
    ]);

    // Send WhatsApp with PDF Link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const pdfPublicLink = `${siteUrl}${pdfUrl}`;
    const message = `Hello ${patient.name}, your e-prescription from Victoria Dental Care is ready. Download it here: ${pdfPublicLink}`;

    if (patient.phone) {
      await sendWhatsAppReminder(patient.phone, message);
    }

    return NextResponse.json(newRx, { status: 201 });
  } catch (error) {
    console.error('Error generating prescription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
