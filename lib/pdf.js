/**
 * Centralized PDF generation for Victoria Dental Care
 * 
 * Generates invoice PDFs on-the-fly from prescription data stored in the database.
 * Supports multi-page layouts, dynamic height calculation, and text wrapping to prevent overlap.
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
      // Create document with standard A4 measurements (595.28 x 841.89 points)
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        // Post-processing: Add page numbers and bottom bar on all pages
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          
          // Bottom bar accent
          doc.save();
          doc.rect(0, 841.89 - 10, 595.28, 10).fill(primaryColor);
          doc.restore();

          // Page Numbering
          doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
          doc.text(`Page ${i + 1} of ${pages.count}`, 50, 841.89 - 25, { width: 495, align: 'right' });
        }
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', (err) => reject(err));

      // Layout boundary limits
      const pageBottom = 841.89 - 90; // Leave 90 points safety margin at bottom for page number + band

      // Helper for table rows
      const drawTableRow = (y, desc, qty, rate, totalLine, isHeader = false) => {
        if (isHeader) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
        } else {
          doc.font('Helvetica').fontSize(9).fillColor(textColor);
        }
        doc.text(desc, 50, y, { width: 240 });
        doc.text(qty, 300, y, { width: 60, align: 'center' });
        doc.text(rate, 370, y, { width: 80, align: 'center' });
        doc.text(totalLine, 460, y, { width: 85, align: 'right' });
      };

      // Helper to add new page for table overflow
      const handleTablePageBreak = () => {
        doc.addPage();
        // Top accent bar
        doc.save();
        doc.rect(0, 0, 595.28, 10).fill(primaryColor);
        doc.restore();
        
        let y = 40;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
        drawTableRow(y, 'DESCRIPTION', 'QUANTITY', 'RATE', 'TOTAL', true);
        y += 15;
        doc.save();
        doc.rect(50, y, 495, 1).fill(secondaryColor);
        doc.restore();
        return y + 5;
      };

      // ═══════════════════════════════════════════
      // HEADER — Top accent bar (Page 1)
      // ═══════════════════════════════════════════
      doc.save();
      doc.rect(0, 0, 595.28, 10).fill(primaryColor);
      doc.restore();

      // Left: Clinic Info
      doc.fontSize(18).font('Helvetica-Bold').fillColor(textColor)
        .text(clinicSettings.clinic_name || 'Victoria Dental Care', 50, 45);
      doc.fontSize(10).font('Helvetica').fillColor(secondaryColor)
        .text(clinicSettings.tagline || 'Premium Dental Solutions', 50, 70);

      doc.fontSize(8.5).fillColor(textColor);
      doc.text(`Phone: ${clinicSettings.phone || '+91 9176733358'}`, 50, 90, { width: 240 });
      doc.text(`Email: ${clinicSettings.email || 'victoriadentalcare2015@gmail.com'}`, 50, 103, { width: 240 });
      
      const clinicAddress = clinicSettings.address || '';
      const clinicAddrHeight = doc.heightOfString(clinicAddress, { width: 240 });
      doc.text(`Address: ${clinicAddress}`, 50, 116, { width: 240 });
      const leftSideBottom = 116 + clinicAddrHeight;

      // Right: Invoice Info
      doc.fontSize(22).font('Helvetica-Bold').fillColor(primaryColor)
        .text('INVOICE', 300, 45, { width: 245, align: 'right' });
      doc.fontSize(9).font('Helvetica').fillColor(textColor);
      doc.text(`Invoice Number: RX-${rxId.substring(0, 8).toUpperCase()}`, 300, 75, { width: 245, align: 'right' });
      doc.text(`Date Issued: ${date}`, 300, 90, { width: 245, align: 'right' });
      
      const patientIdString = (patient.id || '').substring(0, 8).toUpperCase();
      doc.text(`Patient ID: ${patientIdString}`, 300, 105, { width: 245, align: 'right' });
      const rightSideBottom = 120;

      // ═══════════════════════════════════════════
      // INVOICE TABLE START
      // ═══════════════════════════════════════════
      let currentY = Math.max(leftSideBottom, rightSideBottom) + 20;
      if (currentY < 170) currentY = 170;

      doc.save();
      doc.rect(50, currentY, 495, 2).fill(textColor);
      doc.restore();
      currentY += 8;

      drawTableRow(currentY, 'DESCRIPTION', 'QUANTITY', 'RATE', 'TOTAL', true);
      currentY += 16;

      doc.save();
      doc.rect(50, currentY, 495, 1).fill(secondaryColor);
      doc.restore();
      currentY += 6;

      let subtotal = 0;
      let rowIndex = 0;

      // Helper to add line item with dynamic text height & page break support
      const addLineItem = (desc, qty, rateVal, totalVal) => {
        const rowHeight = Math.max(doc.heightOfString(desc, { width: 240 }), 14);
        
        // Check if row exceeds page bounds
        if (currentY + rowHeight + 10 > pageBottom) {
          currentY = handleTablePageBreak();
        }

        // Draw zebra stripe
        if (rowIndex % 2 === 1) {
          doc.save();
          doc.rect(50, currentY - 3, 495, rowHeight + 6).fill('#f5f5f7');
          doc.restore();
        }

        drawTableRow(currentY, desc, qty, rateVal, totalVal);
        currentY += rowHeight + 6;
        rowIndex++;
      };

      // Surgeon Fee line item (if > 0)
      if (surgeonFeeNum > 0) {
        addLineItem('Surgeon Fee / Consultation & Treatment', '1', `Rs. ${surgeonFeeNum.toFixed(2)}`, `Rs. ${surgeonFeeNum.toFixed(2)}`);
      }

      // Medicines list
      medsArray.forEach((med) => {
        const itemPrice = parseFloat(med.price) || 0;
        subtotal += itemPrice;
        addLineItem(med.name || 'Medicine', '1', `Rs. ${itemPrice.toFixed(2)}`, `Rs. ${itemPrice.toFixed(2)}`);
      });

      const totalAmount = subtotal + surgeonFeeNum;

      // ═══════════════════════════════════════════
      // TOTALS SECTION
      // ═══════════════════════════════════════════
      const totalBlockHeight = 85;
      if (currentY + totalBlockHeight > pageBottom) {
        currentY = handleTablePageBreak();
      }

      currentY += 10;
      doc.save();
      doc.rect(50, currentY, 495, 1).fill(secondaryColor);
      doc.restore();
      currentY += 10;

      doc.font('Helvetica').fontSize(9.5).fillColor(secondaryColor);
      doc.text('Sub Total:', 320, currentY, { width: 110 });
      doc.fillColor(textColor).text(`Rs. ${subtotal.toFixed(2)}`, 440, currentY, { width: 105, align: 'right' });

      currentY += 16;
      doc.fillColor(secondaryColor).text('Tax (0%):', 320, currentY, { width: 110 });
      doc.fillColor(textColor).text('Rs. 0.00', 440, currentY, { width: 105, align: 'right' });

      currentY += 20;
      doc.save();
      doc.rect(310, currentY - 5, 235, 28).fill('#ebf5ff');
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(11).fillColor(textColor);
      doc.text('TOTAL AMOUNT:', 320, currentY + 4, { width: 120 });
      doc.text(`Rs. ${totalAmount.toFixed(2)}`, 440, currentY + 4, { width: 105, align: 'right' });
      currentY += 35;

      // ═══════════════════════════════════════════
      // PATIENT DETAILS & CLINICAL NOTES SECTION
      // ═══════════════════════════════════════════
      // Compute heights to see if we need a page break before Patient details
      const patientName = patient.name || '';
      const patientPhone = patient.phone || '';
      const patientAddress = patient.address || '';
      const patientAge = patient.age ? `Age: ${patient.age}` : 'Age: N/A';

      const leftColHeight = 25 + 
        doc.heightOfString(patientName, { width: 230 }) + 
        doc.heightOfString(patientAge, { width: 230 }) + 
        doc.heightOfString(patientPhone, { width: 230 }) + 
        (patientAddress ? doc.heightOfString(patientAddress, { width: 230 }) : 0);

      const rightColHeight = 25 + 
        (diagnosis ? doc.heightOfString(`Diagnosis: ${diagnosis}`, { width: 230 }) + 5 : 0) + 
        (notes ? doc.heightOfString(`Note: ${notes}`, { width: 230 }) : 0);

      const sectionHeight = Math.max(leftColHeight, rightColHeight) + 30;

      if (currentY + sectionHeight > pageBottom) {
        // Start on new page
        doc.addPage();
        doc.save();
        doc.rect(0, 0, 595.28, 10).fill(primaryColor);
        doc.restore();
        currentY = 40;
      }

      doc.save();
      doc.rect(50, currentY, 495, 1.5).fill(textColor);
      doc.restore();
      currentY += 15;

      // Render columns side-by-side cleanly tracking vertical space
      let leftY = currentY;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(textColor).text('BILL TO:', 50, leftY);
      leftY += 16;
      doc.font('Helvetica').fontSize(9);
      doc.text(patientName, 50, leftY, { width: 230 });
      leftY += doc.heightOfString(patientName, { width: 230 }) + 3;
      doc.text(patientAge, 50, leftY, { width: 230 });
      leftY += doc.heightOfString(patientAge, { width: 230 }) + 3;
      doc.text(patientPhone, 50, leftY, { width: 230 });
      leftY += doc.heightOfString(patientPhone, { width: 230 }) + 3;
      if (patientAddress) {
        doc.text(patientAddress, 50, leftY, { width: 230 });
        leftY += doc.heightOfString(patientAddress, { width: 230 }) + 3;
      }

      let rightY = currentY;
      if (diagnosis || notes) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor(textColor).text('DIAGNOSIS & CLINICAL NOTES:', 310, rightY);
        rightY += 16;
        doc.font('Helvetica').fontSize(9);
        if (diagnosis) {
          doc.text(`Diagnosis: ${diagnosis}`, 310, rightY, { width: 235 });
          rightY += doc.heightOfString(`Diagnosis: ${diagnosis}`, { width: 235 }) + 6;
        }
        if (notes) {
          doc.text(`Instructions: ${notes}`, 310, rightY, { width: 235 });
          rightY += doc.heightOfString(`Instructions: ${notes}`, { width: 235 }) + 6;
        }
      }

      currentY = Math.max(leftY, rightY) + 20;

      // ═══════════════════════════════════════════
      // TERMS & CONDITIONS
      // ═══════════════════════════════════════════
      const termsHeight = 45;
      if (currentY + termsHeight > pageBottom) {
        doc.addPage();
        doc.save();
        doc.rect(0, 0, 595.28, 10).fill(primaryColor);
        doc.restore();
        currentY = 40;
      }

      doc.font('Helvetica-Bold').fontSize(9).text('TERMS AND CONDITIONS:', 50, currentY);
      doc.font('Helvetica').fontSize(8.5).fillColor(secondaryColor).text(
        'Payment is due upon receipt of invoice.\nThis is a computer-generated document and does not require a physical signature.',
        50, currentY + 12, { width: 495 }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a patient billing report PDF buffer.
 * 
 * @param {Object} params
 * @param {Object} params.patient - Patient record from DB
 * @param {Array} params.treatments - List of treatments (possibly filtered)
 * @param {string} [params.startDate] - Start date of filter
 * @param {string} [params.endDate] - End date of filter
 * @param {string} [params.dentist] - Dentist of filter
 * @param {Object} [params.settings] - Clinic settings
 * @returns {Promise<Buffer>} - The PDF as a buffer
 */
