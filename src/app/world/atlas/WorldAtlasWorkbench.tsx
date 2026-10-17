/**
 * WorldAtlasWorkbench — shared Library + Saga atlas workstation (#702).
 * Location: src/app/world/atlas/WorldAtlasWorkbench.tsx
 *
 * Default: Unified Canvas multi-scale editor. Legacy tiles keep tile editor.
 */
import { useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  Loader2,
  Map as MapIcon,
  Plus,
  Save,
  Upload,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Label } from '../../../shared/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../../shared/ui/sheet';
import type { WorldPlaceKind, WorldPlaceVm } from '../../../domains/world/places';
import { WorldMapEditorScreen } from '../map';
import { WorldPlacesPanel } from '../places/WorldPlacesPanel';
import { useWorldAtlasEditor } from './useWorldAtlasEditor';
import { UnifiedAtlasEditor } from './unified';
import { worldAtlasService } from '../../../infrastructure/world/world-atlas-service';
import { worldPlaceService } from '../../../infrastructure/world/world-place-service';

function detailUsageForPlace(kind: WorldPlaceKind) {
  if (kind === 'dungeon') return 'dungeon' as const;
  if (kind === 'building' || kind === 'interior') return 'interior' as const;
  if (kind === 'settlement') return 'footprint' as const;
  return 'battlemap' as const;
}

function mapKindForPlace(kind: WorldPlaceKind) {
  if (kind === 'settlement') return 'settlement' as const;
  if (kind === 'region' || kind === 'area' || kind === 'realm') return 'region' as const;
  return 'scene' as const;
}

export type WorldAtlasWorkbenchProps = {
  readonly worldProfileId: string;
  readonly canEdit: boolean;
  readonly playerView?: boolean;
  /** When set, place list can filter by saga reveal for players. */
  readonly sagaPublicId?: string | null;
  readonly onBack?: () => void;
  readonly title?: string;
};

