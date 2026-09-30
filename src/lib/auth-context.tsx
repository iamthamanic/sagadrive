/**
 * AuthProvider — Supabase session + Local Admin shortcut with attempt generations.
 * Location: src/lib/auth-context.tsx
 *
 * Local Admin GoTrue login is bounded by AUTH_SESSION_TIMEOUT_MS. Timed-out /
 * superseded attempts must not authenticate later via onAuthStateChange or a
 * persisted session. signInWithPassword has no AbortSignal — stale results are
 * invalidated by generation + selective admin-session cleanup.
 */

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import {
  isLocalAdminSession,
  LOCAL_ADMIN_EMAIL,
  LOCAL_ADMIN_PASSWORD,
  LOCAL_ADMIN_STORAGE_KEY,
  LOCAL_ADMIN_USER_ID,
  LOCAL_ADMIN_USERNAME,
} from './localAdmin';
import {
  AUTH_SESSION_TIMEOUT_MS,
  isTimedOut,
  raceWithTimeout,
  raceWithTimeoutOrSymbol,
} from './networkTimeout';
import type { AuthTokenResponsePassword, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function createLocalAdminUser(): User {
  return {
    id: LOCAL_ADMIN_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: LOCAL_ADMIN_EMAIL,
    app_metadata: {
      provider: 'local-admin',
      providers: ['local-admin'],
    },
    user_metadata: {
      username: LOCAL_ADMIN_USERNAME,
      display_name: 'Admin',
    },
    identities: [],
    created_at: new Date().toISOString(),
    is_anonymous: false,
  } as User;
}

function getStoredLocalAdminUser(): User | null {
  return isLocalAdminSession() ? createLocalAdminUser() : null;
}

function isLocalAdminShortcut(identifier: string, password: string): boolean {
  const normalized = identifier.trim().toLowerCase();
  return (
    (normalized === LOCAL_ADMIN_USERNAME || normalized === LOCAL_ADMIN_EMAIL) &&
    password === LOCAL_ADMIN_PASSWORD
  );
}

function isLocalAdminFallbackUser(user: User | null | undefined): boolean {
  return Boolean(
    user &&
      user.id === LOCAL_ADMIN_USER_ID &&
      user.app_metadata?.provider === 'local-admin',
  );
}

function isSeededLocalAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.id === LOCAL_ADMIN_USER_ID || user.email === LOCAL_ADMIN_EMAIL;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** Monotonic generation: only the live generation may apply Auth UI state. */
  const authGenerationRef = useRef(0);
  const userRef = useRef<User | null>(null);
  /** Live generations that intentionally use Local Admin fallback (not GoTrue JWT). */
  const fallbackGenerationsRef = useRef<Set<number>>(new Set());
  /**
   * Live generation that still expects GoTrue Local Admin success (not timed out).
   * Allows in-flight SIGNED_IN before applyUser; cleared on timeout/bump/success.
   */
  const expectingGoTrueLocalAdminRef = useRef<number | null>(null);
  /** Ignore onAuthStateChange while discarding a stale Local Admin GoTrue session. */
  const suppressAuthListenerRef = useRef(false);

  const bumpAuthGeneration = (): number => {
    authGenerationRef.current += 1;
    fallbackGenerationsRef.current.clear();
    expectingGoTrueLocalAdminRef.current = null;
    return authGenerationRef.current;
  };

  const isLiveGeneration = (generation: number): boolean =>
    generation === authGenerationRef.current;

  const applyUser = (next: User | null, generation: number) => {
    if (!isLiveGeneration(generation)) return;
    userRef.current = next;
    setUser(next);
  };

  /**
   * Discard a GoTrue session produced by a timed-out / superseded Local Admin attempt.
   * No-ops when the current session is a different (non-admin) user.
   * Suppresses listener updates so cleanup signOut cannot clear a valid newer UI user.
   */
  const discardStaleLocalAdminSession = async () => {
    suppressAuthListenerRef.current = true;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user && isSeededLocalAdminUser(session.user)) {
        await supabase.auth.signOut({ scope: 'local' });
      }
      // Fake/partial GoTrue payloads may leave auth-token crumbs that getSession
      // does not surface — clear only seeded Local Admin identities.
      try {
        for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
          const key = window.localStorage.key(i);
          if (!key || !key.includes('auth-token')) continue;
          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw) as { user?: { id?: string; email?: string } };
            if (
              parsed?.user?.email === LOCAL_ADMIN_EMAIL ||
              parsed?.user?.id === LOCAL_ADMIN_USER_ID
            ) {
              window.localStorage.removeItem(key);
            }
          } catch {
            /* ignore malformed */
          }
        }
      } catch {
        /* ignore storage access */
      }
    } catch (error) {
      console.warn('[auth] stale Local Admin session cleanup failed:', error);
    } finally {
      suppressAuthListenerRef.current = false;
    }
  };

  const watchStaleLocalAdminPasswordLogin = (
    generation: number,
    loginPromise: PromiseLike<AuthTokenResponsePassword>,
  ) => {
    void Promise.resolve(loginPromise)
      .then(async (result) => {
        const liveSuccess =
          isLiveGeneration(generation) && !fallbackGenerationsRef.current.has(generation);
        if (liveSuccess) return;
        if (result.error || !result.data?.user) return;
        // GoTrue has no AbortSignal — the client may persist the session when the
        // promise settles, possibly after an earlier SIGNED_IN scrub. Scrub twice.
        await discardStaleLocalAdminSession();
        await new Promise((resolve) => setTimeout(resolve, 50));
        await discardStaleLocalAdminSession();
      })
      .catch(() => {
        /* ignore */
      });
  };

  useEffect(() => {
    let cancelled = false;
    const bootstrapGeneration = bumpAuthGeneration();
    const SESSION_TIMEOUT_MS = AUTH_SESSION_TIMEOUT_MS;

    const finish = (nextUser: User | null) => {
      if (cancelled) return;
      applyUser(nextUser, bootstrapGeneration);
      setIsLoading(false);
    };

    const storedLocalAdmin = isLocalAdminSession();
    if (storedLocalAdmin) {
      raceWithTimeoutOrSymbol(supabase.auth.getSession(), SESSION_TIMEOUT_MS)
        .then(async (sessionResult) => {
          if (isTimedOut(sessionResult)) {
            fallbackGenerationsRef.current.add(bootstrapGeneration);
            finish(getStoredLocalAdminUser());
            return;
          }

          const {
            data: { session },
          } = sessionResult;
          if (session?.user) {
            finish(session.user);
            return;
          }

          try {
            expectingGoTrueLocalAdminRef.current = bootstrapGeneration;
            const loginPromise = supabase.auth.signInWithPassword({
              email: LOCAL_ADMIN_EMAIL,
              password: LOCAL_ADMIN_PASSWORD,
            });
            const loginResult = await raceWithTimeoutOrSymbol(loginPromise, SESSION_TIMEOUT_MS);
            if (isTimedOut(loginResult)) {
              if (expectingGoTrueLocalAdminRef.current === bootstrapGeneration) {
                expectingGoTrueLocalAdminRef.current = null;
              }
              fallbackGenerationsRef.current.add(bootstrapGeneration);
              watchStaleLocalAdminPasswordLogin(bootstrapGeneration, loginPromise);
              throw new Error('local re-login timeout');
            }
            if (expectingGoTrueLocalAdminRef.current === bootstrapGeneration) {
              expectingGoTrueLocalAdminRef.current = null;
            }
            const { data, error } = loginResult;
            if (error || !data.user) throw error ?? new Error('local re-login failed');
            finish(data.user);
          } catch {
            fallbackGenerationsRef.current.add(bootstrapGeneration);
            finish(getStoredLocalAdminUser());
          }
        })
        .catch(() => {
          fallbackGenerationsRef.current.add(bootstrapGeneration);
          finish(getStoredLocalAdminUser());
        });
    } else {
      raceWithTimeout(
        supabase.auth.getSession(),
        { data: { session: null }, error: null },
        SESSION_TIMEOUT_MS,
      )
        .then(({ data: { session } }) => {
          finish(session?.user ?? null);
        })
        .catch(() => {
          finish(null);
        });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (suppressAuthListenerRef.current) return;
      const generation = authGenerationRef.current;
      const current = userRef.current;
      const onFallback =
        isLocalAdminFallbackUser(current) || fallbackGenerationsRef.current.has(generation);
      const expectingGoTrue =
        expectingGoTrueLocalAdminRef.current !== null &&
        expectingGoTrueLocalAdminRef.current === generation;

      if (event === 'SIGNED_IN' && session?.user && isSeededLocalAdminUser(session.user)) {
        // Stale Local Admin GoTrue must not resurrect / overwrite newer auth state.
        if (onFallback) {
          void discardStaleLocalAdminSession();
          return;
        }
        if (current && !isSeededLocalAdminUser(current)) {
          void discardStaleLocalAdminSession();
          return;
        }
        if (current === null && !expectingGoTrue) {
          void (async () => {
            await discardStaleLocalAdminSession();
            await new Promise((resolve) => setTimeout(resolve, 50));
            await discardStaleLocalAdminSession();
          })();
          return;
        }
      }

      if (event === 'SIGNED_OUT') {
        // Cleanup for stale admin must not clear fallback UI or a newer non-admin user.
        if (onFallback) return;
        if (current && !isSeededLocalAdminUser(current)) return;
        if (current === null) return;
        applyUser(null, generation);
        return;
      }

      // INITIAL_SESSION / other events with no Supabase session must not wipe
      // intentional Local Admin fallback (storage-backed offline UI).
      if (!session?.user) {
        if (onFallback || isLocalAdminFallbackUser(current) || isLocalAdminSession()) {
          return;
        }
        applyUser(null, generation);
        return;
      }

      applyUser(session.user, generation);
    });

    return () => {
      cancelled = true;
      bumpAuthGeneration();
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isLocalAdminShortcut(email, password)) {
      const generation = bumpAuthGeneration();
      expectingGoTrueLocalAdminRef.current = generation;
      window.localStorage.setItem(LOCAL_ADMIN_STORAGE_KEY, 'true');
      const loginPromise = supabase.auth.signInWithPassword({
        email: LOCAL_ADMIN_EMAIL,
        password: LOCAL_ADMIN_PASSWORD,
      });
      try {
        const loginResult = await raceWithTimeoutOrSymbol(loginPromise, AUTH_SESSION_TIMEOUT_MS);
        if (isTimedOut(loginResult)) {
          if (expectingGoTrueLocalAdminRef.current === generation) {
            expectingGoTrueLocalAdminRef.current = null;
          }
          fallbackGenerationsRef.current.add(generation);
          watchStaleLocalAdminPasswordLogin(generation, loginPromise);
          throw new Error('local GoTrue login timeout');
        }
        const { data, error } = loginResult;
        if (error) throw error;
        if (data.user) {
          if (!isLiveGeneration(generation)) {
            if (expectingGoTrueLocalAdminRef.current === generation) {
              expectingGoTrueLocalAdminRef.current = null;
            }
            await discardStaleLocalAdminSession();
            return;
          }
          expectingGoTrueLocalAdminRef.current = null;
          applyUser(data.user, generation);
          return;
        }
      } catch (error) {
        if (expectingGoTrueLocalAdminRef.current === generation) {
          expectingGoTrueLocalAdminRef.current = null;
        }
        if (!isLiveGeneration(generation)) {
          watchStaleLocalAdminPasswordLogin(generation, loginPromise);
          return;
        }
        console.warn('[auth] local GoTrue login unavailable, using app-level admin session:', error);
        fallbackGenerationsRef.current.add(generation);
        watchStaleLocalAdminPasswordLogin(generation, loginPromise);
        applyUser(createLocalAdminUser(), generation);
        return;
      }
      if (expectingGoTrueLocalAdminRef.current === generation) {
        expectingGoTrueLocalAdminRef.current = null;
      }
      if (!isLiveGeneration(generation)) return;
      fallbackGenerationsRef.current.add(generation);
      watchStaleLocalAdminPasswordLogin(generation, loginPromise);
      applyUser(createLocalAdminUser(), generation);
      return;
    }

    const generation = bumpAuthGeneration();
    window.localStorage.removeItem(LOCAL_ADMIN_STORAGE_KEY);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (!isLiveGeneration(generation)) return;
    if (data.user) applyUser(data.user, generation);
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    bumpAuthGeneration();
    window.localStorage.removeItem(LOCAL_ADMIN_STORAGE_KEY);
    userRef.current = null;
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('[auth] signOut cleanup:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
