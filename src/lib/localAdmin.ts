/**
 * Shared local-admin identity helpers for the local-only SagaDrive stack.
 * The local admin bypass (username `admin`) creates a session without a Supabase JWT,
 * so services that cannot call `supabase.auth.getUser()` resolve the owner id from this module.
 * Location: src/lib/localAdmin.ts.
 */

export const LOCAL_ADMIN_STORAGE_KEY = 'sagadrive-local-admin-session';
export const LOCAL_ADMIN_USER_ID = 'local-admin';
export const LOCAL_ADMIN_USERNAME = 'admin';
export const LOCAL_ADMIN_PASSWORD = '1234';

export function isLocalAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LOCAL_ADMIN_STORAGE_KEY) === 'true';
}