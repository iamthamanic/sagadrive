import { useEffect } from 'react';
import { useAuth } from '../../lib/auth-context';
import { LoginScreen } from './LoginScreen';
import { Loader2, Sparkles } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * AuthGate ensures user is authenticated before showing content
 * Shows login screen if not authenticated
 */
export function AuthGate({ children }: AuthGateProps) {
  const { user, isLoading } = useAuth();

  // Show auth status in console
  useEffect(() => {
    if (user) {
      console.log('%c✅ AUTHENTICATED', 'background: #22C55E; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
      console.log('User:', user.email);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <h2 className="text-xl mb-2">Make My Saga</h2>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">Lädt...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen if no user
  if (!user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
