import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase client is missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    /** Apply auth tokens from URL when present (e.g. recovery links) */
    detectSessionInUrl: true,
  },
});

/**
 * Same project/anon key, but no persisted session. Use for **public** reads (e.g. `teams`)
 * so a broken/expired admin session on the main client cannot block or delay PostgREST
 * (symptom: empty team grid + no `teams` request in Network).
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

