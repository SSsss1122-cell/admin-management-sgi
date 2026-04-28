// C:\Projects\SGI BUS\admin-management-sgi\lib\supabase.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Create a singleton instance for client-side use
let supabase;

if (typeof window === 'undefined') {
  // Server-side: create new instance with anon key
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  // Client-side: use existing or create new
  if (!window.__supabase) {
    window.__supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  supabase = window.__supabase;
}

// Create admin client with service role key for API routes
const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Log warning if service role key is missing
if (!supabaseServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will not work.');
}

export { supabase, supabaseAdmin };