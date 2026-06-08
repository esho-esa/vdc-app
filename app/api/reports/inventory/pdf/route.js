import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'Stock'; // 'Stock', 'Purchase', 'Consumption', 'Supplier'

    const supabase = getDB();

    // Fetch settings for clinic details
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()
      .then(res => res.error ? { data: null } : res);

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

    // Fetch necessary records from the new schemas
    const { data: items } = await supabase.from('inventory_items').select('*, suppliers(supplier_name)');
    const { data: transactions } = await supabase.from('stock_transactions').select('*, inventory_items(item_name, unit, category)').order('created_at', { ascending: false });
    const { data: purchaseOrders } = await supabase.from('purchase_orders').select('*, suppliers(supplier_name)');
    const { data: suppliers } = await supabase.from('suppliers').select('id, supplier_name');

    // Create PDF buffer on-the-fly
    const pdfBuffer = await new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape', bufferPages: true });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pages = doc.bufferedPageRange();
          for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            
            // Footer bottom accent band
            doc.save();
            doc.rect(0, 595.28 - 10, 841.89, 10).fill(primaryColor);
            doc.restore();

            // Page numbering
            doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
            doc.text(`Page ${i + 1} of ${pages.count}`, 50, 595.28 - 25, { width: 741, align: 'right' });
          }
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', (err) => reject(err));

        const pageBottom = 595.28 - 70;

        // Top Accent bar
        doc.save();
        doc.rect(0, 0, 841.89, 10).fill(primaryColor);
        doc.restore();

        // Clinic details
        doc.fontSize(16).font('Helvetica-Bold').fillColor(textColor)
          .text(clinicSettings.clinic_name, 50, 25);
        doc.fontSize(9).font('Helvetica').fillColor(secondaryColor)
          .text(`${reportType} Report - Inventory & Stock Module`, 50, 43);

        doc.fontSize(8.5).fillColor(textColor);
        doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, 550, 25, { width: 241, align: 'right' });

        // Separator
        doc.save();
        doc.rect(50, 58, 741, 1.5).fill(textColor);
        doc.restore();

        let currentY = 75;

        // ═══════════════════════════════════════════
        // RENDER STOCK REPORT
        // ═══════════════════════════════════════════
        if (reportType === 'Stock') {
          const drawHeader = () => {
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textColor);
            doc.text('ITEM NAME', 50, currentY, { width: 180 });
            doc.text('CATEGORY', 240, currentY, { width: 110 });
            doc.text('UNIT', 360, currentY, { width: 50 });
            doc.text('STOCK', 420, currentY, { width: 60, align: 'right' });
            doc.text('MIN LIMIT', 490, currentY, { width: 60, align: 'right' });
            doc.text('PURCHASE (₹)', 560, currentY, { width: 90, align: 'right' });
            doc.text('SELLING (₹)', 660, currentY, { width: 90, align: 'right' });

            currentY += 14;
            doc.save();
            doc.rect(50, currentY, 741, 1).fill(textColor);
            doc.restore();
            currentY += 5;
          };

          drawHeader();

          let rowIndex = 0;
          (items || []).forEach(item => {
            if (currentY + 18 > pageBottom) {
              doc.addPage();
              currentY = 30;
              drawHeader();
            }

            if (rowIndex % 2 === 1) {
              doc.save();
              doc.rect(50, currentY - 3, 741, 16).fill('#f8f9fa');
              doc.restore();
            }

            doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
            doc.text(item.item_name, 50, currentY, { width: 180 });
            doc.text(item.category, 240, currentY, { width: 110 });
            doc.text(item.unit, 360, currentY, { width: 50 });

            // Highlight low stock in red
            const isLow = item.current_stock <= item.minimum_stock;
            doc.font(isLow ? 'Helvetica-Bold' : 'Helvetica')
               .fillColor(isLow ? '#ff3b30' : textColor)
               .text(item.current_stock.toString(), 420, currentY, { width: 60, align: 'right' });

            doc.font('Helvetica').fillColor(textColor);
            doc.text(item.minimum_stock.toString(), 490, currentY, { width: 60, align: 'right' });
            doc.text(parseFloat(item.purchase_price).toFixed(2), 560, currentY, { width: 90, align: 'right' });
            doc.text(item.selling_price ? parseFloat(item.selling_price).toFixed(2) : '-', 660, currentY, { width: 90, align: 'right' });

            currentY += 15;
            rowIndex++;
          });
        }

        // ═══════════════════════════════════════════
        // RENDER PURCHASE REPORT
        // ═══════════════════════════════════════════
        else if (reportType === 'Purchase') {
          const drawHeader = () => {
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textColor);
            doc.text('DATE', 50, currentY, { width: 90 });
            doc.text('ITEM NAME', 150, currentY, { width: 200 });
            doc.text('QUANTITY', 360, currentY, { width: 80, align: 'right' });
            doc.text('UNIT', 450, currentY, { width: 60 });
            doc.text('REASON / NOTES', 520, currentY, { width: 270 });

            currentY += 14;
            doc.save();
            doc.rect(50, currentY, 741, 1).fill(textColor);
            doc.restore();
            currentY += 5;
          };

          drawHeader();

          const purchaseTx = (transactions || []).filter(tx => tx.transaction_type === 'IN');
          let rowIndex = 0;
          purchaseTx.forEach(tx => {
            if (currentY + 18 > pageBottom) {
              doc.addPage();
              currentY = 30;
              drawHeader();
            }

            if (rowIndex % 2 === 1) {
              doc.save();
              doc.rect(50, currentY - 3, 741, 16).fill('#f8f9fa');
              doc.restore();
            }

            doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
            doc.text(tx.created_at.split('T')[0], 50, currentY, { width: 90 });
            doc.text(tx.inventory_items?.item_name || 'Deleted Item', 150, currentY, { width: 200 });
            doc.text(`+${tx.quantity}`, 360, currentY, { width: 80, align: 'right', color: '#34c759' });
            doc.text(tx.inventory_items?.unit || '-', 450, currentY, { width: 60 });
            doc.text(tx.reason || 'Purchased stock receipt', 520, currentY, { width: 270 });

            currentY += 15;
            rowIndex++;
          });
        }

        // ═══════════════════════════════════════════
        // RENDER CONSUMPTION REPORT
        // ═══════════════════════════════════════════
        else if (reportType === 'Consumption') {
          const drawHeader = () => {
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textColor);
            doc.text('DATE', 50, currentY, { width: 90 });
            doc.text('ITEM NAME', 150, currentY, { width: 200 });
            doc.text('QUANTITY DEDUCTED', 360, currentY, { width: 120, align: 'right' });
            doc.text('UNIT', 490, currentY, { width: 60 });
            doc.text('TREATMENT REFERENCE / REASON', 560, currentY, { width: 230 });

            currentY += 14;
            doc.save();
            doc.rect(50, currentY, 741, 1).fill(textColor);
            doc.restore();
            currentY += 5;
          };

          drawHeader();

          const consumptionTx = (transactions || []).filter(tx => tx.transaction_type === 'OUT');
          let rowIndex = 0;
          consumptionTx.forEach(tx => {
            if (currentY + 18 > pageBottom) {
              doc.addPage();
              currentY = 30;
              drawHeader();
            }

            if (rowIndex % 2 === 1) {
              doc.save();
              doc.rect(50, currentY - 3, 741, 16).fill('#f8f9fa');
              doc.restore();
            }

            doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
            doc.text(tx.created_at.split('T')[0], 50, currentY, { width: 90 });
            doc.text(tx.inventory_items?.item_name || 'Deleted Item', 150, currentY, { width: 200 });
            doc.text(`${tx.quantity}`, 360, currentY, { width: 120, align: 'right', color: '#ff3b30' });
            doc.text(tx.inventory_items?.unit || '-', 490, currentY, { width: 60 });
            doc.text(tx.reason || 'Procedure consumption', 560, currentY, { width: 230 });

            currentY += 15;
            rowIndex++;
          });
        }

        // ═══════════════════════════════════════════
        // RENDER SUPPLIER REPORT
        // ═══════════════════════════════════════════
        else if (reportType === 'Supplier') {
          const drawHeader = () => {
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(textColor);
            doc.text('SUPPLIER NAME', 50, currentY, { width: 250 });
            doc.text('TOTAL POS ISSUED', 310, currentY, { width: 120, align: 'right' });
            doc.text('ITEMS SUPPLIED TYPE COUNT', 450, currentY, { width: 160, align: 'right' });
            doc.text('TOTAL VALUE RECEIVED (₹)', 630, currentY, { width: 160, align: 'right' });

            currentY += 14;
            doc.save();
            doc.rect(50, currentY, 741, 1).fill(textColor);
            doc.restore();
            currentY += 5;
          };

          drawHeader();

          // Compile values
          const supplierSpends = {};
          (suppliers || []).forEach(s => {
            supplierSpends[s.id] = { name: s.supplier_name, totalValue: 0, poCount: 0, itemCount: 0 };
          });
          (items || []).forEach(i => {
            if (i.supplier_id && supplierSpends[i.supplier_id]) supplierSpends[i.supplier_id].itemCount++;
          });
          (purchaseOrders || []).forEach(po => {
            if (po.supplier_id && supplierSpends[po.supplier_id]) {
              supplierSpends[po.supplier_id].poCount++;
              if (po.status === 'Received') {
                supplierSpends[po.supplier_id].totalValue += parseFloat(po.total_amount) || 0;
              }
            }
          });

          let rowIndex = 0;
          Object.values(supplierSpends).forEach(sup => {
            if (currentY + 18 > pageBottom) {
              doc.addPage();
              currentY = 30;
              drawHeader();
            }

            if (rowIndex % 2 === 1) {
              doc.save();
              doc.rect(50, currentY - 3, 741, 16).fill('#f8f9fa');
              doc.restore();
            }

            doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
            doc.text(sup.name, 50, currentY, { width: 250 });
            doc.text(sup.poCount.toString(), 310, currentY, { width: 120, align: 'right' });
            doc.text(sup.itemCount.toString(), 450, currentY, { width: 160, align: 'right' });
            doc.text(sup.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 630, currentY, { width: 160, align: 'right' });

            currentY += 15;
            rowIndex++;
          });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

    const filename = `inventory_${reportType.toLowerCase()}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('[InventoryReportsPDF] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
