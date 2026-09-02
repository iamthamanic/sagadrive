import { lazy, Suspense, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Plus, Search, User, BookOpen, Edit, Trash2, Loader2, Globe2 } from 'lucide-react';
import { useCharacterSummaries } from '../modules/characters/hooks/useCharacterSummaries';
import type { CharacterSummaryVm } from '../modules/characters/types/character.types';
import { CreateCharacterEntryDialog } from '../modules/characters/components/CreateCharacterEntryDialog';
import { useProjectSummaries } from '../modules/projects/hooks/useProjectSummaries';
import type { ProjectSummaryVm } from '../modules/projects/types/project.types';
import { useAuth } from '../lib/auth-context';
import { EntityBrowser, type EntityBrowserRenderContext } from './EntityBrowser';
import { EntityBrowserCard } from './EntityBrowserCard';
import { getSpeciesDevelopmentMode } from '../modules/worlds/worldModuleRegistry';
import { useWorldProfiles } from '../modules/worlds/hooks/useWorldProfiles';
import type { CreateWorldProfileDto, WorldProfileVm } from '../modules/worlds/types/world.types';
import { toast } from 'sonner';
import { setCharacterEditorBootstrap } from '../modules/characters/characterEditorBootstrap';

const WorldProfileEditorDialog = lazy(() =>
  import('../modules/worlds/components/WorldProfileEditorDialog').then((module) => ({
    default: module.WorldProfileEditorDialog,
  })),
);

interface LibraryProps {
  onNavigate: (view: string) => void;
}

type LibraryTab = 'characters' | 'adventures' | 'worlds';

const SPECIES_DEVELOPMENT_MODE_LABELS = {
  explicit: 'Explizit',
  progressive: 'Progressiv',
  disabled: 'Deaktiviert',
} as const;

const CHARACTER_VIEW_MODE_STORAGE_KEY = 'sagadrive_library_characters_view_mode';
const ADVENTURE_VIEW_MODE_STORAGE_KEY = 'sagadrive_library_adventures_view_mode';
const WORLD_VIEW_MODE_STORAGE_KEY = 'sagadrive_library_worlds_view_mode';

const PROJECT_STATUS_LABELS: Record<ProjectSummaryVm['status'], string> = {
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Abgeschlossen',
  archived: 'Archiviert',
};

