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

/**
 * Edge Functions running in Docker often sign URLs with the internal Kong host
 * (`http://supabase-kong:8000/...`). Browsers cannot resolve that — rewrite to
 * the public VITE_SUPABASE_URL origin when needed.
 */
export function rewriteBrowserStorageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'supabase-kong') return url;
    const publicOrigin = new URL(supabaseUrl).origin;
    return `${publicOrigin}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

// Server client for authenticated requests
export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};
