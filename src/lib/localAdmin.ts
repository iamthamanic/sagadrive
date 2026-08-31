/**
 * Shared local-admin identity helpers for the local-only SagaDrive stack.
 *
 * The `admin` shortcut maps to the seeded GoTrue user (LOCAL_ADMIN_EMAIL) so
 * the app holds a real JWT and RLS sees the `authenticated` role. The fallback
 * user id equals the seeded auth.users row (migration 011) — a valid UUID, so
 * Postgres never rejects it as `invalid input syntax for type uuid`. Offline
 * UI state resolves to the same owner id the seeded session would produce.
 * Location: src/lib/localAdmin.ts.
 */

export const LOCAL_ADMIN_STORAGE_KEY = 'sagadrive-local-admin-session';

/**
 * Fixed UUID of the seeded local admin account (migration 011). Must stay in
 * sync with `supabase/migrations/011_seed_local_admin.sql`.
 */
export const LOCAL_ADMIN_USER_ID = '00000000-0000-4000-8000-000000000001';

export const LOCAL_ADMIN_USERNAME = 'admin';
export const LOCAL_ADMIN_PASSWORD = '1234';
export const LOCAL_ADMIN_EMAIL = 'admin@sagadrive.local';

export function isLocalAdminSession(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LOCAL_ADMIN_STORAGE_KEY) === 'true';
}