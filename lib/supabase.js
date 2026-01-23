import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a singleton instance
let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
} else {
  if (typeof window === 'undefined') {
    // Server-side: create new instance
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    // Client-side: use existing or create new
    if (!window.__supabase) {
      window.__supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    supabase = window.__supabase;
  }
}

export { supabase };