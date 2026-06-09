import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key) acc[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function populateFollowups() {
  console.log('Fetching treatments...');
  const { data: treatments, error: txError } = await supabase.from('treatments').select('*');
  if (txError) { console.error(txError); return; }

  const { data: existingFups, error: fError } = await supabase.from('follow_ups').select('treatment_id');
  if (fError) { console.error(fError); return; }

  const existingTxIds = new Set(existingFups.filter(f => f.treatment_id).map(f => f.treatment_id));
  
  let inserted = 0;
  for (const tx of treatments) {
    if (existingTxIds.has(tx.id)) continue;
    
    // We auto-generate a follow-up if procedure contains 'Extraction' or 'Root Canal'
    const proc = (tx.procedure || '').toLowerCase();
    if (proc.includes('extraction') || proc.includes('root canal') || proc.includes('rct') || proc.includes('implant')) {
      const type = proc.includes('extraction') ? 'Post-Extraction Checkup' 
                 : proc.includes('implant') ? 'Implant Integration Check'
                 : 'RCT Follow-up';
      
      const txDate = new Date(tx.date);
      txDate.setDate(txDate.getDate() + 7); // 7 days later
      const fDateStr = txDate.toISOString().split('T')[0];

      const { error: insErr } = await supabase.from('follow_ups').insert([{
        id: `fup-${uuidv4().substring(0, 8)}`,
        patient_id: tx.patient_id,
        treatment_id: tx.id,
        followup_date: fDateStr,
        followup_type: type,
        notes: 'Auto-generated from treatment history.',
        status: (txDate < new Date()) ? 'Missed' : 'Scheduled' // If in past, it's missed
      }]);
      
      if (insErr) {
        console.error(`Failed to insert for tx ${tx.id}:`, insErr);
      } else {
        inserted++;
      }
    }
  }
  console.log(`Successfully backfilled ${inserted} follow-up records.`);
}

populateFollowups();
