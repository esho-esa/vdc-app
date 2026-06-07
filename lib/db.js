import { createClient } from "@supabase/supabase-js";

let supabase;

export function getDB() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn('[DB] Supabase environment variables are missing. getDB() returning null.');
      return null;
    }
    supabase = createClient(url, key);
  }
  return supabase;
}