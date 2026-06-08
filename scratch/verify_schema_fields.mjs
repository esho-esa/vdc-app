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

async function checkSchema() {
  console.log('--- DB AUDIT SCHEMA VERIFICATION ---');
  
  const tables = [
    'roles',
    'permissions',
    'staff_members',
    'staff_activity_logs',
    'expense_categories',
    'expenses',
    'expense_attachments'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      if (error.message.includes('Could not find the table')) {
        console.log(`Table '${table}': NOT APPLIED`);
      } else {
        console.log(`Table '${table}': ERROR (${error.message})`);
      }
    } else {
      console.log(`Table '${table}': FULLY APPLIED (Columns: ${data.length > 0 ? Object.keys(data[0]).join(', ') : 'Existed but empty'})`);
    }
  }
}

checkSchema();
