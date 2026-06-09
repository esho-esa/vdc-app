import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key) acc[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRevenue() {
  const res = await supabase
    .from('payments')
    .select('id, payment_date, amount, payment_method, reference_number, patient_id, patients(name)')
    .order('payment_date', { ascending: false });
  console.log('Payments query result:', JSON.stringify(res, null, 2));

  const res2 = await supabase
    .from('payments')
    .select('*')
    .limit(3);
  console.log('Payments raw result:', JSON.stringify(res2, null, 2));
}

testRevenue();
