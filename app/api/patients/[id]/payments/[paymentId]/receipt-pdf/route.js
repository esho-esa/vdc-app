import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { generatePaymentReceiptPDF } from '@/lib/pdf';

export async function GET(request, { params }) {
  try {
    const { id, paymentId } = await params;
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

    // 2. Fetch the payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // 3. Fetch treatments to calculate total billed
    const { data: treatments, error: txError } = await supabase
      .from('treatments')
      .select('cost')
      .eq('patient_id', id);

    if (txError) throw txError;
    const totalBilled = (treatments || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);

    // 4. Fetch all payments to calculate remaining balance *after* this payment point
    // Wait, the remaining balance should be the overall outstanding balance right now!
    const { data: allPayments, error: payError } = await supabase
      .from('payments')
      .select('amount')
      .eq('patient_id', id);

    if (payError) throw payError;
    const totalPaid = (allPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const remainingBalance = Math.max(0, totalBilled - totalPaid);

    // 5. Fetch clinic settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    // 6. Generate Receipt PDF
    const pdfBuffer = await generatePaymentReceiptPDF({
      payment,
      patient,
      remainingBalance,
      settings: settings || undefined
    });

    const filename = `receipt-${paymentId.substring(0, 8)}.pdf`;
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=60',
      },
    });

  } catch (error) {
    console.error('[ReceiptPDF] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