export function Library({ onNavigate }: LibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<LibraryTab>('characters');
  const [visitedTabs, setVisitedTabs] = useState<Set<LibraryTab>>(() => new Set(['characters']));
  const [createCharacterOpen, setCreateCharacterOpen] = useState(false);
  const [worldEditorOpen, setWorldEditorOpen] = useState(false);
  const [editingWorld, setEditingWorld] = useState<WorldProfileVm | null>(null);
  const { user } = useAuth();

  const { characters, isLoading, error, deleteCharacter, refreshCharacters } = useCharacterSummaries({
    enabled: visitedTabs.has('characters'),
  });
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjectSummaries({
    enabled: visitedTabs.has('adventures'),
  });
  const {
    worlds,
    isLoading: worldsLoading,
    error: worldsError,
    createWorld,
    updateWorld,
    deleteWorld,
  } = useWorldProfiles({ enabled: visitedTabs.has('worlds') });

  // Always re-fetch character summaries when Library mounts so saves from the
  // editor are visible immediately (cache may still look "fresh" otherwise).
  useEffect(() => {
    void refreshCharacters({ force: true });
  }, [refreshCharacters]);

  const handleTabChange = (value: string) => {
    const tab = value as LibraryTab;
    setActiveTab(tab);
    setVisitedTabs((current) => new Set(current).add(tab));
  };

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

  const openProject = (project: ProjectSummaryVm) => {
    const isGM = user !== null && project.gmUserId === user.id;
    onNavigate(isGM ? 'gamemaster' : 'join');
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(normalizedSearch) ||
    char.class.toLowerCase().includes(normalizedSearch) ||
    char.race.toLowerCase().includes(normalizedSearch)
  );
  const filteredWorlds = worlds.filter((world) =>
    world.name.toLowerCase().includes(normalizedSearch) ||
    world.description.toLowerCase().includes(normalizedSearch)
  );
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(normalizedSearch) ||
    (project.description ?? '').toLowerCase().includes(normalizedSearch) ||
    project.code.toLowerCase().includes(normalizedSearch)
  );

  const renderProject = (project: ProjectSummaryVm, context: EntityBrowserRenderContext) => (
    <EntityBrowserCard
      title={project.name}
      meta={project.description || 'Keine Beschreibung'}
      imageFallback={project.name}
      imageAlt={`Abenteuer ${project.name}`}
      metaChips={[
        PROJECT_STATUS_LABELS[project.status],
        `${project.memberCount} Mitglied${project.memberCount !== 1 ? 'er' : ''}`,
        `Code: ${project.code}`,
      ]}
      variant={context.variant}
      isCenter={context.isCenter}
      onOpen={context.variant === 'list' || context.isCenter ? () => openProject(project) : undefined}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => openProject(project)}
        >
          <BookOpen className="w-3 h-3 mr-1" />
          <span className="text-xs">
            {user !== null && project.gmUserId === user.id ? 'Leiten' : 'Öffnen'}
          </span>
        </Button>
      }
    />
  );

  const renderWorld = (world: WorldProfileVm, context: EntityBrowserRenderContext) => {
    const speciesDevelopmentMode = getSpeciesDevelopmentMode(world.modules);
    return (
      <EntityBrowserCard
        title={world.name}
        meta={world.description || 'Keine Beschreibung'}
        imageFallback={world.name}
        imageAlt={`Welt ${world.name}`}
        metaChips={[
          `Speziesentwicklung: ${SPECIES_DEVELOPMENT_MODE_LABELS[speciesDevelopmentMode]}`,
        ]}
        variant={context.variant}
        isCenter={context.isCenter}
        onOpen={context.variant === 'list' || context.isCenter ? () => openEditWorld(world) : undefined}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => openEditWorld(world)}
            >
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
          </>
        }
      />
    );
  };

  const renderCharacter = (char: CharacterSummaryVm, context: EntityBrowserRenderContext) => (
    <EntityBrowserCard
      title={char.name}
      meta={`Level ${char.level} · ${char.race} · ${char.class}`}
      imageUrl={char.portraitUrl}
      imageAlt={`Portrait von ${char.name}`}
      imageFallback={char.name}
      variant={context.variant}
      isCenter={context.isCenter}
      onOpen={context.variant === 'list' || context.isCenter ? () => {
        setCharacterEditorBootstrap({ kind: 'character-edit', characterId: char.id });
        onNavigate('character-editor');
      } : undefined}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setCharacterEditorBootstrap({ kind: 'character-edit', characterId: char.id });
              onNavigate('character-editor');
            }}
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

  const worldsEmptyState = (
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
  );

  const charactersEmptyState = (
    <div className="text-center py-12">
      <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground mb-4">
        {searchQuery ? 'Keine Charaktere gefunden' : 'Noch keine Charaktere erstellt'}
      </p>
      {!searchQuery && (
        <Button onClick={() => setCreateCharacterOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ersten Charakter erstellen
        </Button>
      )}
    </div>
  );

  const adventuresEmptyState = (
    <div className="text-center py-12">
      <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground mb-4">
        {searchQuery ? 'Keine Abenteuer gefunden' : 'Noch keine Abenteuer gestartet'}
      </p>
      {!searchQuery && (
        <Button onClick={() => onNavigate('join')}>
          <Plus className="w-4 h-4 mr-2" />
          Projekt starten
        </Button>
      )}
    </div>
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <EntityBrowser
                storageKey={CHARACTER_VIEW_MODE_STORAGE_KEY}
                items={filteredCharacters}
                getId={(char) => char.id}
                renderItem={renderCharacter}
                emptyState={charactersEmptyState}
                toolbarLeft={
                  <span>
                    {filteredCharacters.length} Charakter{filteredCharacters.length !== 1 ? 'e' : ''}
                  </span>
                }
                toolbarRight={
                  <Button size="sm" onClick={() => setCreateCharacterOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Neuer Charakter</span>
                    <span className="sm:hidden">Neu</span>
                  </Button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="adventures" className="space-y-4">
            {projectsError && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{projectsError}</p>
              </div>
            )}

            {projectsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <EntityBrowser
                storageKey={ADVENTURE_VIEW_MODE_STORAGE_KEY}
                items={filteredProjects}
                getId={(project) => project.id}
                renderItem={renderProject}
                emptyState={adventuresEmptyState}
                toolbarLeft={
                  <span>
                    {filteredProjects.length} Abenteuer{filteredProjects.length !== 1 ? 'er' : ''}
                  </span>
                }
                toolbarRight={
                  <Button size="sm" onClick={() => onNavigate('join')}>
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Projekt starten</span>
                    <span className="sm:hidden">Neu</span>
                  </Button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="worlds" className="space-y-4">
            {worldsError && (
              <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{worldsError}</p>
              </div>
            )}

            {worldsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <EntityBrowser
                storageKey={WORLD_VIEW_MODE_STORAGE_KEY}
                items={filteredWorlds}
                getId={(world) => world.id}
                renderItem={renderWorld}
                emptyState={worldsEmptyState}
                toolbarLeft={
                  <span>
                    {filteredWorlds.length} Welt{filteredWorlds.length !== 1 ? 'en' : ''}
                  </span>
                }
                toolbarRight={
                  <Button size="sm" onClick={openCreateWorld}>
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Neue Welt</span>
                    <span className="sm:hidden">Neu</span>
                  </Button>
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {worldEditorOpen && (
        <Suspense fallback={null}>
          <WorldProfileEditorDialog
            open={worldEditorOpen}
            world={editingWorld}
            onOpenChange={(open) => {
              setWorldEditorOpen(open);
              if (!open) setEditingWorld(null);
            }}
            onSave={handleSaveWorld}
          />
        </Suspense>
      )}

      <CreateCharacterEntryDialog
        open={createCharacterOpen}
        onOpenChange={setCreateCharacterOpen}
        onNavigateToEditor={() => onNavigate('character-editor')}
      />
    </div>
  );
}
