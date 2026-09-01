/**
 * Resolves the current user id for service-layer Supabase calls.
 * Local-admin sessions short-circuit when the stack is unreachable.
 * Location: src/lib/authenticatedUser.ts
 */

import { supabase } from './supabase';
import { isLocalAdminSession, LOCAL_ADMIN_USER_ID } from './localAdmin';
import {
  AUTH_SESSION_TIMEOUT_MS,
  isTimedOut,
  raceWithTimeoutOrSymbol,
  raceWithTimeoutReject,
  SUPABASE_QUERY_TIMEOUT_MS,
} from './networkTimeout';

export async function getAuthenticatedUserId(): Promise<string> {
  if (isLocalAdminSession()) {
    const sessionResult = await raceWithTimeoutOrSymbol(
      supabase.auth.getSession(),
      AUTH_SESSION_TIMEOUT_MS,
    );
    if (!isTimedOut(sessionResult) && sessionResult.data.session?.user) {
      return sessionResult.data.session.user.id;
    }
    return LOCAL_ADMIN_USER_ID;
  }

  const { data, error } = await raceWithTimeoutReject(
    supabase.auth.getUser(),
    SUPABASE_QUERY_TIMEOUT_MS,
    'Authentication request timed out',
  );
  if (error) throw error;
  if (data.user) return data.user.id;
  throw new Error('User not authenticated');
}
