/**
 * AuthGate ensures user is authenticated before showing content.
 * Während Session-Check: animiertes SagaDrive-Logo statt generischem Spinner.
 * Location: src/components/auth/AuthGate.tsx
 */
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../../lib/auth-context';
import { LoginScreen } from './LoginScreen';
import { SagaDriveLogo } from '../SagaDriveLogo';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('%c✅ AUTHENTICATED', 'background: #22C55E; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.log('User:', user.email);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" role="status" aria-live="polite" aria-busy="true">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <SagaDriveLogo className="h-28 w-28 md:h-32 md:w-32" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">SagaDrive</h2>
            <p className="mt-2 text-sm text-muted-foreground">Lädt...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
