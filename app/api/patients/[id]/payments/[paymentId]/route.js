import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(request, { params }) {
  try {
    const { id, paymentId } = await params;
    const body = await request.json();
    const supabase = getDB();

    const amount = parseFloat(body.amount);
    const paymentDate = body.paymentDate;
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

    const validMethods = ['Cash', 'UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cheque', 'Insurance', 'Other'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Invalid payment method. Allowed methods: ${validMethods.join(', ')}` },
        { status: 400 }
      );
    }

    // 2. Fetch the current payment details to get original amount
    const { data: currentPayment, error: currentPayError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (currentPayError || !currentPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // 3. Fetch treatments to calculate total billed
    const { data: treatments, error: txError } = await supabase
      .from('treatments')
      .select('cost')
      .eq('patient_id', id);

    if (txError) throw txError;

    const totalBilled = (treatments || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);

    // 4. Fetch all payments to calculate other paid amount
    const { data: existingPayments, error: payError } = await supabase
      .from('payments')
      .select('id, amount')
      .eq('patient_id', id);

    if (payError) throw payError;

    // Sum all payments except the one being edited
    const otherPaid = (existingPayments || [])
      .filter(p => p.id !== paymentId)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const pendingBalance = Math.max(0, totalBilled - otherPaid);

    // 5. Overpayment prevention check
    if (amount > pendingBalance + 0.01) {
      return NextResponse.json(
        { error: `Payment amount (₹${amount.toLocaleString('en-IN')}) cannot exceed the pending balance of ₹${pendingBalance.toLocaleString('en-IN')}.` },
        { status: 400 }
      );
    }

    // 6. Perform the update
    const { data: updated, error: updateError } = await supabase
      .from('payments')
      .update({
        payment_date: paymentDate,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select();

    if (updateError) throw updateError;

    // Log the update activity
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Payment updated: ₹${currentPayment.amount} ➔ ₹${amount} (${paymentMethod})`,
        subtext: `Patient ID: ${id} | Ref: ${referenceNumber || 'None'}`,
        color: 'orange',
        patient_id: id
      }
    ]);

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('[Payments:PUT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id, paymentId } = await params;
    const supabase = getDB();

    // 1. Fetch payment to log details
    const { data: currentPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !currentPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // 2. Perform the deletion
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) throw deleteError;

    // Log the deletion activity
    await supabase.from('activity_log').insert([
      {
        id: `act-${uuidv4().substring(0, 8)}`,
        text: `Payment deleted: ₹${parseFloat(currentPayment.amount).toLocaleString('en-IN')}`,
        subtext: `Was paid via ${currentPayment.payment_method} on ${currentPayment.payment_date}`,
        color: 'red',
        patient_id: id
      }
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Payments:DELETE] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
