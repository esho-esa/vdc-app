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

async function testMetadata() {
  console.log('--- DB metadata check ---');
  
  // 1. Try querying system/information_schema relations
  const endpoints = [
    'information_schema.tables',
    'information_schema.table_constraints',
    'pg_policies',
    'pg_indexes'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const { data, error } = await supabase.from(endpoint).select('*').limit(1);
      if (error) {
        console.log(`Endpoint '${endpoint}' error:`, error.message);
      } else {
        console.log(`Endpoint '${endpoint}' success! Fields:`, Object.keys(data[0] || {}).join(', '));
      }
    } catch (e) {
      console.log(`Endpoint '${endpoint}' threw:`, e.message);
    }
  }
}

testMetadata();
