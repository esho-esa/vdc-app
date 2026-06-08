import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { generatePatientStatementPDF } from '@/lib/pdf';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = getDB();

    // 1. Fetch patient details
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // 2. Fetch treatments
    const { data: treatments, error: txError } = await supabase
      .from('treatments')
      .select('*')
      .eq('patient_id', id);

    if (txError) throw txError;

    // 3. Fetch payments
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('patient_id', id)
      .then(res => res.error ? { data: [] } : res);

    if (payError) throw payError;

    // 4. Construct chronological ledger
    const ledgerItems = [];

    (treatments || []).forEach((t) => {
      let treatmentName = t.description;
      try {
        if (t.description && t.description.startsWith('{')) {
          const parsed = JSON.parse(t.description);
          treatmentName = parsed.name || parsed.description;
        }
      } catch (e) { }

      ledgerItems.push({
        date: t.date,
        id: t.id,
        description: treatmentName,
        type: 'Charge',
        amount: parseFloat(t.cost) || 0
      });
    });

    (payments || []).forEach((p) => {
      ledgerItems.push({
        date: p.payment_date,
        id: p.id,
        description: `Paid via ${p.payment_method}${p.reference_number ? ' (Ref: ' + p.reference_number + ')' : ''}`,
        type: 'Credit',
        amount: parseFloat(p.amount) || 0
      });
    });

    // Sort chronologically (date ascending, charges before credits)
    ledgerItems.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      
      if (a.type !== b.type) {
        return a.type === 'Charge' ? -1 : 1; // charge (debit) before credit
      }
      return a.id.localeCompare(b.id);
    });

    // Calculate running balance
    let runningBalance = 0;
    ledgerItems.forEach((item) => {
      if (item.type === 'Charge') {
        runningBalance += item.amount;
      } else {
        runningBalance -= item.amount;
      }
      item.balance = runningBalance;
    });

    // 5. Fetch settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    // 6. Generate PDF Statement
    const pdfBuffer = await generatePatientStatementPDF({
      patient,
      ledger: ledgerItems,
      settings: settings || undefined
    });

    const filename = `statement-${patient.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${id.substring(0, 8)}.pdf`;
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
    console.error('[StatementPDF] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
