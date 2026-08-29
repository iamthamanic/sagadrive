/**
 * Shared local-admin identity helpers for the local-only SagaDrive stack.
 *
 * The `admin` shortcut maps to the seeded GoTrue user (LOCAL_ADMIN_EMAIL) so
 * the app holds a real JWT and RLS sees the `authenticated` role. The
 * app-level fallback user (LOCAL_ADMIN_USER_ID) is only used when the local
 * stack is unreachable; services must resolve the owner id via
 * `supabase.auth.getUser()` first and may fall back to the constant only for
 * offline UI state.
 * Location: src/lib/localAdmin.ts.
 */

export const LOCAL_ADMIN_STORAGE_KEY = 'sagadrive-local-admin-session';
export const LOCAL_ADMIN_USER_ID = 'local-admin';
export const LOCAL_ADMIN_USERNAME = 'admin';
export const LOCAL_ADMIN_PASSWORD = '1234';
export const LOCAL_ADMIN_EMAIL = 'admin@sagadrive.local';

export function isLocalAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LOCAL_ADMIN_STORAGE_KEY) === 'true';
}