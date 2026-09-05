/**
 * InventoryCatalogDialog — Add-catalog for Inventory v2 desktop (#110).
 * Tabs Core / Welt (omitted without world) / Eigene; search + type filter;
 * add confirmation with quantity and dry-run slot preview via addItems on a clone.
 * Location: src/app/character/inventory/InventoryCatalogDialog.tsx
 */
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  addItems,
  calculateTotalLoad,
  cloneInventory,
  freeBaseSlotIndices,
  type InventoryState,
  type ItemDefinition,
  type ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';
import type { CharacterItemCatalog } from '../../../infrastructure/inventory/item-catalog-service';
import {
  INVENTORY_TYPE_FILTER_OPTIONS,
  INVENTORY_TYPE_LABELS,
  inventoryCarryCapacity,
} from './inventory-ui-labels';
import { PersonalItemFormDialog } from './PersonalItemFormDialog';

export interface InventoryCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: CharacterItemCatalog | null;
  state: InventoryState;
  strength: number;
  onApplyResult: (next: InventoryState) => void;
  onRefuse: (reason: string) => void;
  onCatalogRefresh: () => void;
  onHighlightSlots: (slots: number[]) => void;
}

function previewAdd(
  state: InventoryState,
  lookup: ItemDefinitionLookup,
  definitionId: string,
  quantity: number,
): {
  ok: boolean;
  reason?: string;
  newSlotsNeeded: number;
  projectedLoad: number;
  affectedSlots: number[];
} {
  const beforeFree = new Set(freeBaseSlotIndices(state));
  const result = addItems(cloneInventory(state), lookup, definitionId, quantity);
  if (result.ok === false) {
    return {
      ok: false,
      reason: result.reason,
      newSlotsNeeded: 0,
      projectedLoad: calculateTotalLoad(state, lookup),
      affectedSlots: [],
    };
  }
  const afterFree = freeBaseSlotIndices(result.state);
  const newSlotsNeeded = Math.max(0, beforeFree.size - afterFree.length);
  const affectedSlots: number[] = [];
  result.state.baseSlots.forEach((id, index) => {
    if (id === null) return;
    const beforeId = state.baseSlots[index];
    const beforeQty = beforeId ? state.instances[beforeId]?.quantity : undefined;
    const afterQty = result.state.instances[id]?.quantity;
    if (beforeId !== id || beforeQty !== afterQty) {
      affectedSlots.push(index);
    }
  });
  return {
    ok: true,
    newSlotsNeeded,
    projectedLoad: calculateTotalLoad(result.state, lookup),
    affectedSlots,
  };
}

