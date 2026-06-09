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

async function checkCols() {
  const { data, error } = await supabase.rpc('get_columns', { table_name: 'treatments' });
  if (error) {
    // try fallback: fetch one row and list its keys
    const { data: rows } = await supabase.from('treatments').select('*').limit(1);
    if (rows && rows.length > 0) {
      console.log('Treatments columns:', Object.keys(rows[0]));
    } else {
      console.log('No treatments found.');
    }
  } else {
    console.log('Treatments columns:', data);
  }
}

checkCols();
