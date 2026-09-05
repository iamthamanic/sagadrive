/**
 * CharacterInventoryV2Panel — orchestrates Inventory v2 UI (#110/#111/#113).
 * Loads catalog via item-catalog-service, applies domain ops through onChange.
 * Desktop (md+): base grid beside Ausrüstung + Schnellzugriff (lg:flex-row).
 * Mobile (<640px): segmented Inventar | Ausrüstung views; move via Sheet.
 * Location: src/app/character/inventory/CharacterInventoryV2Panel.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowUpDown, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  BASE_SLOT_COUNT,
  calculateTotalLoad,
  mergeStacks,
  moveBaseSlot,
  sortBaseGrid,
  splitStack,
  type InventoryState,
  type ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';
import {
  loadCharacterItemCatalog,
  type CharacterItemCatalog,
} from '../../../infrastructure/inventory/item-catalog-service';
import { InventoryBaseGrid } from './InventoryBaseGrid';
import { InventoryCatalogDialog } from './InventoryCatalogDialog';
import { InventoryContainerPanel } from './InventoryContainerPanel';
import { InventoryEquipmentPanel } from './InventoryEquipmentPanel';
import {
  InventoryMobileViewSwitch,
  type InventoryMobileView,
} from './InventoryMobileViewSwitch';
import { InventoryMoveTargetSheet } from './InventoryMoveTargetSheet';
import { InventoryOverflowSection } from './InventoryOverflowSection';
import { InventoryQuickSlotsBar } from './InventoryQuickSlotsBar';
import { InventorySummaryBar } from './InventorySummaryBar';

export interface InventoryLoadInfo {
  totalLoad: number;
  occupied: number;
}

export interface CharacterInventoryV2PanelProps {
  state: InventoryState;
  onChange: (next: InventoryState) => void;
  strength: number;
  characterId: string | null;
  userId: string;
  onLoadInfoChange?: (info: InventoryLoadInfo) => void;
}

type InteractionMode =
  | { kind: 'idle' }
  | { kind: 'move'; sourceSlot: number }
  | { kind: 'split'; sourceSlot: number; amount: number };

const emptyLookup: ItemDefinitionLookup = () => undefined;

/** Mobile inventory contract: segmented layout below 640px (Tailwind md). */
const NARROW_MAX_PX = 639;

function useIsNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${NARROW_MAX_PX}px)`);
    const sync = () => setNarrow(mql.matches);
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, []);

  return narrow;
}

export function CharacterInventoryV2Panel({
  state,
  onChange,
  strength,
  characterId,
  userId,
  onLoadInfoChange,
}: CharacterInventoryV2PanelProps) {
  const [catalog, setCatalog] = useState<CharacterItemCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [mode, setMode] = useState<InteractionMode>({ kind: 'idle' });
  const [splitAmount, setSplitAmount] = useState(1);
  const [highlightedSlots, setHighlightedSlots] = useState<ReadonlySet<number>>(new Set());
  const [openContainerInstanceId, setOpenContainerInstanceId] = useState<string | null>(null);
  const [pendingQuickAssignId, setPendingQuickAssignId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<InventoryMobileView>('inventar');
  const [moveSheetSlot, setMoveSheetSlot] = useState<number | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalogRefreshKey = useRef(0);
  const isNarrow = useIsNarrowViewport();

  const lookup = catalog?.lookup ?? emptyLookup;
  const occupied = state.baseSlots.filter((slot) => slot !== null).length;
  const totalLoad = calculateTotalLoad(state, lookup);
  const onLoadInfoChangeRef = useRef(onLoadInfoChange);
  onLoadInfoChangeRef.current = onLoadInfoChange;

  useEffect(() => {
    onLoadInfoChangeRef.current?.({ totalLoad, occupied });
  }, [totalLoad, occupied]);

  const refreshCatalog = () => {
    catalogRefreshKey.current += 1;
    const refreshId = catalogRefreshKey.current;
    if (!userId) {
      setCatalogError('Benutzer nicht angemeldet — Katalog nicht verfügbar.');
      return;
    }
    setCatalogLoading(true);
    setCatalogError('');
    void loadCharacterItemCatalog(characterId, userId)
      .then((next) => {
        if (refreshId !== catalogRefreshKey.current) return;
        setCatalog(next);
      })
      .catch((error) => {
        console.error('[inventory] catalog load failed', error);
        if (refreshId !== catalogRefreshKey.current) return;
        setCatalogError(
          error instanceof Error ? error.message : 'Katalog konnte nicht geladen werden.',
        );
      })
      .finally(() => {
        if (refreshId === catalogRefreshKey.current) setCatalogLoading(false);
      });
  };

  useEffect(() => {
    catalogRefreshKey.current += 1;
    const refreshId = catalogRefreshKey.current;
    if (!userId) {
      setCatalogError('Benutzer nicht angemeldet — Katalog nicht verfügbar.');
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError('');
    void loadCharacterItemCatalog(characterId, userId)
      .then((next) => {
        if (cancelled || refreshId !== catalogRefreshKey.current) return;
        setCatalog(next);
      })
      .catch((error) => {
        console.error('[inventory] catalog load failed', error);
        if (cancelled || refreshId !== catalogRefreshKey.current) return;
        setCatalogError(
          error instanceof Error ? error.message : 'Katalog konnte nicht geladen werden.',
        );
      })
      .finally(() => {
        if (!cancelled && refreshId === catalogRefreshKey.current) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [characterId, userId]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  const refuse = (reason: string) => {
    toast.error(reason);
  };

  const apply = (next: InventoryState) => {
    onChange(next);
  };

  const highlight = (slots: number[]) => {
    setHighlightedSlots(new Set(slots));
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedSlots(new Set()), 2500);
    const first = slots[0];
    if (first !== undefined) {
      const el = document.querySelector(`[data-slot-index="${first}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleDropSlot = (fromSlot: number, toSlot: number) => {
    const sourceId = state.baseSlots[fromSlot];
    const targetId = state.baseSlots[toSlot];
    if (sourceId === null) return;

    if (targetId !== null) {
      const merged = mergeStacks(state, lookup, sourceId, targetId);
      if (merged.ok) {
        apply(merged.state);
        return;
      }
    }

    const moved = moveBaseSlot(state, fromSlot, toSlot);
    if (moved.ok === false) {
      refuse(moved.reason);
      return;
    }
    apply(moved.state);
  };

  const handleSelectSlot = (slotIndex: number) => {
    if (mode.kind === 'move') {
      if (slotIndex === mode.sourceSlot) {
        setMode({ kind: 'idle' });
        return;
      }
      handleDropSlot(mode.sourceSlot, slotIndex);
      setMode({ kind: 'idle' });
      return;
    }

    if (mode.kind === 'split') {
      if (state.baseSlots[slotIndex] !== null) {
        refuse('Bitte einen leeren Inventarplatz wählen.');
        return;
      }
      const sourceId = state.baseSlots[mode.sourceSlot];
      if (!sourceId) {
        setMode({ kind: 'idle' });
        return;
      }
      const result = splitStack(state, lookup, sourceId, mode.amount, {
        kind: 'base',
        slotIndex,
      });
      if (result.ok === false) {
        refuse(result.reason);
        return;
      }
      apply(result.state);
      setMode({ kind: 'idle' });
      return;
    }
  };

  const handleSort = () => {
    const result = sortBaseGrid(state, lookup);
    if (result.ok === false) {
      refuse(result.reason);
      return;
    }
    apply(result.state);
    toast.success('Inventar sortiert');
  };

  const handleRequestSplit = (slotIndex: number) => {
    const instanceId = state.baseSlots[slotIndex];
    const instance = instanceId ? state.instances[instanceId] : undefined;
    if (!instance || instance.quantity < 2) {
      refuse('Stapel kann nicht geteilt werden.');
      return;
    }
    const amount = Math.min(instance.quantity - 1, Math.max(1, splitAmount));
    setSplitAmount(amount);
    setMode({ kind: 'split', sourceSlot: slotIndex, amount });
    toast('Leeren Zielplatz für den Teil-Stapel wählen');
  };

  const handleRequestMove = (slotIndex: number) => {
    if (isNarrow) {
      setMoveSheetSlot(slotIndex);
      setMode({ kind: 'idle' });
      return;
    }
    setMode({ kind: 'move', sourceSlot: slotIndex });
    toast('Zielplatz wählen (klicken)');
  };

  const selectedSourceSlot =
    mode.kind === 'move' || mode.kind === 'split' ? mode.sourceSlot : null;

  const toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          onClick={() => setCatalogOpen(true)}
          disabled={catalogLoading && !catalog}
        >
          <Plus className="mr-2 h-4 w-4" />
          Gegenstand hinzufügen
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={handleSort}>
          <ArrowUpDown className="mr-2 h-4 w-4" />
          Sortieren
        </Button>
      </div>
      <div className="w-full min-w-0 space-y-2 sm:max-w-xs">
        <Label htmlFor="inventory-grid-filter">Filter (nur Anzeige)</Label>
        <Input
          id="inventory-grid-filter"
          value={filterQuery}
          onChange={(event) => setFilterQuery(event.target.value)}
          placeholder="Name / Typ filtern…"
        />
      </div>
    </div>
  );

  const baseGridBlock = (
    <div className="min-w-0 flex-1 space-y-2">
      <InventoryBaseGrid
        state={state}
        lookup={lookup}
        strength={strength}
        selectedSourceSlot={selectedSourceSlot}
        moveMode={mode.kind === 'move' || mode.kind === 'split'}
        highlightedSlots={highlightedSlots}
        filterQuery={filterQuery}
        onSelectSlot={handleSelectSlot}
        onDropSlot={handleDropSlot}
        onApplyResult={apply}
        onRefuse={refuse}
        onRequestMove={handleRequestMove}
        onRequestSplit={handleRequestSplit}
        onOpenContainer={(containerInstanceId) => {
          setOpenContainerInstanceId(containerInstanceId);
        }}
        onRequestQuickAssign={(instanceId) => {
          setPendingQuickAssignId(instanceId);
        }}
      />
      <p className="text-xs text-muted-foreground">
        {BASE_SLOT_COUNT} feste Basisplätze.
        {isNarrow
          ? ' Menü „Verschieben“ öffnet die Zielplatz-Auswahl.'
          : ' Drag & Drop oder Menü „Verschieben“. Filter ändert nicht die gespeicherte Reihenfolge.'}
      </p>
    </div>
  );

  const equipmentBlock = (
    <aside className="w-full min-w-0 space-y-5 lg:w-72 lg:shrink-0">
      <InventoryEquipmentPanel
        state={state}
        lookup={lookup}
        strength={strength}
        onApplyResult={apply}
        onRefuse={refuse}
        onRequestQuickAssign={(instanceId) => {
          setPendingQuickAssignId(instanceId);
        }}
      />
      <InventoryQuickSlotsBar
        state={state}
        lookup={lookup}
        onApplyResult={apply}
        onRefuse={refuse}
        pendingAssignInstanceId={pendingQuickAssignId}
        onPendingAssignHandled={() => setPendingQuickAssignId(null)}
      />
    </aside>
  );

  const modeBanner =
    mode.kind !== 'idle' ? (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
        <span>
          {mode.kind === 'move'
            ? `Verschieben: Quellplatz ${mode.sourceSlot + 1} — Zielplatz wählen`
            : `Teilen: ${mode.amount} Einheit(en) von Platz ${mode.sourceSlot + 1} — leeren Zielplatz wählen`}
        </span>
        {mode.kind === 'split' && (
          <Input
            className="h-9 w-20"
            type="number"
            min={1}
            aria-label="Teilmenge"
            value={mode.amount}
            onChange={(event) => {
              const instanceId = state.baseSlots[mode.sourceSlot];
              const qty = instanceId ? state.instances[instanceId]?.quantity ?? 2 : 2;
              const nextAmount = Math.min(
                qty - 1,
                Math.max(1, Number.parseInt(event.target.value, 10) || 1),
              );
              setSplitAmount(nextAmount);
              setMode({ ...mode, amount: nextAmount });
            }}
          />
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11"
          onClick={() => setMode({ kind: 'idle' })}
        >
          Abbrechen
        </Button>
      </div>
    ) : null;

  const catalogErrorBanner = catalogError ? (
    <p className="text-sm text-destructive">
      {catalogError}{' '}
      <button type="button" className="underline" onClick={refreshCatalog}>
        Erneut laden
      </button>
    </p>
  ) : null;

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden" data-character-inventory-v2>
      <InventorySummaryBar
        occupiedSlots={occupied}
        totalLoad={totalLoad}
        strength={strength}
        overflowCount={state.legacyOverflow.length}
      />

      {isNarrow ? (
        <div className="space-y-5" data-inventory-mobile-layout>
          <InventoryMobileViewSwitch value={mobileView} onChange={setMobileView} />

          {mobileView === 'inventar' && (
            <div className="min-w-0 space-y-5" data-inventory-mobile-panel="inventar">
              {toolbar}
              {modeBanner}
              {catalogErrorBanner}
              {baseGridBlock}
              <InventoryOverflowSection
                state={state}
                lookup={lookup}
                onApplyResult={apply}
                onRefuse={refuse}
              />
            </div>
          )}

          {mobileView === 'ausruestung' && (
            <div className="min-w-0 space-y-5" data-inventory-mobile-panel="ausruestung">
              {equipmentBlock}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5" data-inventory-desktop-layout>
          {toolbar}
          {modeBanner}
          {catalogErrorBanner}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {baseGridBlock}
            {equipmentBlock}
          </div>
          <InventoryOverflowSection
            state={state}
            lookup={lookup}
            onApplyResult={apply}
            onRefuse={refuse}
          />
        </div>
      )}

      <InventoryCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        catalog={catalog}
        state={state}
        strength={strength}
        onApplyResult={apply}
        onRefuse={refuse}
        onCatalogRefresh={refreshCatalog}
        onHighlightSlots={highlight}
      />

      <InventoryContainerPanel
        open={openContainerInstanceId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenContainerInstanceId(null);
        }}
        containerInstanceId={openContainerInstanceId}
        state={state}
        lookup={lookup}
        onApplyResult={apply}
        onRefuse={refuse}
      />

      <InventoryMoveTargetSheet
        open={moveSheetSlot !== null}
        onOpenChange={(open) => {
          if (!open) setMoveSheetSlot(null);
        }}
        sourceSlot={moveSheetSlot}
        state={state}
        lookup={lookup}
        onPickTarget={(targetSlot) => {
          if (moveSheetSlot === null) return;
          handleDropSlot(moveSheetSlot, targetSlot);
          setMoveSheetSlot(null);
        }}
      />
    </div>
  );
}