export function InventoryCatalogDialog({
  open,
  onOpenChange,
  catalog,
  state,
  strength,
  onApplyResult,
  onRefuse,
  onCatalogRefresh,
  onHighlightSlots,
}: InventoryCatalogDialogProps) {
  const [tab, setTab] = useState('core');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ItemDefinition['type']>('all');
  const [selected, setSelected] = useState<ItemDefinition | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [personalOpen, setPersonalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<ItemDefinition | null>(null);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setQuantity(1);
      setSearch('');
      setTypeFilter('all');
      return;
    }
    setTab('core');
  }, [open]);

  const hasWorld = Boolean(catalog?.effectiveWorldProfileId);
  const overflowBlocks =
    state.legacyOverflow.length > 0
      ? 'Legacy-Overflow ist nicht leer — neue Basis-Stapel sind blockiert.'
      : null;

  const filterDefinitions = (scope: ItemDefinition['scope']): ItemDefinition[] => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();
    return catalog.addable.filter((definition) => {
      if (definition.scope !== scope) return false;
      if (typeFilter !== 'all' && definition.type !== typeFilter) return false;
      if (!q) return true;
      return (
        definition.name.toLowerCase().includes(q) ||
        definition.description.toLowerCase().includes(q)
      );
    });
  };

  const preview = selected && catalog
    ? previewAdd(state, catalog.lookup, selected.id, quantity)
    : null;

  const handleAdd = () => {
    if (!selected || !catalog) return;
    if (overflowBlocks) {
      // still allow if top-up only — domain decides
    }
    const result = addItems(state, catalog.lookup, selected.id, quantity);
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    const previewResult = previewAdd(state, catalog.lookup, selected.id, quantity);
    onApplyResult(result.state);
    onHighlightSlots(previewResult.affectedSlots);
    setSelected(null);
    onOpenChange(false);
  };

  const renderList = (definitions: ItemDefinition[]) => {
    if (definitions.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Keine Gegenstände für diesen Filter.
        </p>
      );
    }
    return (
      <ul className="space-y-2">
        {definitions.map((definition) => (
          <li
            key={definition.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{definition.name}</p>
              {definition.description && (
                <p className="mt-1 text-sm text-muted-foreground">{definition.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge variant="outline">{INVENTORY_TYPE_LABELS[definition.type]}</Badge>
                <Badge variant="secondary">Last {definition.load}</Badge>
                <Badge variant="outline">Kosten {definition.cost}</Badge>
                {definition.damage && <Badge>{definition.damage}</Badge>}
                {definition.protection && <Badge>Schutz {definition.protection}</Badge>}
                {definition.containerCapacity && (
                  <Badge variant="outline">Kapazität {definition.containerCapacity}</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {definition.scope === 'personal' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    setEditingPersonal(definition);
                    setPersonalOpen(true);
                  }}
                >
                  Bearbeiten
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="min-h-11"
                onClick={() => {
                  setSelected(definition);
                  setQuantity(1);
                }}
              >
                Hinzufügen
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gegenstand hinzufügen</DialogTitle>
            <DialogDescription>
              Wähle aus Core{hasWorld ? ', Welt' : ''} oder eigenen Definitionen.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="catalog-search">Suche</Label>
                <Input
                  id="catalog-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name oder Beschreibung"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalog-type">Typ</Label>
                <Select
                  value={typeFilter}
                  onValueChange={(value) =>
                    setTypeFilter(value === 'all' ? 'all' : (value as ItemDefinition['type']))
                  }
                >
                  <SelectTrigger id="catalog-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_TYPE_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {overflowBlocks && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {overflowBlocks} Top-ups bestehender Stapel bleiben möglich.
              </p>
            )}

            <Tabs value={tab} onValueChange={setTab} className="min-h-0 flex-1 overflow-hidden">
              <TabsList className={`grid w-full ${hasWorld ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value="core">Core</TabsTrigger>
                {hasWorld && <TabsTrigger value="world">Welt</TabsTrigger>}
                <TabsTrigger value="personal">Eigene</TabsTrigger>
              </TabsList>
              <div className="mt-3 max-h-[40vh] overflow-y-auto pr-1">
                <TabsContent value="core" className="mt-0">
                  {renderList(filterDefinitions('core'))}
                </TabsContent>
                {hasWorld && (
                  <TabsContent value="world" className="mt-0">
                    {renderList(filterDefinitions('world'))}
                  </TabsContent>
                )}
                <TabsContent value="personal" className="mt-0 space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => {
                      setEditingPersonal(null);
                      setPersonalOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Eigenen Gegenstand erstellen
                  </Button>
                  {renderList(filterDefinitions('personal'))}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(next) => !next && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.name ?? 'Hinzufügen'}</DialogTitle>
            <DialogDescription>
              Menge festlegen. Die gesamte Menge muss atomar passen.
            </DialogDescription>
          </DialogHeader>
          {selected && catalog && preview && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-quantity">Menge (1–999)</Label>
                <Input
                  id="add-quantity"
                  type="number"
                  min={1}
                  max={999}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      Math.min(999, Math.max(1, Number.parseInt(event.target.value, 10) || 1)),
                    )
                  }
                />
              </div>
              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
                <p>
                  Benötigt {preview.newSlotsNeeded} neue Inventarplätze
                </p>
                <p className="mt-1 text-muted-foreground">
                  Projizierte Last {preview.projectedLoad} / {inventoryCarryCapacity(strength)}
                </p>
                {!preview.ok && preview.reason && (
                  <p className="mt-2 text-destructive">{preview.reason}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Abbrechen
            </Button>
            <Button type="button" disabled={!preview?.ok} onClick={handleAdd}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PersonalItemFormDialog
        open={personalOpen}
        onOpenChange={setPersonalOpen}
        editing={editingPersonal}
        onSaved={onCatalogRefresh}
      />
    </>
  );
}
