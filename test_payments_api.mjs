import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env variables
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    process.env[match[1]] = (match[2] || '').replace(/^"|"$/g, '');
  }
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const SITE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('=== PAYMENT SYSTEM VERIFICATION ===');
  
  // 1. Fetch a test patient
  const { data: patients, error: patientErr } = await supabase.from('patients').select('*').eq('is_deleted', 0).limit(1);
  if (patientErr || !patients?.[0]) {
    console.error('Error fetching patient or no active patient found:', patientErr);
    return;
  }
  
  const testPatient = patients[0];
  console.log(`Using test patient: ${testPatient.name} (ID: ${testPatient.id})`);

  // Calculate current totals
  const { data: treatments } = await supabase.from('treatments').select('cost').eq('patient_id', testPatient.id);
  const totalBilled = (treatments || []).reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
  
  const { data: payments } = await supabase.from('payments').select('amount').eq('patient_id', testPatient.id);
  const totalPaid = (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const currentPending = Math.max(0, totalBilled - totalPaid);
  
  console.log(`Current stats - Billed: ₹${totalBilled}, Paid: ₹${totalPaid}, Pending Balance: ₹${currentPending}`);

  // Test Case A: Validate zero amount block
  console.log('\nTest A: Validate zero amount block...');
  try {
    const res = await fetch(`${SITE_URL}/api/patients/${testPatient.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 0, paymentMethod: 'UPI' })
    });
    const result = await res.json();
    if (res.status === 400 && result.error.includes('greater than zero')) {
      console.log('✅ Passed: Zero payment rejected successfully with message:', result.error);
    } else {
      console.error('❌ Failed: Expected 400 validation error, got:', res.status, result);
    }
  } catch (e) {
    console.log('Note: Local dev server must be running at http://localhost:3000 to execute API calls.');
  }

  // Test Case B: Validate negative amount block
  console.log('\nTest B: Validate negative amount block...');
  try {
    const res = await fetch(`${SITE_URL}/api/patients/${testPatient.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -150, paymentMethod: 'UPI' })
    });
    const result = await res.json();
    if (res.status === 400 && result.error.includes('greater than zero')) {
      console.log('✅ Passed: Negative payment rejected successfully with message:', result.error);
    } else {
      console.error('❌ Failed: Expected 400 validation error, got:', res.status, result);
    }
  } catch (e) { }

  // Test Case C: Validate overpayment block
  console.log('\nTest C: Validate overpayment block...');
  try {
    const overpayAmt = currentPending + 1000;
    const res = await fetch(`${SITE_URL}/api/patients/${testPatient.id}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: overpayAmt, paymentMethod: 'UPI' })
    });
    const result = await res.json();
    if (res.status === 400 && result.error.includes('cannot exceed the pending balance')) {
      console.log('✅ Passed: Overpayment rejected successfully with message:', result.error);
    } else {
      console.error('❌ Failed: Expected 400 overpayment check, got:', res.status, result);
    }
  } catch (e) { }

  console.log('\n=== Testing completed. Make sure the local next dev server is running and migration table created on Supabase. ===');
}

runTest();
