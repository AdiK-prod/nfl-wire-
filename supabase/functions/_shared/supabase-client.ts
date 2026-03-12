import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !serviceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for Edge Functions.');
}

export const supabase = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
  },
});

