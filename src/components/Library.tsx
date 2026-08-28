import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Plus, Search, User, BookOpen, Edit, Trash2, Loader2, Globe2 } from 'lucide-react';
import { useCharacters } from '../modules/characters';
import { EntityBrowser, type EntityBrowserRenderContext } from './EntityBrowser';
import { EntityBrowserCard } from './EntityBrowserCard';
import { cn } from './ui/utils';
import {
  WorldProfileEditorDialog,
  getSpeciesDevelopmentMode,
  useWorldProfiles,
  type CreateWorldProfileDto,
  type WorldProfileVm,
} from '../modules/worlds';
import { toast } from 'sonner';

interface LibraryProps {
  onNavigate: (view: string) => void;
}

const SPECIES_DEVELOPMENT_MODE_LABELS = {
  explicit: 'Explizit',
  progressive: 'Progressiv',
  disabled: 'Deaktiviert',
} as const;

const CHARACTER_VIEW_MODE_STORAGE_KEY = 'sagadrive_library_characters_view_mode';

type CharacterCardData = {
  id: string;
  name: string;
  level: number;
  race: string;
  className: string;
  portraitUrl?: string;
};

function renderCharacterCard(
  char: CharacterCardData,
  { variant, isCenter, onActivate }: EntityBrowserRenderContext,
  actions: React.ReactNode,
): React.ReactNode {
  return (
    <EntityBrowserCard
      title={char.name}
      meta={`Level ${char.level} ${char.race} ${char.className}`}
      imageUrl={char.portraitUrl}
      imageAlt={`Portrait von ${char.name}`}
      imageFallback={char.name}
      variant={variant}
      isCenter={isCenter}
      onOpen={onActivate}
      actions={actions}
    />
  );
}

