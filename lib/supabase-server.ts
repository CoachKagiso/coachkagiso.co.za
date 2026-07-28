import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl } from '@/lib/env';

export function createSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');

  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
