import { createClient } from "@supabase/supabase-js";

let supabase;

export function getDB() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log(`[DB] Initializing Supabase client. NEXT_PUBLIC_SUPABASE_URL: ${url ? 'LOADED' : 'MISSING'}, NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? 'LOADED' : 'MISSING'}`);
    
    supabase = createClient(url || '', key || '');
  }
  return supabase;
}