export function WorldAtlasWorkbench({
  worldProfileId,
  canEdit,
  playerView = false,
  sagaPublicId = null,
  onBack,
  title = 'Weltatlas',
}: WorldAtlasWorkbenchProps) {
  const editor = useWorldAtlasEditor({ worldProfileId, canEdit, playerView });
  const fileRef = useRef<HTMLInputElement>(null);
  const [childTitle, setChildTitle] = useState('Detailkarte');
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const showLegacyTiles = editor.map?.kind === 'legacy_tiles';
  const showUnified = Boolean(editor.map && !showLegacyTiles);

  const handleCreateDetailMap = async (place: WorldPlaceVm) => {
    if (!canEdit) return;
    const created = await editor.createChildMap(`${place.name} (Detail)`, {
      kind: mapKindForPlace(place.kind),
      generatorMeta: {
        placeId: place.id,
        placeSeedKey: place.seedKey,
        detailMissing: false,
      },
    });
    if (!created) return;
    try {
      await worldPlaceService.linkMap({
        worldProfileId,
        placeId: place.id,
        mapId: created.id,
        usage: detailUsageForPlace(place.kind),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const hierarchyList = (
    <ul className="space-y-1" data-world-atlas-hierarchy>
      {editor.summaries.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm ${
              item.id === editor.activeMapId
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
            onClick={() => {
              editor.setActiveMapId(item.id);
              setHierarchyOpen(false);
            }}
          >
            <span className="truncate">{item.title}</span>
            <span className="ml-auto shrink-0 text-xs opacity-70">{item.kind}</span>
          </button>
        </li>
      ))}
      {editor.summaries.length === 0 && (
        <li className="px-3 py-2 text-sm text-muted-foreground">Noch keine Karten.</li>
      )}
    </ul>
  );

  const metaPanel = (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Eigenschaften
        </p>
        {editor.map ? (
          <dl className="mt-2 space-y-1 text-sm">
            <div>
              <dt className="text-muted-foreground">Titel</dt>
              <dd className="font-medium">{editor.map.title}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Typ</dt>
              <dd>{editor.map.kind}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Revision</dt>
              <dd>{editor.map.revision}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Keine Auswahl.</p>
        )}
      </div>

      {canEdit ? (
        <div className="space-y-2 border-t border-border pt-3">
          <Label htmlFor="atlas-child-title">Detailkarte anlegen</Label>
          <Input
            id="atlas-child-title"
            className="min-h-11"
            value={childTitle}
            onChange={(e) => setChildTitle(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={editor.saving || !editor.map}
            onClick={() => void editor.createChildMap(childTitle)}
          >
            <Plus className="size-4" aria-hidden />
            Detailkarte verknüpfen
          </Button>
        </div>
      ) : null}

      {canEdit ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm font-medium">Azgaar Fantasy Map</p>
          <p className="text-xs text-muted-foreground">
            Speichert die native <code>.map</code>-Datei in Storage. Zum Weiterbearbeiten
            herunterladen und erneut importieren.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".map,.zip,application/octet-stream"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void editor.importAzgaarMap(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={editor.saving || !editor.map}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            .map importieren
          </Button>
          {editor.map?.azgaarMapStoragePath ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full"
              onClick={() => {
                void worldAtlasService
                  .createSignedUrl(editor.map!.azgaarMapStoragePath!)
                  .then((url) => {
                    window.open(url, '_blank', 'noopener,noreferrer');
                  })
                  .catch((err: unknown) => {
                    console.error(err);
                  });
              }}
            >
              <Download className="size-4" aria-hidden />
              .map herunterladen
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={`@container/main flex h-full min-h-0 w-full min-w-0 flex-col gap-3 ${
        focusMode ? 'data-[atlas-focus=true]:gap-1' : ''
      }`}
      data-world-atlas-workbench
      data-atlas-focus={focusMode ? 'true' : 'false'}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {onBack && !focusMode ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={onBack}>
            Zurück
          </Button>
        ) : null}
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{title}</h1>
        <Button
          type="button"
          variant={focusMode ? 'default' : 'outline'}
          className="min-h-11"
          aria-pressed={focusMode}
          data-atlas-focus-toggle
          onClick={() => setFocusMode((v) => !v)}
        >
          {focusMode ? 'Fokus beenden' : 'Fokusmodus'}
        </Button>
        <Sheet open={hierarchyOpen} onOpenChange={setHierarchyOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11 @[48rem]:hidden">
              <MapIcon className="size-4" aria-hidden />
              Karten
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,20rem)]">
            <SheetHeader>
              <SheetTitle>Kartenhierarchie</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{hierarchyList}</div>
          </SheetContent>
        </Sheet>
        {showUnified ? (
          <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" className="min-h-11 @[64rem]:hidden">
                Meta
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)]">
              <SheetHeader>
                <SheetTitle>Atlas</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{metaPanel}</div>
            </SheetContent>
          </Sheet>
        ) : null}
        {canEdit && editor.map && showUnified ? (
          <Button
            type="button"
            className="min-h-11"
            disabled={editor.saving || !editor.dirtyCanvas}
            onClick={() => {
              void editor.saveCanvas();
            }}
          >
            {editor.saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            Speichern
          </Button>
        ) : null}
      </header>

      {editor.error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3" role="alert">
          <p className="text-sm text-destructive">{editor.error}</p>
        </div>
      ) : null}

      {editor.breadcrumb.length > 0 && !focusMode ? (
        <nav
          className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          aria-label="Kartennavigation"
          data-world-atlas-breadcrumb
        >
          {editor.breadcrumb.map((crumb, index) => (
            <span key={crumb.id} className="inline-flex items-center gap-1">
              {index > 0 ? <ChevronRight className="size-3.5 shrink-0" aria-hidden /> : null}
              <button
                type="button"
                className="min-h-11 rounded px-1 text-foreground underline-offset-2 hover:underline"
                onClick={() => editor.setActiveMapId(crumb.id)}
              >
                {crumb.title}
              </button>
            </span>
          ))}
        </nav>
      ) : null}

      <div
        className={
          focusMode
            ? 'grid min-h-[70vh] flex-1 grid-cols-1'
            : showUnified
              ? 'grid min-h-0 flex-1 gap-3 @[64rem]:grid-cols-[minmax(0,1fr)_14rem]'
              : 'grid min-h-0 flex-1 gap-3 @[48rem]:grid-cols-[14rem_minmax(0,1fr)_16rem]'
        }
      >
        {!showUnified && !focusMode ? (
          <aside className="hidden min-h-0 overflow-auto rounded-lg border border-border p-2 @[48rem]:block">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hierarchie
            </p>
            {hierarchyList}
          </aside>
        ) : null}

        <section className={`relative min-w-0 overflow-hidden ${focusMode ? 'min-h-[70vh]' : 'min-h-[24rem]'}`}>
          {editor.loading && !editor.map ? (
            <div className="flex h-full min-h-[24rem] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Atlas wird geladen…
            </div>
          ) : showLegacyTiles && editor.map ? (
            <div className="flex h-full min-h-0 flex-col gap-2" data-world-atlas-legacy-tiles>
              <p className="text-sm text-muted-foreground">
                Legacy-Kachelkarte — bestehende Pins und Terrain bleiben erhalten. Für den Unified
                Atlas die Karte „Weltkarte (Unified)“ in der Hierarchie wählen.
              </p>
              <div className="min-h-0 flex-1 overflow-auto">
                {canEdit ? (
                  <WorldMapEditorScreen worldProfileId={worldProfileId} embedded />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ansicht nur für Bearbeiter mit Kachel-Editor.
                  </p>
                )}
              </div>
            </div>
          ) : showUnified && editor.map ? (
            <UnifiedAtlasEditor
              key={`${editor.map.id}:${editor.map.revision}`}
              doc={editor.canvasDoc}
              canEdit={canEdit}
              onDocChange={editor.updateCanvasDoc}
              dungeonMeta={editor.dungeonMeta}
              onDungeonMetaChange={editor.updateDungeonMeta}
            />
          ) : (
            <div className="flex h-full min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
              Keine Karte ausgewählt.
            </div>
          )}
        </section>

        <aside
          className={`min-h-0 space-y-4 overflow-auto rounded-lg border border-border p-3 ${
            focusMode
              ? 'hidden'
              : showUnified
                ? 'hidden @[64rem]:block'
                : 'hidden @[48rem]:block'
          }`}
        >
          {!showUnified ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Gespeicherte Karten
              </p>
              {hierarchyList}
            </>
          ) : null}
          <WorldPlacesPanel
            worldProfileId={worldProfileId}
            canEdit={canEdit}
            playerView={playerView}
            sagaPublicId={sagaPublicId}
            activeMapId={editor.activeMapId}
            onOpenMap={(mapId) => editor.setActiveMapId(mapId)}
            onCreateDetailMap={canEdit ? handleCreateDetailMap : undefined}
          />
          {metaPanel}
        </aside>
      </div>

      {showUnified && !focusMode ? (
        <aside className="hidden rounded-lg border border-border p-2 @[48rem]:block @[64rem]:hidden">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Gespeicherte Karten
          </p>
          <p className="mb-2 px-2 text-[11px] text-muted-foreground">
            Persistierte DB-Karten (Demo-Eldoria ist nicht kanonisch).
          </p>
          {hierarchyList}
          <div className="mt-3 border-t border-border pt-2">
            <WorldPlacesPanel
              worldProfileId={worldProfileId}
              canEdit={canEdit}
              playerView={playerView}
              sagaPublicId={sagaPublicId}
              activeMapId={editor.activeMapId}
              onOpenMap={(mapId) => editor.setActiveMapId(mapId)}
              onCreateDetailMap={canEdit ? handleCreateDetailMap : undefined}
            />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
