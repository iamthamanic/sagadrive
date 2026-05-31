import { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { useTheme } from '../../lib/theme-provider';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import logoImage from 'figma:asset/5cdcbab5ea0860d6cbb920fecd888377cdc015a0.png';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { theme, setTheme } = useTheme();
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isDarkMode = theme === 'dark' || (
    theme === 'system' &&
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(loginIdentifier.trim(), password);
      toast.success('Erfolgreich eingeloggt!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login fehlgeschlagen';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signUp(signupEmail.trim(), password);
      toast.success('Account erstellt! Bitte logge dich ein.');
      // Auto switch to login tab after signup
      setPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registrierung fehlgeschlagen';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <Switch
            checked={isDarkMode}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            aria-label="Dark Mode umschalten"
          />
          <Moon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-2">
            <div className="login-logo-wrap relative w-32 h-32">
              <span className="login-logo-sparkle login-logo-sparkle-1" aria-hidden="true" />
              <span className="login-logo-sparkle login-logo-sparkle-2" aria-hidden="true" />
              <span className="login-logo-sparkle login-logo-sparkle-3" aria-hidden="true" />
              <span className="login-logo-sparkle login-logo-sparkle-4" aria-hidden="true" />
              <span className="login-logo-sparkle login-logo-sparkle-5" aria-hidden="true" />
              <span className="login-logo-sparkle login-logo-sparkle-6" aria-hidden="true" />
              <ImageWithFallback
                src={logoImage}
                alt="SagaDrive Logo"
                className="login-logo-image w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl">SagaDrive</h1>
            <p className="text-muted-foreground mt-2">
              Erstelle epische Rollenspiel-Abenteuer
            </p>
          </div>
        </div>

        {/* Login/Signup Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Willkommen</CardTitle>
            <CardDescription>
              Melde dich an oder erstelle einen Account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Registrieren</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-identifier">Benutzername oder E-Mail</Label>
                    <Input
                      id="login-identifier"
                      type="text"
                      placeholder="admin oder deine@email.de"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Demo-Login: <span className="font-mono">admin</span> / <span className="font-mono">1234</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Passwort</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Lädt...
                      </>
                    ) : (
                      'Einloggen'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-Mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="deine@email.de"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Passwort</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mindestens 6 Zeichen
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Lädt...
                      </>
                    ) : (
                      'Account erstellen'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Mit dem Login akzeptierst du unsere{' '}
            <a href="#" className="underline hover:text-primary">
              Nutzungsbedingungen
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