export function Library({ onNavigate }: LibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [worldEditorOpen, setWorldEditorOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<WorldProfileVm | null>(null);
  const { characters, isLoading, error, deleteCharacter } = useCharacters();
  const {
    worlds,
    isLoading: worldsLoading,
    error: worldsError,
    createWorld,
    updateWorld,
    deleteWorld,
  } = useWorldProfiles();

  const handleDeleteCharacter = async (id: string, name: string) => {
    if (!confirm(`Möchtest du "${name}" wirklich löschen?`)) {
      return;
    }

    const success = await deleteCharacter(id);
    if (success) {
      toast.success('Charakter gelöscht');
    } else {
      toast.error('Fehler beim Löschen');
    }
  };

  const openCreateWorld = () => {
    setEditingWorld(null);
    setWorldEditorOpen(true);
  };

  const openEditWorld = (world: WorldProfileVm) => {
    setEditingWorld(world);
    setWorldEditorOpen(true);
  };

  const handleSaveWorld = async (payload: CreateWorldProfileDto): Promise<boolean> => {
    const saved = editingWorld
      ? await updateWorld(editingWorld.id, payload)
      : await createWorld(payload);

    if (!saved) {
      toast.error('Welt konnte nicht gespeichert werden');
      return false;
    }

    toast.success(editingWorld ? 'Welt gespeichert' : 'Welt erstellt');
    setEditingWorld(null);
    return true;
  };

  const handleDeleteWorld = async (world: WorldProfileVm) => {
    if (!confirm(`Möchtest du die Welt "${world.name}" wirklich löschen?`)) {
      return;
    }

    const success = await deleteWorld(world.id);
    if (success) {
      toast.success('Welt gelöscht');
    } else {
      toast.error('Welt konnte nicht gelöscht werden');
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(normalizedSearch) ||
    char.class.toLowerCase().includes(normalizedSearch) ||
    char.race.toLowerCase().includes(normalizedSearch)
  );

  const renderCharacter = (char: CharacterVm, context: EntityBrowserRenderContext) => (
    <EntityBrowserCard
      title={char.name}
      meta={`Level ${char.level} · ${char.race} · ${char.class}`}
      imageUrl={char.portraitUrl}
      imageAlt={`Portrait von ${char.name}`}
      imageFallback={char.name}
      variant={context.variant}
      isCenter={context.isCenter}
      onOpen={context.isCenter || context.variant === 'list' ? () => onNavigate('character-editor') : undefined}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onNavigate('character-editor')}
          >
            <Edit className="w-3 h-3 mr-1" />
            <span className="text-xs">Bearbeiten</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={`${char.name} löschen`}
            onClick={() => void handleDeleteCharacter(char.id, char.name)}
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </>
      }
    />
  );

  const renderCharacterCard = (
    char: (typeof filteredCharacters)[number],
    context: EntityBrowserRenderContext,
  ) => (
    <EntityBrowserCard
      title={char.name}
      meta={`Level ${char.level} · ${char.race} · ${char.class}`}
      imageUrl={char.portraitUrl}
      imageAlt={`Portrait von ${char.name}`}
      imageFallback={char.name}
      variant={context.variant === 'carousel' ? 'carousel' : 'list'}
      isCenter={context.isCenter}
      onOpen={context.isCenter || context.variant === 'list' ? () => onNavigate('character-editor') : undefined}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onNavigate('character-editor')}
          >
            <Edit className="w-3 h-3 mr-1" />
            <span className="text-xs">Bearbeiten</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label={`${char.name} löschen`}
            onClick={() => void handleDeleteCharacter(char.id, char.name)}
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </>
      }
    />
  );
  const filteredWorlds = worlds.filter((world) =>
    world.name.toLowerCase().includes(normalizedSearch) ||
    world.description.toLowerCase().includes(normalizedSearch)
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl">Meine Bibliothek</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Verwalte deine Charaktere, Abenteuer und Welten
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suche in deiner Bibliothek..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="characters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="characters">
              <User className="w-4 h-4 mr-2" />
              Charaktere
            </TabsTrigger>
            <TabsTrigger value="adventures">
              <BookOpen className="w-4 h-4 mr-2" />
              Abenteuer
            </TabsTrigger>
            <TabsTrigger value="worlds">
              <Globe2 className="w-4 h-4 mr-2" />
              Welten
            </TabsTrigger>
          </TabsList>

          <TabsContent value="characters" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Lädt...' : `${filteredCharacters.length} Charakter${filteredCharacters.length !== 1 ? 'e' : ''}`}
              </p>
              <Button size="sm" onClick={() => onNavigate('character-editor')}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Neuer Charakter</span>
                <span className="sm:hidden">Neu</span>
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCharacters.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Keine Charaktere gefunden' : 'Noch keine Charaktere erstellt'}
                </p>
                <Button onClick={() => onNavigate('character-editor')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Charakter erstellen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredCharacters.map((char) => (
                  <Card key={char.id} className="hover:border-primary transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm md:text-base truncate">{char.name}</CardTitle>
                          <CardDescription className="text-xs md:text-sm">
                            Level {char.level} {char.race} {char.class}
                          </CardDescription>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => onNavigate('character-editor')}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          <span className="text-xs">Bearbeiten</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDeleteCharacter(char.id, char.name)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="adventures" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">2 Abenteuer</p>
              <Button size="sm" onClick={() => onNavigate('adventure-editor')}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Neues Abenteuer</span>
                <span className="sm:hidden">Neu</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {[
                { title: 'Das vergessene Königreich', genre: 'Fantasy', scenes: 5 },
                { title: 'Schatten über Neverwinter', genre: 'Fantasy', scenes: 8 },
              ].map((adv, i) => (
                <Card key={i} className="hover:border-primary transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm md:text-base">{adv.title}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {adv.genre} • {adv.scenes} Szenen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-3 h-3 mr-1" />
                        <span className="text-xs">Bearbeiten</span>
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="worlds" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {worldsLoading ? 'Lädt...' : `${filteredWorlds.length} Welt${filteredWorlds.length !== 1 ? 'en' : ''}`}
              </p>
              <Button size="sm" onClick={openCreateWorld}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Neue Welt</span>
                <span className="sm:hidden">Neu</span>
              </Button>
            </div>

            {worldsError && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{worldsError}</p>
              </div>
            )}

            {worldsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredWorlds.length === 0 ? (
              <div className="text-center py-12">
                <Globe2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Keine Welten gefunden' : 'Noch keine Welten erstellt'}
                </p>
                {!searchQuery && (
                  <Button onClick={openCreateWorld}>
                    <Plus className="w-4 h-4 mr-2" />
                    Erste Welt erstellen
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredWorlds.map((world) => {
                  const speciesDevelopmentMode = getSpeciesDevelopmentMode(world.modules);
                  return (
                    <Card key={world.id} className="hover:border-primary transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm md:text-base truncate">{world.name}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2 text-xs md:text-sm">
                              {world.description || 'Keine Beschreibung'}
                            </CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Globe2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Speziesentwicklung: <span className="font-medium text-foreground">{SPECIES_DEVELOPMENT_MODE_LABELS[speciesDevelopmentMode]}</span>
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditWorld(world)}>
                            <Edit className="w-3 h-3 mr-1" />
                            <span className="text-xs">Bearbeiten</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`${world.name} löschen`}
                            onClick={() => void handleDeleteWorld(world)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <WorldProfileEditorDialog
        open={worldEditorOpen}
        world={editingWorld}
        onOpenChange={(open) => {
          setWorldEditorOpen(open);
          if (!open) setEditingWorld(null);
        }}
        onSave={handleSaveWorld}
      />
    </div>
  );
}
