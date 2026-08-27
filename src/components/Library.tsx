import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Search, User, BookOpen, Edit, Trash2, Loader2, Globe2 } from 'lucide-react';
import { useCharacters } from '../modules/characters';
import { useProjects } from '../modules/projects';
import {
  WorldProfileEditorDialog,
  buildEffectiveWorldConfigForParticipation,
  getSpeciesDevelopmentMode,
  useAccessibleWorldProfiles,
  useWorldProfiles,
  type CreateWorldProfileDto,
  type WorldProfileVm,
} from '../modules/worlds';
import { useAuth } from '../lib/auth-context';
import { toast } from 'sonner';

interface LibraryProps {
  onNavigate: (view: string) => void;
}

const SPECIES_DEVELOPMENT_MODE_LABELS = {
  explicit: 'Explizit',
  progressive: 'Progressiv',
  disabled: 'Deaktiviert',
} as const;

export function Library({ onNavigate }: LibraryProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [worldEditorOpen, setWorldEditorOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<WorldProfileVm | null>(null);
  const { characters, isLoading, error, deleteCharacter } = useCharacters();
  const {
    projects,
    isLoading: projectsLoading,
    error: projectsError,
    setWorldProfile,
    setMyCharacter,
    deleteProject,
  } = useProjects();
  const {
    worlds,
    isLoading: worldsLoading,
    error: worldsError,
    createWorld,
    updateWorld,
    deleteWorld,
  } = useWorldProfiles();

  const assignedWorldIds = projects
    .map((project) => project.worldProfileId)
    .filter((id): id is string => Boolean(id));
  const {
    worlds: accessibleAssignedWorlds,
    isLoading: assignedWorldsLoading,
    error: assignedWorldsError,
  } = useAccessibleWorldProfiles(assignedWorldIds);

  const worldById = new Map<string, WorldProfileVm>();
  for (const world of [...accessibleAssignedWorlds, ...worlds]) {
    worldById.set(world.id, world);
  }

  const handleDeleteCharacter = async (id: string, name: string) => {
    if (!confirm(`Möchtest du "${name}" wirklich löschen?`)) return;
    const success = await deleteCharacter(id);
    if (success) toast.success('Charakter gelöscht');
    else toast.error('Fehler beim Löschen');
  };

  const handleDeleteAdventure = async (id: string, name: string) => {
    if (!confirm(`Möchtest du das Abenteuer "${name}" wirklich löschen?`)) return;
    try {
      await deleteProject(id);
      toast.success('Abenteuer gelöscht');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Abenteuer konnte nicht gelöscht werden');
    }
  };

  const handleAdventureWorldChange = async (projectId: string, worldProfileId: string) => {
    try {
      await setWorldProfile(projectId, worldProfileId);
      toast.success('Welt zugewiesen');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Welt konnte nicht zugewiesen werden');
    }
  };

  const handleAdventureCharacterChange = async (projectId: string, characterId: string) => {
    try {
      await setMyCharacter(projectId, characterId);
      toast.success('Charakter zugewiesen');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Charakter konnte nicht zugewiesen werden');
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
    if (!confirm(`Möchtest du die Welt "${world.name}" wirklich löschen?`)) return;
    const success = await deleteWorld(world.id);
    if (success) toast.success('Welt gelöscht');
    else toast.error('Welt konnte nicht gelöscht werden');
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredCharacters = characters.filter((character) =>
    character.name.toLowerCase().includes(normalizedSearch) ||
    character.class.toLowerCase().includes(normalizedSearch) ||
    character.race.toLowerCase().includes(normalizedSearch)
  );
  const filteredWorlds = worlds.filter((world) =>
    world.name.toLowerCase().includes(normalizedSearch) ||
    world.description.toLowerCase().includes(normalizedSearch)
  );
  const filteredProjects = projects.filter((project) => {
    const worldName = project.worldProfileId ? worldById.get(project.worldProfileId)?.name ?? '' : '';
    return project.name.toLowerCase().includes(normalizedSearch)
      || (project.description ?? '').toLowerCase().includes(normalizedSearch)
      || worldName.toLowerCase().includes(normalizedSearch);
  });

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl">Meine Bibliothek</h1>
          <p className="text-muted-foreground text-sm md:text-base">Verwalte deine Charaktere, Abenteuer und Welten</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Suche in deiner Bibliothek..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="characters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="characters"><User className="w-4 h-4 mr-2" />Charaktere</TabsTrigger>
            <TabsTrigger value="adventures"><BookOpen className="w-4 h-4 mr-2" />Abenteuer</TabsTrigger>
            <TabsTrigger value="worlds"><Globe2 className="w-4 h-4 mr-2" />Welten</TabsTrigger>
          </TabsList>

          <TabsContent value="characters" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Lädt...' : `${filteredCharacters.length} Charakter${filteredCharacters.length !== 1 ? 'e' : ''}`}
              </p>
              <Button size="sm" onClick={() => onNavigate('character-editor')}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Neuer Charakter</span><span className="sm:hidden">Neu</span>
              </Button>
            </div>

            {error && <div className="p-3 bg-destructive/10 border border-destructive rounded-lg"><p className="text-sm text-destructive">{error}</p></div>}

            {isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : filteredCharacters.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{searchQuery ? 'Keine Charaktere gefunden' : 'Noch keine Charaktere erstellt'}</p>
                <Button onClick={() => onNavigate('character-editor')}><Plus className="w-4 h-4 mr-2" />Ersten Charakter erstellen</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filteredCharacters.map((character) => (
                  <Card key={character.id} className="hover:border-primary transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm md:text-base truncate">{character.name}</CardTitle>
                          <CardDescription className="text-xs md:text-sm">Level {character.level} {character.race} {character.class}</CardDescription>
                        </div>
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => onNavigate('character-editor')}>
                          <Edit className="w-3 h-3 mr-1" /><span className="text-xs">Bearbeiten</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => void handleDeleteCharacter(character.id, character.name)}>
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{projectsLoading ? 'Lädt...' : `${filteredProjects.length} Abenteuer`}</p>
              <Button size="sm" onClick={() => onNavigate('join')}>
                <Plus className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Neues Abenteuer</span><span className="sm:hidden">Neu</span>
              </Button>
            </div>

            {(projectsError || assignedWorldsError) && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg"><p className="text-sm text-destructive">{projectsError || assignedWorldsError}</p></div>
            )}

            {projectsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{searchQuery ? 'Keine Abenteuer gefunden' : 'Noch keine Abenteuer erstellt oder beigetreten'}</p>
                {!searchQuery && <Button onClick={() => onNavigate('join')}><Plus className="w-4 h-4 mr-2" />Abenteuer starten oder beitreten</Button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                {filteredProjects.map((project) => {
                  const assignedWorld = project.worldProfileId ? worldById.get(project.worldProfileId) ?? null : null;
                  const currentMember = project.members.find((member) => member.userId === user?.id && member.status === 'active') ?? null;
                  const currentCharacter = currentMember?.characterId
                    ? characters.find((character) => character.id === currentMember.characterId) ?? null
                    : null;
                  const isGm = project.gmUserId === user?.id;
                  const effectiveWorld = assignedWorld && currentMember?.characterId
                    ? buildEffectiveWorldConfigForParticipation(project.id, currentMember.characterId, assignedWorld)
                    : null;

                  return (
                    <Card key={project.id} className="hover:border-primary transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm md:text-base truncate">{project.name}</CardTitle>
                            <CardDescription className="mt-1 line-clamp-2 text-xs md:text-sm">{project.description || 'Keine Beschreibung'}</CardDescription>
                          </div>
                          <div className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{project.code}</div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Globe2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Welt:</span>
                            <span className="font-medium">{assignedWorld?.name ?? (project.worldProfileId && assignedWorldsLoading ? 'Wird geladen...' : 'Noch nicht zugewiesen')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Dein Charakter:</span>
                            <span className="font-medium">{currentCharacter?.name ?? (currentMember?.characterId ? 'Zugewiesener Charakter' : 'Noch nicht zugewiesen')}</span>
                          </div>
                          {effectiveWorld ? (
                            <p className="text-xs text-muted-foreground">
                              Effektive Weltregel · Speziesentwicklung: <span className="font-medium text-foreground">{SPECIES_DEVELOPMENT_MODE_LABELS[effectiveWorld.speciesDevelopmentMode]}</span>
                            </p>
                          ) : assignedWorld ? (
                            <p className="text-xs text-muted-foreground">Die Weltregeln werden für dich wirksam, sobald dieser Teilnahme ein Charakter zugewiesen ist.</p>
                          ) : null}
                        </div>

                        {isGm && (
                          <div className="space-y-2">
                            <Label htmlFor={`adventure-world-${project.id}`}>Welt des Abenteuers</Label>
                            <Select
                              value={project.worldProfileId ?? undefined}
                              onValueChange={(value) => void handleAdventureWorldChange(project.id, value)}
                              disabled={worldsLoading || worlds.length === 0}
                            >
                              <SelectTrigger id={`adventure-world-${project.id}`} aria-label={`${project.name}: Weltprofil`}><SelectValue placeholder="Welt zuweisen" /></SelectTrigger>
                              <SelectContent>{worlds.map((world) => <SelectItem key={world.id} value={world.id}>{world.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}

                        {currentMember && (
                          <div className="space-y-2">
                            <Label htmlFor={`adventure-character-${project.id}`}>Dein Charakter in diesem Abenteuer</Label>
                            <Select
                              value={currentMember.characterId ?? undefined}
                              onValueChange={(value) => void handleAdventureCharacterChange(project.id, value)}
                              disabled={isLoading || characters.length === 0}
                            >
                              <SelectTrigger id={`adventure-character-${project.id}`} aria-label={`${project.name}: eigener Charakter`}><SelectValue placeholder="Charakter zuweisen" /></SelectTrigger>
                              <SelectContent>{characters.map((character) => <SelectItem key={character.id} value={character.id}>{character.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => onNavigate('join')}>Verwalten</Button>
                          {isGm && (
                            <Button variant="outline" size="sm" aria-label={`${project.name} löschen`} onClick={() => void handleDeleteAdventure(project.id, project.name)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="worlds" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{worldsLoading ? 'Lädt...' : `${filteredWorlds.length} Welt${filteredWorlds.length !== 1 ? 'en' : ''}`}</p>
              <Button size="sm" onClick={openCreateWorld}><Plus className="w-4 h-4 mr-2" /><span className="hidden sm:inline">Neue Welt</span><span className="sm:hidden">Neu</span></Button>
            </div>

            {worldsError && <div className="p-3 bg-destructive/10 border border-destructive rounded-lg"><p className="text-sm text-destructive">{worldsError}</p></div>}

            {worldsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : filteredWorlds.length === 0 ? (
              <div className="text-center py-12">
                <Globe2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{searchQuery ? 'Keine Welten gefunden' : 'Noch keine Welten erstellt'}</p>
                {!searchQuery && <Button onClick={openCreateWorld}><Plus className="w-4 h-4 mr-2" />Erste Welt erstellen</Button>}
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
                            <CardDescription className="mt-1 line-clamp-2 text-xs md:text-sm">{world.description || 'Keine Beschreibung'}</CardDescription>
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Globe2 className="w-6 h-6 text-muted-foreground" /></div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Speziesentwicklung: <span className="font-medium text-foreground">{SPECIES_DEVELOPMENT_MODE_LABELS[speciesDevelopmentMode]}</span>
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditWorld(world)}><Edit className="w-3 h-3 mr-1" /><span className="text-xs">Bearbeiten</span></Button>
                          <Button variant="outline" size="sm" aria-label={`${world.name} löschen`} onClick={() => void handleDeleteWorld(world)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
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
