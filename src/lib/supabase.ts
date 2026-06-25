import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (isConfigured && typeof window !== 'undefined') {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
}

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase client not initialized. Ensure environment variables are set.'
    );
  }
  return supabase;
}

export { supabase, getSupabaseClient, isConfigured };
