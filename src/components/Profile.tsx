import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { User, Bell, Palette, Volume2, Languages, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';

export function Profile() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Erfolgreich abgemeldet');
  };
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl">Profil & Einstellungen</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Verwalte dein Konto und Präferenzen
          </p>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Profil
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Deine persönlichen Informationen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue={user?.email}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  E-Mail kann nicht geändert werden
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-id">User ID</Label>
                <Input 
                  id="user-id" 
                  defaultValue={user?.id}
                  disabled
                />
              </div>
            </div>

            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Darstellung
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Passe das Aussehen der App an
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm md:text-base">Dark Mode</p>
                <p className="text-xs md:text-sm text-muted-foreground">Dunkles Farbschema verwenden</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm md:text-base">Kompakte Ansicht</p>
                <p className="text-xs md:text-sm text-muted-foreground">Weniger Abstände verwenden</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Benachrichtigungen
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Verwalte deine Benachrichtigungen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm md:text-base">Session-Einladungen</p>
                <p className="text-xs md:text-sm text-muted-foreground">Benachrichtigung bei neuen Einladungen</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm md:text-base">Community-Updates</p>
                <p className="text-xs md:text-sm text-muted-foreground">Neuigkeiten vom Marktplatz</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Audio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Audio & Video
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Einstellungen für Sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm md:text-base">Mikrofon aktivieren</p>
                <p className="text-xs md:text-sm text-muted-foreground">Automatisch in Sessions</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm md:text-base">Kamera aktivieren</p>
                <p className="text-xs md:text-sm text-muted-foreground">Automatisch in Sessions</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Languages className="w-5 h-5" />
              Sprache
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              App-Sprache ändern
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select className="w-full px-3 py-2 rounded-lg border border-border bg-background">
              <option value="de">Deutsch</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg text-destructive">Gefahrenbereich</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Irreversible Aktionen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="destructive" className="w-full">
              Konto löschen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
