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

async function runMigration() {
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260608000004_inventory_management.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Attempting to apply migration via RPC...');
  const rpcNames = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
  
  for (const name of rpcNames) {
    try {
      console.log(`Trying RPC: ${name}...`);
      const { data, error } = await supabase.rpc(name, { sql_query: sql, query: sql, sql: sql });
      if (!error) {
        console.log(`✅ Success applying migration via RPC: ${name}!`);
        console.log('Result:', data);
        return;
      } else {
        console.log(`Failed RPC ${name}:`, error.message);
      }
    } catch (e) {
      console.log(`Error calling RPC ${name}:`, e.message);
    }
  }
  
  console.log('Could not apply migration. Supabase RPC for raw SQL execution is not available or unauthorized for anon role.');
}

runMigration();
