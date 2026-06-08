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

async function listTables() {
  console.log('Querying schema info...');
  
  // We can query schema details by executing an RPC or querying postgrest.
  // Since we might not have a direct query for pg_catalog over postgrest, 
  // let's try querying standard tables to see if they exist.
  const tables = [
    'staff', 'staff_members', 'roles', 'permissions', 'staff_activity_logs', 
    'activity_log', 'patients', 'appointments', 'treatments', 'billing', 'inventory'
  ];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}' status: Error/Not found (${error.message})`);
    } else {
      console.log(`Table '${table}' status: EXISTS (Columns: ${data.length > 0 ? Object.keys(data[0]).join(', ') : 'unknown/empty'})`);
    }
  }
}

listTables();
