import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (Boolean(configuredSupabaseUrl) !== Boolean(configuredSupabaseAnonKey)) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured together.',
  );
}

const supabaseUrl = configuredSupabaseUrl || `https://${projectId}.supabase.co`;
const supabaseAnonKey = configuredSupabaseAnonKey || publicAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server client for authenticated requests
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};
