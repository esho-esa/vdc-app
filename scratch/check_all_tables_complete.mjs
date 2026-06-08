import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing env variables in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = [
  // Staff & Roles
  'roles',
  'permissions',
  'staff_members',
  'staff_activity_logs',
  // Expense Management
  'expense_categories',
  'expenses',
  'expense_attachments',
  // Base modules
  'patients',
  'appointments',
  'treatments',
  'payments',
  // Clinical Records
  'patient_photos',
  'patient_xrays',
  'patient_files',
  // Followups
  'follow_ups',
  'reminder_logs',
  // Inventory
  'suppliers',
  'inventory_items',
  'inventory_transactions',
  'purchase_orders'
];

async function checkAll() {
  console.log('=== VERIFYING ALL SCHEMA TABLES ===');
  let missing = 0;
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table '${table}': ERROR (${error.message})`);
      missing++;
    } else {
      const cols = data && data.length > 0 ? Object.keys(data[0]) : ['(empty table)'];
      console.log(`✅ Table '${table}': EXISTS. Sample fields: ${cols.join(', ')}`);
    }
  }
  console.log(`\nVerification complete. Missing tables count: ${missing}`);
}

checkAll();
