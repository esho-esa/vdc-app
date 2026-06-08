import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import PDFDocument from 'pdfkit';

// Helper to generate PDF in memory and return as Buffer
function generateProfitPDF(data, settings, rangeStr) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 }
    });

    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));

    const accentColor = settings?.accent_color || '#007aff';
    const clinicName = settings?.clinic_name || 'Victoria Dental Care';
    const clinicTagline = settings?.tagline || 'Clinic Management System';
    const clinicAddress = settings?.address || 'Victoria St, London';
    const clinicPhone = settings?.phone || '+91 98765 43210';
    const clinicEmail = settings?.email || 'contact@victoriadental.com';

    // 1. Header Section
    doc.fillColor('#1c1c1e').fontSize(20).font('Helvetica-Bold').text(clinicName, { align: 'left' });
    doc.fillColor('#8e8e93').fontSize(9).font('Helvetica').text(clinicTagline, { align: 'left' });
    
    doc.moveUp(1.5);
    doc.fillColor('#8e8e93').fontSize(8).text(clinicAddress, { align: 'right' });
    doc.text(`Phone: ${clinicPhone}  |  Email: ${clinicEmail}`, { align: 'right' });

    doc.moveDown(1.5);
    doc.strokeColor('#e5e5ea').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    
    // 2. Title Section
    doc.moveDown(1.5);
    doc.fillColor(accentColor).fontSize(14).font('Helvetica-Bold').text('FINANCIAL PROFIT & LOSS REPORT');
    doc.fillColor('#8e8e93').fontSize(9).font('Helvetica').text(`Reporting Period: ${rangeStr}  |  Generated on: ${new Date().toLocaleDateString()}`, { align: 'left' });

    doc.moveDown(1.5);

    // 3. Summary metrics cards (Draw a grid)
    const cardWidth = 160;
    const cardHeight = 50;
    const padding = 10;
    const startX = 40;
    let startY = doc.y;

    const drawCard = (x, y, title, val, color) => {
      doc.rect(x, y, cardWidth, cardHeight).fillColor('#f2f2f7').fill();
      doc.fillColor('#8e8e93').fontSize(8).font('Helvetica-Bold').text(title.toUpperCase(), x + padding, y + padding);
      doc.fillColor(color || '#1c1c1e').fontSize(14).font('Helvetica-Bold').text(val, x + padding, y + padding + 15);
    };

    drawCard(startX, startY, 'Collected Revenue', `₹${data.totalRevenue.toLocaleString()}`, '#34c759');
    drawCard(startX + cardWidth + 15, startY, 'Total Expenses', `₹${data.totalExpenses.toLocaleString()}`, '#ff3b30');
    drawCard(startX + (cardWidth * 2) + 30, startY, 'Net Profit (Cash)', `₹${data.netProfit.toLocaleString()}`, accentColor);

    doc.moveDown(3.5);
    startY = doc.y;
    drawCard(startX, startY, 'Profit Margin', `${data.profitMargin.toFixed(1)}%`, '#5856d6');
    drawCard(startX + cardWidth + 15, startY, 'Billed (Accrual) Revenue', `₹${data.accrualRevenue.toLocaleString()}`, '#5ac8fa');
    drawCard(startX + (cardWidth * 2) + 30, startY, 'Outstanding Balance', `₹${data.outstandingReceivables.toLocaleString()}`, '#ff9f0a');

    // 4. Expense Categories Breakdown Table
    doc.moveDown(4.5);
    doc.fillColor('#1c1c1e').fontSize(11).font('Helvetica-Bold').text('EXPENSE CATEGORY BREAKDOWN');
    doc.moveDown(0.5);

    let tableY = doc.y;
    doc.fillColor('#8e8e93').fontSize(8).font('Helvetica-Bold');
    doc.text('Category', 45, tableY);
    doc.text('Monthly Budget', 200, tableY, { width: 90, align: 'right' });
    doc.text('Total Spent', 310, tableY, { width: 90, align: 'right' });
    doc.text('% of Expenses', 420, tableY, { width: 90, align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#e5e5ea').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9).fillColor('#1c1c1e');
    data.categoriesBreakdown.forEach(cat => {
      const budgetText = cat.budget > 0 ? `₹${cat.budget.toLocaleString()}` : 'No limit';
      tableY = doc.y;
      
      doc.text(cat.name, 45, tableY);
      doc.text(budgetText, 200, tableY, { width: 90, align: 'right' });
      doc.text(`₹${cat.amount.toLocaleString()}`, 310, tableY, { width: 90, align: 'right' });
      doc.text(`${cat.percentage.toFixed(1)}%`, 420, tableY, { width: 90, align: 'right' });
      
      doc.moveDown(0.8);
      doc.strokeColor('#f2f2f7').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);
    });

    // 5. Recent Expenses List
    doc.moveDown(1.5);
    doc.fillColor('#1c1c1e').fontSize(11).font('Helvetica-Bold').text('RECENT EXPENSE TRANSACTIONS');
    doc.moveDown(0.5);

    tableY = doc.y;
    doc.fillColor('#8e8e93').fontSize(8).font('Helvetica-Bold');
    doc.text('Date', 45, tableY);
    doc.text('Vendor', 110, tableY);
    doc.text('Category', 210, tableY);
    doc.text('Payment Method', 310, tableY);
    doc.text('Amount', 450, tableY, { width: 90, align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#e5e5ea').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(8).fillColor('#1c1c1e');
    data.recentExpenses.slice(0, 10).forEach(exp => {
      tableY = doc.y;
      const amountStr = `₹${parseFloat(exp.amount).toLocaleString()}`;
      
      doc.text(exp.expense_date, 45, tableY);
      doc.text(exp.vendor_name || 'N/A', 110, tableY, { width: 90, ellipsis: true });
      doc.text(exp.expense_categories?.name || 'N/A', 210, tableY);
      doc.text(exp.payment_method, 310, tableY);
      doc.text(amountStr, 450, tableY, { width: 90, align: 'right' });
      
      doc.moveDown(0.8);
      doc.strokeColor('#f2f2f7').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);
    });

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#8e8e93').fontSize(7).text(
        `Victoria Dental Care | Financial Statements Report | Page ${i + 1} of ${pages.count}`,
        40,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 80 }
      );
    }

    doc.end();
  });
}

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permitted = await hasPermission(user.role, 'expenses', 'view');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month'; // 'day', 'week', 'month', 'year'

    const today = new Date().toISOString().split('T')[0];
    let startDate = '';
    let rangeStr = 'This Month';

    const getPastDateStr = (days) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    if (range === 'day') {
      startDate = today;
      rangeStr = 'Today';
    } else if (range === 'week') {
      startDate = getPastDateStr(7);
      rangeStr = 'Past 7 Days';
    } else if (range === 'month') {
      startDate = getPastDateStr(30);
      rangeStr = 'Past 30 Days';
    } else if (range === 'year') {
      startDate = getPastDateStr(365);
      rangeStr = 'Past 365 Days';
    }

    const supabase = getDB();

    // Parallel fetch
    const [
      { data: prescriptions },
      { data: treatments },
      { data: payments },
      { data: expenses },
      { data: categories },
      { data: settings }
    ] = await Promise.all([
      supabase.from('prescriptions').select('total_amount').gte('date', startDate),
      supabase.from('treatments').select('cost').gte('date', startDate),
      supabase.from('payments').select('amount').gte('payment_date', startDate),
      supabase.from('expenses').select('*, expense_categories(name, color, budget)').gte('expense_date', startDate),
      supabase.from('expense_categories').select('*'),
      supabase.from('settings').select('*').limit(1).single().then(res => res.error ? { data: undefined } : res)
    ]);

    // Revenue calculations
    const rxRev = (prescriptions || []).reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
    const txRev = (treatments || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
    const totalBilled = rxRev + txRev;

    const totalCollected = (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalExpenses = (expenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const netProfit = totalCollected - totalExpenses;
    const profitMargin = totalCollected > 0 ? (netProfit / totalCollected) * 100 : 0;
    const outstandingReceivables = Math.max(0, totalBilled - totalCollected);

    // Categories breakdown list
    const categoryTotals = {};
    (expenses || []).forEach(e => {
      categoryTotals[e.category_id] = (categoryTotals[e.category_id] || 0) + parseFloat(e.amount);
    });

    const categoriesBreakdown = (categories || []).map(cat => {
      const amount = categoryTotals[cat.id] || 0;
      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
      return {
        name: cat.name,
        budget: parseFloat(cat.budget) || 0,
        amount,
        percentage
      };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    const dataPayload = {
      totalRevenue: totalCollected,
      totalExpenses,
      netProfit,
      profitMargin,
      outstandingReceivables,
      accrualRevenue: totalBilled,
      categoriesBreakdown,
      recentExpenses: expenses || []
    };

    const pdfBuffer = await generateProfitPDF(dataPayload, settings, rangeStr);
    const filename = `profit-report-${range}-${today}.pdf`;

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
    console.error('[Profit Report PDF API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
