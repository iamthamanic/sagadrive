/**
 * Profile — Einstellungen with top-level tabs per section + AI sub-tabs (Bild/3D/Video/Audio).
 * Location: src/app/profile/Profile.tsx
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';
import { Switch } from '../../shared/ui/switch';
import { Separator } from '../../shared/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import {
  User,
  Bell,
  Palette,
  Volume2,
  Languages,
  LogOut,
  Sparkles,
  ImageIcon,
  Box,
  Video,
  AudioLines,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useTheme } from '../../lib/theme-provider';
import { toast } from 'sonner';
import { AiProviderCredentialsPanel } from './AiProviderCredentialsPanel';

type SettingsTab =
  | 'profil'
  | 'darstellung'
  | 'benachrichtigungen'
  | 'audio-video'
  | 'sprache'
  | 'ai'
  | 'gefahrenbereich';

type AiSubTab = 'bild' | '3d' | 'video' | 'audio';

export function Profile() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('profil');
  const [aiSubTab, setAiSubTab] = useState<AiSubTab>('bild');

  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Erfolgreich abgemeldet');
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-4 p-4 md:space-y-6 md:p-8">
        <div>
          <h1 className="text-xl md:text-2xl">Profil & Einstellungen</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Verwalte dein Konto und Präferenzen
          </p>
        </div>

        <Tabs
          value={settingsTab}
          onValueChange={(value) => setSettingsTab(value as SettingsTab)}
          className="gap-4"
          data-settings-tabs
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="profil" className="gap-1.5">
              <User className="size-3.5" aria-hidden="true" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="darstellung" className="gap-1.5">
              <Palette className="size-3.5" aria-hidden="true" />
              Darstellung
            </TabsTrigger>
            <TabsTrigger value="benachrichtigungen" className="gap-1.5">
              <Bell className="size-3.5" aria-hidden="true" />
              Benachrichtigungen
            </TabsTrigger>
            <TabsTrigger value="audio-video" className="gap-1.5">
              <Volume2 className="size-3.5" aria-hidden="true" />
              Audio & Video
            </TabsTrigger>
            <TabsTrigger value="sprache" className="gap-1.5">
              <Languages className="size-3.5" aria-hidden="true" />
              Sprache
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5" data-settings-tab-ai>
              <Sparkles className="size-3.5" aria-hidden="true" />
              AI
            </TabsTrigger>
            <TabsTrigger value="gefahrenbereich" className="gap-1.5 text-destructive">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              Gefahrenbereich
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profil">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <User className="size-5" />
                  Profil
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Deine persönlichen Informationen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-muted md:size-20">
                    <User className="size-8 text-muted-foreground md:size-10" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{user?.email?.split('@')[0] || 'User'}</p>
                    <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input id="email" type="email" defaultValue={user?.email} disabled />
                    <p className="text-xs text-muted-foreground">E-Mail kann nicht geändert werden</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-id">User ID</Label>
                    <Input id="user-id" defaultValue={user?.id} disabled />
                  </div>
                </div>

                <Button onClick={handleSignOut} variant="outline" className="w-full">
                  <LogOut className="mr-2 size-4" />
                  Abmelden
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="darstellung">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Palette className="size-5" />
                  Darstellung
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Passe das Aussehen der App an
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium md:text-base">Dark Mode</p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      Dunkles Farbschema verwenden
                    </p>
                  </div>
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    aria-label="Dark Mode umschalten"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium md:text-base">Kompakte Ansicht</p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      Weniger Abstände verwenden
                    </p>
                  </div>
                  <Switch aria-label="Kompakte Ansicht umschalten" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benachrichtigungen">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Bell className="size-5" />
                  Benachrichtigungen
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Verwalte deine Benachrichtigungen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium md:text-base">Session-Einladungen</p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      Benachrichtigung bei neuen Einladungen
                    </p>
                  </div>
                  <Switch defaultChecked aria-label="Session-Einladungen" />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium md:text-base">Community-Updates</p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      Neuigkeiten vom Marktplatz
                    </p>
                  </div>
                  <Switch defaultChecked aria-label="Community-Updates" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio-video">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Volume2 className="size-5" />
                  Audio & Video
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Einstellungen für Sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium md:text-base">Mikrofon aktivieren</p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      Automatisch in Sessions
                    </p>
                  </div>
                  <Switch defaultChecked aria-label="Mikrofon aktivieren" />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium md:text-base">Kamera aktivieren</p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      Automatisch in Sessions
                    </p>
                  </div>
                  <Switch aria-label="Kamera aktivieren" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sprache">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Languages className="size-5" />
                  Sprache
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">App-Sprache ändern</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="app-language" className="sr-only">
                  App-Sprache
                </Label>
                <select
                  id="app-language"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  defaultValue="de"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Sparkles className="size-5" />
                  AI
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Präferenzen für generative Medien (Bild, 3D, Video, Audio)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={aiSubTab}
                  onValueChange={(value) => setAiSubTab(value as AiSubTab)}
                  className="gap-4"
                  data-settings-ai-tabs
                >
                  <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                    <TabsTrigger value="bild" className="gap-1.5" data-settings-ai-tab="bild">
                      <ImageIcon className="size-3.5" aria-hidden="true" />
                      Bild
                    </TabsTrigger>
                    <TabsTrigger value="3d" className="gap-1.5" data-settings-ai-tab="3d">
                      <Box className="size-3.5" aria-hidden="true" />
                      3D
                    </TabsTrigger>
                    <TabsTrigger value="video" className="gap-1.5" data-settings-ai-tab="video">
                      <Video className="size-3.5" aria-hidden="true" />
                      Video
                    </TabsTrigger>
                    <TabsTrigger value="audio" className="gap-1.5" data-settings-ai-tab="audio">
                      <AudioLines className="size-3.5" aria-hidden="true" />
                      Audio
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="bild" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Provider für 2D-Bildgenerierung (z. B. Item-Thumbnails).
                    </p>
                    <AiProviderCredentialsPanel tab="bild" />
                  </TabsContent>

                  <TabsContent value="3d" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Provider für Image-to-3D (GLB-Upload braucht keinen Key).
                    </p>
                    <AiProviderCredentialsPanel tab="3d" />
                  </TabsContent>

                  <TabsContent value="video" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Provider für KI-Video.
                    </p>
                    <AiProviderCredentialsPanel tab="video" />
                  </TabsContent>

                  <TabsContent value="audio" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Provider für KI-Audio und Stimmen.
                    </p>
                    <AiProviderCredentialsPanel tab="audio" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gefahrenbereich">
            <Card className="border-destructive">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive md:text-lg">
                  Gefahrenbereich
                </CardTitle>
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
