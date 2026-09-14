/**
 * NpcCreatureLibraryBrowser — Library tab NPCs & Kreaturen (#197) + promotion CTAs (#200).
 * Composes search, filters, EntityBrowser cards/list, empty/loading/error,
 * Statblock view, and Template/Compact/Controller actions.
 * Location: src/app/library/npc-creatures/NpcCreatureLibraryBrowser.tsx
 */
import { useState } from 'react';
import { Edit, Loader2, Plus, RefreshCw, Search, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  classifyNpcLibraryPromotionAction,
  deriveNpcCreaturePower,
  librarySourceOf,
  planCompactToFullPromotion,
  planTemplateToCharacterPromotion,
  type NpcCreatureCatalogRecord,
  type NpcCreatureDefinition,
} from '../../../domains/npc-creature';
import type { ProjectSummaryVm } from '../../../domains/project/contracts/project.types';
import { getAuthenticatedUserId } from '../../../lib/authenticatedUser';
import { setCharacterEditorBootstrap } from '../../character';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { EntityBrowser, type EntityBrowserRenderContext } from '../EntityBrowser';
import { EntityBrowserCard } from '../EntityBrowserCard';
import { NpcCreatureAssignControllerDialog } from './NpcCreatureAssignControllerDialog';
import { NpcCreatureLibraryFiltersBar } from './NpcCreatureLibraryFilters';
import { NpcCreatureStatblockView } from './NpcCreatureStatblockView';
import {
  formatNpcCombatMetaLine,
  formatNpcLevelMachtgradLine,
  LIBRARY_NPC_SOURCE_LABELS,
  NPC_CREATURE_CATEGORY_LABELS,
  NPC_CREATURE_LIBRARY_VIEW_MODE_STORAGE_KEY,
  NPC_CREATURE_SHEET_MODE_LABELS,
} from './npcCreatureLibraryLabels';
import { useNpcCreatureLibrary } from './useNpcCreatureLibrary';

type BrowserItem = NpcCreatureCatalogRecord & { id: string };

export interface NpcCreatureLibraryBrowserProps {
  enabled?: boolean;
  /** Opens Quick Create / full-character chooser (#198). */
  onCreateNpc?: () => void;
  /** Opens Statblock editor for an existing definition (#198). */
  onEditNpc?: (definitionId: string) => void;
  /** Opens CharacterEditor after promotion bootstrap (#200). */
  onNavigateToCharacterEditor?: () => void;
  /** Active campaigns where the current user is GM (#200). */
  gmProjects?: readonly ProjectSummaryVm[];
}

function toBrowserItems(
  records: readonly NpcCreatureCatalogRecord[],
): BrowserItem[] {
  return records.map((record) => ({
    ...record,
    id: record.definition.id,
  }));
}

function buildMetaChips(definition: NpcCreatureDefinition, machtgradLabel: string): string[] {
  const chips: string[] = [
    formatNpcLevelMachtgradLine(definition.level, machtgradLabel),
  ];
  if (definition.sheetMode === 'compact') {
    chips.push(
      formatNpcCombatMetaLine(definition.combatProfile, definition.combatRole),
    );
  }
  chips.push(NPC_CREATURE_SHEET_MODE_LABELS[definition.sheetMode]);
  chips.push(LIBRARY_NPC_SOURCE_LABELS[librarySourceOf(definition)]);
  return chips;
}

