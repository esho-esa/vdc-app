/**
 * Centralized PDF generation for Victoria Dental Care
 * 
 * Generates invoice PDFs on-the-fly from prescription data stored in the database.
 * No filesystem storage is needed — PDFs are generated as buffers and streamed directly.
 */

import PDFDocument from 'pdfkit';

/**
 * Generate an invoice PDF buffer from prescription data.
 * 
 * @param {Object} params
 * @param {Object} params.prescription - Prescription record from DB
 * @param {Object} params.patient - Patient record from DB
 * @param {Object} [params.settings] - Clinic settings from DB
 * @returns {Promise<Buffer>} - The PDF as a buffer
 */
export async function generateInvoicePDF({ prescription, patient, settings }) {
  const clinicSettings = settings || {
    clinic_name: 'Victoria Dental Care',
    tagline: 'Premium Dental Solutions',
    address: 'No 1/334 Injambakkam, Opp to Suga Jeeva Peralayam, Ammathi, Perumal Koil St, Chennai',
    phone: '+91 9176733358',
    email: 'victoriadentalcare2015@gmail.com',
    accent_color: '#007aff'
  };

  const primaryColor = clinicSettings.accent_color || '#007aff';
  const secondaryColor = '#6e6e73';
  const textColor = '#1d1d1f';

  // Parse medications
  let medsArray = [];
  try {
    medsArray = typeof prescription.medications === 'string'
      ? JSON.parse(prescription.medications)
      : (Array.isArray(prescription.medications) ? prescription.medications : []);
  } catch (e) {
    console.warn('[PDF] Failed to parse medications:', e.message);
    medsArray = [];
  }

  const surgeonFeeNum = parseFloat(prescription.surgeon_fee) || 0;
  const rxId = prescription.id;
  const date = prescription.date;
  const diagnosis = prescription.diagnosis;
  const notes = prescription.notes;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Helper for table rows
      const drawTableRow = (y, desc, qty, rate, totalLine, isHeader = false) => {
        if (isHeader) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
        } else {
          doc.font('Helvetica').fontSize(10).fillColor(textColor);
        }
        doc.text(desc, 50, y, { width: 250 });
        doc.text(qty, 300, y, { width: 80, align: 'center' });
        doc.text(rate, 380, y, { width: 80, align: 'center' });
        doc.text(totalLine, 460, y, { width: 80, align: 'right' });
      };

      // ═══════════════════════════════════════════
      // HEADER — Top accent bar
      // ═══════════════════════════════════════════
      doc.rect(0, 0, 612, 10).fill(primaryColor);

      // Left: Clinic Info
      doc.fontSize(18).font('Helvetica-Bold').fillColor(textColor)
        .text(clinicSettings.clinic_name || 'Victoria Dental Care', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
        .text(clinicSettings.tagline || 'Premium Dental Solutions', 50, 75);

      doc.fontSize(9).fillColor(textColor);
      doc.text(`Phone: ${clinicSettings.phone || '+91 9176733358'}`, 50, 100, { width: 250 });
      doc.text(`Email: ${clinicSettings.email || 'victoriadentalcare2015@gmail.com'}`, 50, 115, { width: 250 });
      doc.text(`Address: ${clinicSettings.address || ''}`, 50, 130, { width: 250 });
      const leftSideBottom = doc.y;

      // Right: Invoice Info
      doc.fontSize(24).font('Helvetica-Bold').fillColor(primaryColor)
        .text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).font('Helvetica').fillColor(textColor);
      doc.text(`Invoice Number: RX-${rxId.substring(0, 8).toUpperCase()}`, 310, 85, { width: 250, align: 'right' });
      doc.text(`Date Issued: ${date}`, 310, 100, { width: 250, align: 'right' });
      doc.text(`Patient ID: ${(patient.id || '').substring(0, 8).toUpperCase()}`, 310, 115, { width: 250, align: 'right' });
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

      let subtotal = 0;

      // Surgeon Fee line item (if > 0)
      if (surgeonFeeNum > 0) {
        doc.rect(50, currentY - 2, 512, 18).fill('#ebf5ff');
        drawTableRow(currentY, 'Surgeon Fee', '1', `Rs. ${surgeonFeeNum.toFixed(2)}`, `Rs. ${surgeonFeeNum.toFixed(2)}`);
        currentY += 20;
      }

      // Medicines
      medsArray.forEach((med, i) => {
        const itemPrice = parseFloat(med.price) || 0;
        subtotal += itemPrice;

        const rowIndex = surgeonFeeNum > 0 ? i + 1 : i;
        if (rowIndex % 2 === 1) {
          doc.rect(50, currentY - 2, 512, 18).fill('#ebf5ff');
        }

        drawTableRow(currentY, med.name || 'Medicine', '1', `Rs. ${itemPrice.toFixed(2)}`, `Rs. ${itemPrice.toFixed(2)}`);
        currentY += 20;
      });

      const totalAmount = subtotal + surgeonFeeNum;

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
      doc.text(`Rs. ${totalAmount.toFixed(2)}`, 450, currentY, { width: 100, align: 'right' });

      // ═══════════════════════════════════════════
      // PATIENT BILL SECTION
      // ═══════════════════════════════════════════
      currentY += 60;
      doc.rect(50, currentY, 512, 1).fill(textColor);
      currentY += 15;

      doc.font('Helvetica-Bold').fontSize(12).text('BILL TO:', 50, currentY);
      doc.font('Helvetica').fontSize(10);
      doc.text(patient.name || '', 50, currentY + 15);
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
    } catch (err) {
      reject(err);
    }
  });
}
