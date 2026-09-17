/**
 * GamemasterPanel — Vertical slice GM storytelling controls + NPC instances (#201).
 * Location: src/app/session/GamemasterPanel.tsx
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { Textarea } from '../../shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/select';
import { Slider } from '../../shared/ui/slider';
import { Switch } from '../../shared/ui/switch';
import { Label } from '../../shared/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import { Wand2, Eye, ImagePlus, Volume2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { useProjectSummaries } from '../project';
import { AdventureNpcCreatureInstancesPanel } from './AdventureNpcCreatureInstancesPanel';
import { SessionAvatarStrip } from './SessionAvatarStrip';

export function GamemasterPanel() {
  const [storyText, setStoryText] = useState('');
  const [autoMode, setAutoMode] = useState(true);
  const [detailLevel, setDetailLevel] = useState([70]);
  const [currentMood, setCurrentMood] = useState('mystical');
  const { user } = useAuth();
  const { projects } = useProjectSummaries({ enabled: true });
  const gmProjects = projects.filter(
    (project) => user !== null && project.gmUserId === user.id,
  );

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl">Gamemaster Panel</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Steuere dein Abenteuer
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Storytelling</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Erzähle deine Geschichte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <Textarea
                placeholder="Beginne zu erzählen... Die KI visualisiert automatisch."
                rows={6}
                className="text-sm md:text-base resize-none"
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-mode"
                    checked={autoMode}
                    onCheckedChange={setAutoMode}
                  />
                  <Label htmlFor="auto-mode">Automatikmodus</Label>
                </div>
                <Button>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Szene generieren
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Detailstufe der KI-Anreicherung</Label>
                <Slider
                  value={detailLevel}
                  onValueChange={setDetailLevel}
                  max={100}
                  step={1}
                />
                <p className="text-sm text-muted-foreground">
                  Aktuelle Detailstufe: {detailLevel[0]}%
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mood">Stimmung</Label>
                <Select value={currentMood} onValueChange={setCurrentMood}>
                  <SelectTrigger id="mood">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Düster</SelectItem>
                    <SelectItem value="mystical">Mystisch</SelectItem>
                    <SelectItem value="cheerful">Heiter</SelectItem>
                    <SelectItem value="tense">Angespannt</SelectItem>
                    <SelectItem value="peaceful">Friedlich</SelectItem>
                    <SelectItem value="epic">Episch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Vorschau</CardTitle>
              <CardDescription className="text-xs md:text-sm">Spieleransicht</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Eye className="w-8 h-8 md:w-12 md:h-12 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <p className="text-xs md:text-sm font-medium">Aktuelle Szene</p>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-3">
                  {storyText || 'Noch keine Szene generiert...'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" size="sm">
                  <Eye className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Einblenden</span>
                  <span className="sm:hidden">Ein</span>
                </Button>
                <Button variant="outline" className="flex-1" size="sm">
                  <span className="hidden sm:inline">Ausblenden</span>
                  <span className="sm:hidden">Aus</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <Tabs defaultValue="npcs">
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="npcs" className="text-xs md:text-sm py-2" data-gm-tab-npcs>
                  NPCs
                </TabsTrigger>
                <TabsTrigger value="scenes" className="text-xs md:text-sm py-2">Szenen</TabsTrigger>
                <TabsTrigger value="characters" className="text-xs md:text-sm py-2">Chars</TabsTrigger>
                <TabsTrigger value="objects" className="text-xs md:text-sm py-2">Objekte</TabsTrigger>
                <TabsTrigger value="sound" className="text-xs md:text-sm py-2">Sound</TabsTrigger>
              </TabsList>

              <TabsContent value="npcs" className="space-y-3 md:space-y-4">
                <div>
                  <h4 className="mb-3 text-sm md:text-base">NPCs & Kreaturen im Abenteuer</h4>
                  <AdventureNpcCreatureInstancesPanel gmProjects={gmProjects} />
                </div>
              </TabsContent>

              <TabsContent value="scenes" className="space-y-3 md:space-y-4">
                <div>
                  <h4 className="mb-3 text-sm md:text-base">Szenen-Bibliothek</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    {['Wald', 'Schloss', 'Stadt', 'Höhle', 'Taverne', 'Tempel'].map((scene) => (
                      <Button
                        key={scene}
                        variant="outline"
                        className="h-16 md:h-20 flex-col gap-1 md:flex-row md:gap-2"
                        size="sm"
                      >
                        <ImagePlus className="w-4 h-4" />
                        <span className="text-xs md:text-sm">{scene}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="characters" className="space-y-3 md:space-y-4">
                <div>
                  <h4 className="mb-3 text-sm md:text-base">Spieler-Charaktere</h4>
                  <SessionAvatarStrip
                    characters={[
                      { characterId: 'demo-aria', displayName: 'Aria Windwhisper' },
                      { characterId: 'demo-thorin', displayName: 'Thorin Steinbrecher' },
                      { characterId: 'demo-luna', displayName: 'Luna Nachtschatten' },
                    ]}
                  />
                </div>
              </TabsContent>

              <TabsContent value="objects" className="space-y-3 md:space-y-4">
                <div>
                  <h4 className="mb-3 text-sm md:text-base">Objekt-Templates</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    {['Lagerfeuer', 'Schwert', 'Altar', 'Truhe', 'Portal', 'Schatz'].map((obj) => (
                      <Button
                        key={obj}
                        variant="outline"
                        className="h-16 md:h-20 text-xs md:text-sm"
                        size="sm"
                      >
                        {obj}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sound" className="space-y-3 md:space-y-4">
                <div>
                  <h4 className="mb-3 text-sm md:text-base">Soundscapes</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                    {['Wald', 'Kampf', 'Mystisch', 'Taverne', 'Gewitter', 'Episch'].map((sound) => (
                      <Button
                        key={sound}
                        variant="outline"
                        className="h-14 md:h-16 flex-col gap-1 md:flex-row md:gap-2"
                        size="sm"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span className="text-xs md:text-sm">{sound}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