export function NpcCreatureLibraryBrowser({
  enabled = true,
  onCreateNpc,
  onEditNpc,
  onNavigateToCharacterEditor,
  gmProjects = [],
}: NpcCreatureLibraryBrowserProps) {
  const library = useNpcCreatureLibrary({ enabled });
  const [viewDefinition, setViewDefinition] = useState<NpcCreatureDefinition | null>(
    null,
  );
  const [statblockOpen, setStatblockOpen] = useState(false);
  const [assignDefinition, setAssignDefinition] = useState<NpcCreatureDefinition | null>(
    null,
  );
  const [assignOpen, setAssignOpen] = useState(false);

  const openStatblock = (definition: NpcCreatureDefinition) => {
    setViewDefinition(definition);
    setStatblockOpen(true);
  };

  const handleCreate = () => {
    onCreateNpc?.();
  };

  const openCharacterEditor = () => {
    if (onNavigateToCharacterEditor) {
      onNavigateToCharacterEditor();
      return;
    }
    toast.error('Charakter-Editor ist nicht verfügbar.');
  };

  const handleTemplateToCharacter = (definition: NpcCreatureDefinition) => {
    const result = planTemplateToCharacterPromotion(definition);
    if (result.ok === false) {
      toast.error(result.message);
      return;
    }
    setCharacterEditorBootstrap({ kind: 'npc-promotion', plan: result.plan });
    openCharacterEditor();
  };

  const handleCompactToFull = async (record: NpcCreatureCatalogRecord) => {
    try {
      const userId = await getAuthenticatedUserId();
      const result = planCompactToFullPromotion(record, {
        userId,
        editableWorldProfileIds:
          record.worldProfileId && record.definition.scope === 'world'
            ? [record.worldProfileId]
            : [],
      });
      if (result.ok === false) {
        toast.error(result.message);
        return;
      }
      setCharacterEditorBootstrap({ kind: 'npc-promotion', plan: result.plan });
      openCharacterEditor();
    } catch (error) {
      console.error('Compact→Full plan failed:', error);
      toast.error(
        error instanceof Error ? error.message : 'Ausbauen nicht möglich.',
      );
    }
  };

  const handleAssignController = (definition: NpcCreatureDefinition) => {
    if (gmProjects.length === 0) {
      toast.error('Spielerzuweisung braucht eine aktive Kampagne als Spielleitung.');
      return;
    }
    setAssignDefinition(definition);
    setAssignOpen(true);
  };

  const items = toBrowserItems(library.filteredRecords);
  const catalogEmpty = library.records.length === 0;

  const emptyState = library.hasActiveFilters ? (
    <div className="px-4 py-12 text-center" data-npc-library-empty>
      <Users className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" />
      <p className="mb-4 text-muted-foreground">Keine Treffer für Suche und Filter</p>
      <Button
        type="button"
        variant="outline"
        className="h-11 min-h-11"
        onClick={library.resetFilters}
      >
        Filter zurücksetzen
      </Button>
    </div>
  ) : catalogEmpty ? (
    <div className="px-4 py-12 text-center" data-npc-library-empty>
      <Users className="mx-auto mb-4 size-12 text-muted-foreground" aria-hidden="true" />
      <p className="mb-2 text-muted-foreground">
        Noch keine NPCs oder Kreaturen angelegt.
      </p>
      <p className="mx-auto mb-4 max-w-md text-sm text-muted-foreground">
        Ein Statblock ist für schnelle GM-Nutzung gedacht und kann später zu einem
        Charakterbogen ausgebaut werden.
      </p>
      <Button
        type="button"
        className="h-11 min-h-11"
        onClick={handleCreate}
        data-npc-library-create-empty
      >
        <Plus className="mr-2 size-4" aria-hidden="true" />
        Erste Figur erstellen
      </Button>
    </div>
  ) : (
    <div className="px-4 py-12 text-center" data-npc-library-empty>
      <p className="text-muted-foreground">Keine NPCs oder Kreaturen gefunden</p>
    </div>
  );

  const renderPromotionActions = (record: BrowserItem) => {
    const { definition } = record;
    const action = classifyNpcLibraryPromotionAction(definition);
    if (action === 'template-to-character') {
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-11 min-h-11 w-full"
          onClick={() => handleTemplateToCharacter(definition)}
          data-npc-library-template-to-character
        >
          Charakter daraus erstellen
        </Button>
      );
    }
    if (action === 'compact-to-full') {
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-11 min-h-11 w-full"
          onClick={() => void handleCompactToFull(record)}
          data-npc-library-compact-to-full
        >
          Als vollständigen Charakter ausbauen
        </Button>
      );
    }
    if (action === 'controller-assign' && gmProjects.length > 0) {
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-11 min-h-11 w-full"
          onClick={() => handleAssignController(definition)}
          data-npc-library-assign-controller
        >
          <UserPlus className="mr-1 size-3" aria-hidden="true" />
          Spieler zuweisen
        </Button>
      );
    }
    return null;
  };

  const renderItem = (
    record: BrowserItem,
    context: EntityBrowserRenderContext,
  ) => {
    const { definition } = record;
    const derived = deriveNpcCreaturePower(definition);
    const promotion = renderPromotionActions(record);
    return (
      <EntityBrowserCard
        title={definition.name}
        meta={NPC_CREATURE_CATEGORY_LABELS[definition.category]}
        metaChips={buildMetaChips(definition, derived.machtgradLabel)}
        imageAlt={`Portrait von ${definition.name}`}
        imageFallback={definition.name}
        variant={context.variant}
        isCenter={context.isCenter}
        onOpen={
          context.variant === 'list' || context.isCenter
            ? () => openStatblock(definition)
            : undefined
        }
        actions={
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-11 min-h-11 flex-1"
                onClick={() => openStatblock(definition)}
                aria-label={`${definition.name} öffnen`}
              >
                <span className="text-xs">Öffnen</span>
              </Button>
              {definition.scope === 'personal' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 min-h-11 flex-1"
                  onClick={() => onEditNpc?.(definition.id)}
                  aria-label={`${definition.name} bearbeiten`}
                  data-npc-library-edit
                >
                  <Edit className="mr-1 size-3" aria-hidden="true" />
                  <span className="text-xs">Bearbeiten</span>
                </Button>
              ) : null}
            </div>
            {promotion}
          </div>
        }
      />
    );
  };

  return (
    <div className="space-y-4" data-npc-library-browser>
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="NPCs & Kreaturen suchen…"
          value={library.searchQuery}
          onChange={(event) => library.setSearchQuery(event.target.value)}
          className="h-11 min-h-11 pl-10"
          aria-label="NPCs und Kreaturen suchen"
          data-npc-library-search
        />
      </div>

      <NpcCreatureLibraryFiltersBar
        filters={library.filters}
        onChange={library.setFilters}
        onReset={library.resetFilters}
        showReset={library.hasActiveFilters}
      />

      {library.error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-10 text-center"
          role="alert"
          data-npc-library-error
        >
          <p className="mb-4 text-sm text-destructive">{library.error}</p>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11"
            onClick={library.refresh}
          >
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            Erneut versuchen
          </Button>
        </div>
      ) : library.isLoading ? (
        <div
          className="flex items-center justify-center py-12"
          aria-busy="true"
          aria-label="NPCs und Kreaturen werden geladen"
          data-npc-library-loading
        >
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <EntityBrowser
          storageKey={NPC_CREATURE_LIBRARY_VIEW_MODE_STORAGE_KEY}
          items={items}
          getId={(item) => item.id}
          renderItem={renderItem}
          emptyState={emptyState}
          toolbarLeft={
            <span>
              {library.hasActiveFilters
                ? `${items.length} von ${library.records.length} Figuren`
                : `${items.length} Figur${items.length === 1 ? '' : 'en'}`}
            </span>
          }
          toolbarRight={
            <Button
              size="sm"
              className="h-11 min-h-11"
              onClick={handleCreate}
              data-npc-library-create
            >
              <Plus className="mr-2 size-4" aria-hidden="true" />
              Neu
            </Button>
          }
        />
      )}

      <NpcCreatureStatblockView
        definition={viewDefinition}
        open={statblockOpen}
        onOpenChange={(open) => {
          setStatblockOpen(open);
          if (!open) setViewDefinition(null);
        }}
      />

      <NpcCreatureAssignControllerDialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignDefinition(null);
        }}
        definition={assignDefinition}
        gmProjects={gmProjects}
      />
    </div>
  );
}
