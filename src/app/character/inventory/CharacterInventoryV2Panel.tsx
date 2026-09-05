/**
 * CharacterInventoryV2Panel — orchestrates Inventory v2 desktop UI (#110).
 * Loads catalog via item-catalog-service, applies domain ops (add/move/merge/
 * sort/consume/remove/overflow) through onChange, and surfaces load info for
 * the character editor sidebar.
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
import { InventoryOverflowSection } from './InventoryOverflowSection';
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
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalogRefreshKey = useRef(0);

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
    refreshCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on identity change only
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

    // Idle click on occupied starts move selection when empty target expected later via menu.
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

  const selectedSourceSlot =
    mode.kind === 'move' || mode.kind === 'split' ? mode.sourceSlot : null;

  return (
    <div className="space-y-5" data-character-inventory-v2>
      <InventorySummaryBar
        occupiedSlots={occupied}
        totalLoad={totalLoad}
        strength={strength}
        overflowCount={state.legacyOverflow.length}
      />

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
        <div className="w-full space-y-2 sm:max-w-xs">
          <Label htmlFor="inventory-grid-filter">Filter (nur Anzeige)</Label>
          <Input
            id="inventory-grid-filter"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Name / Typ filtern…"
          />
        </div>
      </div>

      {mode.kind !== 'idle' && (
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
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode({ kind: 'idle' })}>
            Abbrechen
          </Button>
        </div>
      )}

      {catalogError && (
        <p className="text-sm text-destructive">
          {catalogError}{' '}
          <button type="button" className="underline" onClick={refreshCatalog}>
            Erneut laden
          </button>
        </p>
      )}

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
        onRequestMove={(slotIndex) => {
          setMode({ kind: 'move', sourceSlot: slotIndex });
          toast('Zielplatz wählen (klicken)');
        }}
        onRequestSplit={handleRequestSplit}
      />

      <p className="text-xs text-muted-foreground">
        {BASE_SLOT_COUNT} feste Basisplätze. Drag & Drop oder Menü „Verschieben“. Filter ändert
        nicht die gespeicherte Reihenfolge.
      </p>

      <InventoryOverflowSection
        state={state}
        lookup={lookup}
        onApplyResult={apply}
        onRefuse={refuse}
      />

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
    </div>
  );
}
