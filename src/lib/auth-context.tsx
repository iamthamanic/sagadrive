import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import {
  isLocalAdminSession,
  LOCAL_ADMIN_EMAIL,
  LOCAL_ADMIN_PASSWORD,
  LOCAL_ADMIN_STORAGE_KEY,
  LOCAL_ADMIN_USER_ID,
  LOCAL_ADMIN_USERNAME,
} from './localAdmin';
import type { User } from '@supabase/supabase-js';

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

/**
 * True when the caller typed the local admin shortcut credentials. These map to
 * the seeded GoTrue user (LOCAL_ADMIN_EMAIL) so the app authenticates with a real
 * JWT against the local stack; the in-memory fallback user is only used when the
 * stack is unreachable.
 */
function isLocalAdminShortcut(identifier: string, password: string): boolean {
  const normalized = identifier.trim().toLowerCase();
  return (
    (normalized === LOCAL_ADMIN_USERNAME || normalized === LOCAL_ADMIN_EMAIL) &&
    password === LOCAL_ADMIN_PASSWORD
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedLocalAdmin = isLocalAdminSession();
    if (storedLocalAdmin) {
      // Prefer a real GoTrue session from a previous shortcut login so requests
      // carry a genuine JWT (RLS requires the authenticated role).
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(getStoredLocalAdminUser());
        }
        setIsLoading(false);
      }).catch(() => {
        setUser(getStoredLocalAdminUser());
        setIsLoading(false);
      });
      return;
    }

    // Check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (isLocalAdminShortcut(email, password)) {
      window.localStorage.setItem(LOCAL_ADMIN_STORAGE_KEY, 'true');
      try {
        // Real session against the local GoTrue user: requests then pass RLS as
        // `authenticated` with a stable UUID instead of the anon role.
        const { data, error } = await supabase.auth.signInWithPassword({
          email: LOCAL_ADMIN_EMAIL,
          password: LOCAL_ADMIN_PASSWORD,
        });
        if (error) throw error;
        if (data.user) {
          setUser(data.user);
          return;
        }
      } catch (error) {
        console.warn('[auth] local GoTrue login unavailable, using app-level admin session:', error);
      }
      const localAdminUser = createLocalAdminUser();
      setUser(localAdminUser);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    window.localStorage.removeItem(LOCAL_ADMIN_STORAGE_KEY);
    if (user?.id === LOCAL_ADMIN_USER_ID) {
      setUser(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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