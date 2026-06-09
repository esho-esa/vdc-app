import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key) acc[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testAll() {
  const tables = ['payments', 'expenses', 'expense_categories', 'suppliers', 'inventory_items', 'stock_transactions', 'purchase_orders', 'patient_photos', 'patient_xrays', 'patient_files', 'roles', 'permissions', 'staff_members', 'staff_activity_logs'];
  
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    if (error) {
      console.log(`[FAILED] ${t} - Error: ${error.message}`);
    } else {
      console.log(`[OK] ${t} exists.`);
    }
  }
}
testAll();
