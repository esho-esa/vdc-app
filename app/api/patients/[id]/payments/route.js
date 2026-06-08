import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const supabase = getDB();

    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('patient_id', id)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(payments || []);
  } catch (error) {
    console.error('[Payments:GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getDB();

    const amount = parseFloat(body.amount);
    const paymentDate = body.paymentDate || new Date().toISOString().split('T')[0];
    const paymentMethod = body.paymentMethod;
    const referenceNumber = body.referenceNumber || '';
    const notes = body.notes || '';

    // 1. Validation for Amount
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than zero.' },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required.' },
        { status: 400 }
      );
    }

    // Validate payment method options
    const validMethods = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cheque'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Invalid payment method. Allowed methods: ${validMethods.join(', ')}` },
        { status: 400 }
      );
    }

    // 2. Fetch all treatments to calculate total billed
    const { data: treatments, error: txError } = await supabase
      .from('treatments')
      .select('cost')
      .eq('patient_id', id);

    if (txError) throw txError;

    const totalBilled = (treatments || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);

    // 3. Fetch all current payments to calculate total paid
    const { data: existingPayments, error: payError } = await supabase
      .from('payments')
      .select('amount')
      .eq('patient_id', id);

    if (payError) throw payError;

    const totalPaid = (existingPayments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const pendingBalance = Math.max(0, totalBilled - totalPaid);

    // 4. Overpayment prevention check
    // Floating point precision buffer to prevent minor rounding checks (allow small delta)
    if (amount > pendingBalance + 0.01) {
      return NextResponse.json(
        { error: `Payment amount (₹${amount.toLocaleString('en-IN')}) cannot exceed the pending balance of ₹${pendingBalance.toLocaleString('en-IN')}.` },
        { status: 400 }
      );
    }

    const paymentId = `pay-${uuidv4().substring(0, 8)}`;

    const { data: inserted, error: insertError } = await supabase
      .from('payments')
      .insert([
        {
          id: paymentId,
          patient_id: id,
          payment_date: paymentDate,
          amount,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes
        }
      ])
      .select();

    if (insertError) throw insertError;

    // Log this activity
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Payment recorded: ₹${amount.toLocaleString('en-IN')} via ${paymentMethod}`,
        subtext: `Patient ID: ${id} | Ref: ${referenceNumber || 'None'}`,
        color: 'blue',
        patient_id: id
      }
    ]);

    return NextResponse.json(inserted[0]);
  } catch (error) {
    console.error('[Payments:POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
