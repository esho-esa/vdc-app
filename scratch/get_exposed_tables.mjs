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

async function fetchSwagger() {
  console.log('Fetching Postgrest schema definition with headers...');
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  if (!res.ok) {
    console.error('Failed to fetch:', res.status, res.statusText);
    return;
  }
  const data = await res.json();
  console.log('Exposed Tables/Paths in Postgrest:');
  const paths = Object.keys(data.paths || {});
  paths.forEach(p => {
    if (p.startsWith('/')) {
      console.log('  ', p);
    }
  });
}

fetchSwagger();