export async function generateBillingReportPDF({ patient, treatments, startDate, endDate, dentist, settings }) {
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

  // Calculate aggregates
  let totalTreatment = 0;
  let totalSurgery = 0;
  let totalConsultation = 0;
  let totalBilled = 0;

  treatments.forEach(t => {
    totalTreatment += parseFloat(t.treatment_fee) || 0;
    totalSurgery += parseFloat(t.surgery_fee) || 0;
    totalConsultation += parseFloat(t.consultation_fee) || 0;
    totalBilled += parseFloat(t.cost) || 0;
  });

  const totalPayments = totalBilled; // Assuming fully paid
  const outstandingBalance = 0;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.save();
          doc.rect(0, 841.89 - 10, 595.28, 10).fill(primaryColor);
          doc.restore();

          doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
          doc.text(`Page ${i + 1} of ${pages.count}`, 50, 841.89 - 25, { width: 495, align: 'right' });
        }
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', (err) => reject(err));

      const pageBottom = 841.89 - 90;

      const drawBillingTableRow = (y, date, name, dentistVal, tf, sf, cf, total, isHeader = false) => {
        if (isHeader) {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textColor);
        } else {
          doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
        }
        doc.text(date, 50, y, { width: 60 });
        doc.text(name, 110, y, { width: 110 });
        doc.text(dentistVal, 220, y, { width: 80 });
        doc.text(tf, 300, y, { width: 60, align: 'right' });
        doc.text(sf, 360, y, { width: 60, align: 'right' });
        doc.text(cf, 420, y, { width: 60, align: 'right' });
        doc.text(total, 480, y, { width: 65, align: 'right' });
      };

      const handleTablePageBreak = () => {
        doc.addPage();
        doc.save();
        doc.rect(0, 0, 595.28, 10).fill(primaryColor);
        doc.restore();
        
        let y = 40;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textColor);
        drawBillingTableRow(y, 'DATE', 'TREATMENT', 'DENTIST', 'TREAT (₹)', 'SURG (₹)', 'CONS (₹)', 'TOTAL (₹)', true);
        y += 15;
        doc.save();
        doc.rect(50, y, 495, 1).fill(secondaryColor);
        doc.restore();
        return y + 5;
      };

      // Header top accent
      doc.save();
      doc.rect(0, 0, 595.28, 10).fill(primaryColor);
      doc.restore();

      // Left: Clinic Info
      doc.fontSize(16).font('Helvetica-Bold').fillColor(textColor)
        .text(clinicSettings.clinic_name || 'Victoria Dental Care', 50, 40);
      doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
        .text(clinicSettings.tagline || 'Premium Dental Solutions', 50, 58);
      doc.fontSize(8).fillColor(textColor);
      doc.text(`Phone: ${clinicSettings.phone}`, 50, 72, { width: 240 });
      doc.text(`Email: ${clinicSettings.email}`, 50, 83, { width: 240 });
      doc.text(`Address: ${clinicSettings.address}`, 50, 94, { width: 240 });

      // Right: Patient Summary Header
      doc.fontSize(18).font('Helvetica-Bold').fillColor(primaryColor)
        .text('BILLING SUMMARY', 300, 40, { width: 245, align: 'right' });
      doc.fontSize(9).font('Helvetica').fillColor(textColor);
      doc.text(`Patient Name: ${patient.name}`, 300, 65, { width: 245, align: 'right' });
      doc.text(`Age/Gender: ${patient.age || 'N/A'}`, 300, 78, { width: 245, align: 'right' });
      doc.text(`Phone: ${patient.phone || 'N/A'}`, 300, 91, { width: 245, align: 'right' });
      doc.text(`Report Date: ${new Date().toISOString().split('T')[0]}`, 300, 104, { width: 245, align: 'right' });

      // Separator line
      doc.save();
      doc.rect(50, 130, 495, 1.5).fill(textColor);
      doc.restore();

      // Summary Boxes Section
      let summaryY = 145;
      const boxW = 158;
      const boxH = 45;

      const drawSummaryBox = (x, y, w, h, label, value, valueColor = textColor) => {
        doc.save();
        // Light fill with thin border
        doc.roundedRect(x, y, w, h, 6).fill('#f8f9fa');
        doc.roundedRect(x, y, w, h, 6).lineWidth(0.5).strokeColor('#e9ecef').stroke();
        doc.restore();
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(secondaryColor).text(label, x + 10, y + 8, { width: w - 20 });
        doc.font('Helvetica-Bold').fontSize(11).fillColor(valueColor).text(value, x + 10, y + 22, { width: w - 20 });
      };

      // Row 1
      drawSummaryBox(50, summaryY, boxW, boxH, 'TOTAL BILLED AMOUNT', `₹${totalBilled.toLocaleString('en-IN')}`);
      drawSummaryBox(218, summaryY, boxW, boxH, 'TOTAL PAYMENTS RECEIVED', `₹${totalPayments.toLocaleString('en-IN')}`, '#34c759');
      drawSummaryBox(386, summaryY, boxW, boxH, 'OUTSTANDING BALANCE', `₹${outstandingBalance.toLocaleString('en-IN')}`, outstandingBalance > 0 ? '#ff3b30' : textColor);

      // Row 2
      summaryY += 55;
      drawSummaryBox(50, summaryY, boxW, boxH, 'TOTAL TREATMENT CHARGES', `₹${totalTreatment.toLocaleString('en-IN')}`);
      drawSummaryBox(218, summaryY, boxW, boxH, 'TOTAL SURGERY CHARGES', `₹${totalSurgery.toLocaleString('en-IN')}`);
      drawSummaryBox(386, summaryY, boxW, boxH, 'TOTAL CONSULTATION CHARGES', `₹${totalConsultation.toLocaleString('en-IN')}`);

      let currentY = summaryY + boxH + 15;

      // Filter state indicator
      if (startDate || endDate || dentist) {
        let filterText = 'Active Filters: ';
        const filters = [];
        if (startDate && endDate) filters.push(`Date Range: ${startDate} to ${endDate}`);
        else if (startDate) filters.push(`Since: ${startDate}`);
        else if (endDate) filters.push(`Before: ${endDate}`);
        if (dentist) filters.push(`Dentist: ${dentist}`);
        
        filterText += filters.join(' | ');

        doc.save();
        doc.roundedRect(50, currentY, 495, 20, 4).fill('#ebf5ff');
        doc.restore();
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#007aff').text(filterText, 60, currentY + 6, { width: 475 });
        currentY += 28;
      }

      // Treatment wise breakdown header
      doc.font('Helvetica-Bold').fontSize(11).fillColor(textColor).text('TREATMENT WISE BREAKDOWN', 50, currentY);
      currentY += 18;

      doc.save();
      doc.rect(50, currentY, 495, 1.5).fill(textColor);
      doc.restore();
      currentY += 6;

      drawBillingTableRow(currentY, 'DATE', 'TREATMENT', 'DENTIST', 'TREAT (₹)', 'SURG (₹)', 'CONS (₹)', 'TOTAL (₹)', true);
      currentY += 15;

      doc.save();
      doc.rect(50, currentY, 495, 1).fill(secondaryColor);
      doc.restore();
      currentY += 6;

      let rowIndex = 0;
      treatments.forEach((t) => {
        let parsed = { name: t.description };
        try {
          if (t.description && t.description.startsWith('{')) {
            parsed = JSON.parse(t.description);
          }
        } catch(e) {}
        
        const name = parsed.name || parsed.description || t.description;
        const rowHeight = 15;

        if (currentY + rowHeight + 10 > pageBottom) {
          currentY = handleTablePageBreak();
        }

        // Zebra striping
        if (rowIndex % 2 === 1) {
          doc.save();
          doc.rect(50, currentY - 3, 495, rowHeight + 2).fill('#f8f9fa');
          doc.restore();
        }

        drawBillingTableRow(
          currentY,
          t.date,
          name.substring(0, 28) + (name.length > 28 ? '...' : ''),
          t.dentist,
          (t.treatment_fee || 0).toLocaleString('en-IN'),
          (t.surgery_fee || 0).toLocaleString('en-IN'),
          (t.consultation_fee || 0).toLocaleString('en-IN'),
          (t.cost || 0).toLocaleString('en-IN')
        );

        currentY += rowHeight + 2;
        rowIndex++;
      });

      // Table Footer summary row
      const summaryRowHeight = 22;
      if (currentY + summaryRowHeight + 10 > pageBottom) {
        currentY = handleTablePageBreak();
      }

      currentY += 5;
      doc.save();
      doc.rect(50, currentY, 495, 1.5).fill(textColor);
      doc.restore();
      currentY += 6;

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textColor);
      doc.text('TOTAL FEES', 50, currentY, { width: 170 });
      doc.text(totalTreatment.toLocaleString('en-IN'), 300, currentY, { width: 60, align: 'right' });
      doc.text(totalSurgery.toLocaleString('en-IN'), 360, currentY, { width: 60, align: 'right' });
      doc.text(totalConsultation.toLocaleString('en-IN'), 420, currentY, { width: 60, align: 'right' });
      doc.text(totalBilled.toLocaleString('en-IN'), 480, currentY, { width: 65, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
