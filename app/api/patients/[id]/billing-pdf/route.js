import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { generateBillingReportPDF } from '@/lib/pdf';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    // Parse query params for date filtering & dentist filtering
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    const dentist = url.searchParams.get('dentist') || '';
    const download = url.searchParams.get('download') === 'true';

    const supabase = getDB();

    // Fetch patient data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Query treatments
    let query = supabase
      .from('treatments')
      .select('*')
      .eq('patient_id', id);

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (dentist) query = query.eq('dentist', dentist);

    const { data: treatments, error: txError } = await query.order('date', { ascending: false });

    if (txError) throw txError;

    // Fetch payments (with same date filters if applied)
    let payQuery = supabase
      .from('payments')
      .select('*')
      .eq('patient_id', id);
    
    if (startDate) payQuery = payQuery.gte('payment_date', startDate);
    if (endDate) payQuery = payQuery.lte('payment_date', endDate);

    const { data: payments } = await payQuery;

    // Calculate billing summary metrics
    const totalTxBilled = (treatments || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
    const totalPaymentsPaid = (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const outstandingBalance = Math.max(0, totalTxBilled - totalPaymentsPaid);

    // Fetch clinic settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    // Generate PDF
    const pdfBuffer = await generateBillingReportPDF({
      patient,
      treatments: treatments || [],
      totalPaid: totalPaymentsPaid,
      outstandingBalance: outstandingBalance,
      startDate,
      endDate,
      dentist,
      settings: settings || undefined
    });

    const filename = `billing-report-${patient.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${id.substring(0, 8)}.pdf`;
    const disposition = download
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=60',
      },
    });

  } catch (error) {
    console.error('[BillingPDF] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
