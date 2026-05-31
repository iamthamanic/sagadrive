import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const LOCAL_ADMIN_STORAGE_KEY = 'sagadrive-local-admin-session';
const LOCAL_ADMIN_USERNAME = 'admin';
const LOCAL_ADMIN_PASSWORD = '1234';

function createLocalAdminUser(): User {
  return {
    id: 'local-admin',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@local.sagadrive',
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
  if (typeof window === 'undefined') {
    return null;
  }

  const hasLocalAdminSession = window.localStorage.getItem(LOCAL_ADMIN_STORAGE_KEY) === 'true';
  return hasLocalAdminSession ? createLocalAdminUser() : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const localAdminUser = getStoredLocalAdminUser();
    if (localAdminUser) {
      setUser(localAdminUser);
      setIsLoading(false);
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
    if (email === LOCAL_ADMIN_USERNAME && password === LOCAL_ADMIN_PASSWORD) {
      const localAdminUser = createLocalAdminUser();
      window.localStorage.setItem(LOCAL_ADMIN_STORAGE_KEY, 'true');
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
    if (user?.id === 'local-admin') {
      window.localStorage.removeItem(LOCAL_ADMIN_STORAGE_KEY);
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
