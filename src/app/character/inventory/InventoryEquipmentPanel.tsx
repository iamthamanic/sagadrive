/**
 * InventoryEquipmentPanel — seven equipment destinations for Inventory v2 (#111).
 * Renders EQUIPMENT_SLOTS with empty hints, occupied mechanics, two-handed link,
 * Ablegen / Schnellzugriff menus, and DnD equip onto slots via domain equipItem.
 * Location: src/app/character/inventory/InventoryEquipmentPanel.tsx
 */
import { useState, type DragEvent } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
  EQUIPMENT_SLOTS,
  HAND_SLOTS,
  equipItem,
  findInstanceLocation,
  isTwoHandedHandPair,
  unequipItem,
  type EquipmentSlot,
  type InventoryOperationResult,
  type InventoryState,
  type ItemDefinitionLookup,
} from '../../../domains/character/inventory-v2';
import {
  freeSlotsForEquipDisplace,
  itemDisplayName,
  previewDisplacedOnEquip,
} from './inventory-equip-preview';
import {
  EQUIP_DISPLACE_NO_ROOM,
  EQUIPMENT_SLOT_CATEGORY_HINTS,
  EQUIPMENT_SLOT_LABELS,
  formatStrengthRequirement,
} from './inventory-ui-labels';

export interface InventoryEquipmentPanelProps {
  state: InventoryState;
  lookup: ItemDefinitionLookup;
  strength: number;
  onApplyResult: (next: InventoryState) => void;
  onRefuse: (reason: string) => void;
  onRequestQuickAssign?: (instanceId: string) => void;
}

type PendingEquip = {
  instanceId: string;
  slot: EquipmentSlot;
  displacedNames: string[];
};

const INSTANCE_DRAG_MIME = 'application/x-inventory-instance-id';

function applyEquipResult(
  result: InventoryOperationResult,
  onApplyResult: (next: InventoryState) => void,
  onRefuse: (reason: string) => void,
  strengthBlock?: { required: number; current: number },
): void {
  if (result.ok === false) {
    if (result.error === 'REQUIREMENT_NOT_MET' && strengthBlock) {
      onRefuse(formatStrengthRequirement(strengthBlock.required, strengthBlock.current));
      return;
    }
    if (result.error === 'BASE_SLOTS_FULL') {
      onRefuse(EQUIP_DISPLACE_NO_ROOM);
      return;
    }
    onRefuse(result.reason);
    return;
  }
  onApplyResult(result.state);
}

export function InventoryEquipmentPanel({
  state,
  lookup,
  strength,
  onApplyResult,
  onRefuse,
  onRequestQuickAssign,
}: InventoryEquipmentPanelProps) {
  const [pendingEquip, setPendingEquip] = useState<PendingEquip | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<EquipmentSlot | null>(null);

  const tryEquip = (instanceId: string, slot: EquipmentSlot, confirmed: boolean) => {
    const instance = state.instances[instanceId];
    if (!instance) {
      onRefuse('Unbekannte Instanz.');
      return;
    }
    const definition = lookup(instance.definitionId);
    if (!definition) {
      onRefuse(`Unbekannte Definition: ${instance.definitionId}`);
      return;
    }
    const declared = definition.equipSlots ?? [];
    if (definition.twoHanded) {
      if (!HAND_SLOTS.includes(slot)) {
        onRefuse(`${definition.name} ist zweihändig und gehört in eine Hand.`);
        return;
      }
    } else if (!declared.includes(slot)) {
      onRefuse(`${definition.name} passt nicht in ${EQUIPMENT_SLOT_LABELS[slot]}.`);
      return;
    }

    const required = definition.requirements?.minimumStrength;
    if (required !== undefined && strength < required) {
      onRefuse(formatStrengthRequirement(required, strength));
      return;
    }

    const displaced = previewDisplacedOnEquip(state, lookup, instanceId, slot);
    if (displaced.length > 0 && !confirmed) {
      const free = freeSlotsForEquipDisplace(state, instanceId);
      if (displaced.length > free) {
        onRefuse(EQUIP_DISPLACE_NO_ROOM);
        return;
      }
      setPendingEquip({
        instanceId,
        slot: definition.twoHanded ? 'mainHand' : slot,
        displacedNames: displaced.map((id) => itemDisplayName(state, lookup, id)),
      });
      return;
    }

    const targetSlot = definition.twoHanded ? 'mainHand' : slot;
    applyEquipResult(
      equipItem(state, lookup, instanceId, targetSlot, strength),
      onApplyResult,
      onRefuse,
      required !== undefined ? { required, current: strength } : undefined,
    );
  };

  const resolveDragInstanceId = (event: DragEvent<HTMLDivElement>): string | null => {
    const fromMime = event.dataTransfer.getData(INSTANCE_DRAG_MIME);
    if (fromMime && state.instances[fromMime]) return fromMime;
    const rawSlot = event.dataTransfer.getData('text/plain');
    const slotIndex = Number.parseInt(rawSlot, 10);
    if (Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < state.baseSlots.length) {
      return state.baseSlots[slotIndex];
    }
    return null;
  };

  const handleDropOnSlot = (event: DragEvent<HTMLDivElement>, slot: EquipmentSlot) => {
    event.preventDefault();
    setDragOverSlot(null);
    const instanceId = resolveDragInstanceId(event);
    if (!instanceId) return;
    const location = findInstanceLocation(state, instanceId);
    if (location?.kind !== 'base' && location?.kind !== 'equipment') {
      onRefuse('Nur Gegenstände aus dem Basis-Inventar oder der Ausrüstung können ausgerüstet werden.');
      return;
    }
    tryEquip(instanceId, slot, false);
  };

  const handleUnequip = (slot: EquipmentSlot) => {
    const result = unequipItem(state, slot);
    if (result.ok === false) {
      onRefuse(result.reason);
      return;
    }
    onApplyResult(result.state);
  };

  const isQuickEligible = (id: string): boolean => {
    const location = findInstanceLocation(state, id);
    return location?.kind === 'base' || location?.kind === 'equipment';
  };

  const confirmPendingEquip = () => {
    if (!pendingEquip) return;
    const { instanceId, slot } = pendingEquip;
    setPendingEquip(null);
    const instance = state.instances[instanceId];
    const required = instance
      ? lookup(instance.definitionId)?.requirements?.minimumStrength
      : undefined;
    applyEquipResult(
      equipItem(state, lookup, instanceId, slot, strength),
      onApplyResult,
      onRefuse,
      required !== undefined ? { required, current: strength } : undefined,
    );
  };

  return (
    <aside className="space-y-3" data-inventory-equipment-panel aria-label="Ausrüstung">
      <h3 className="text-sm font-semibold tracking-wide">Ausrüstung</h3>
      <ul className="space-y-2">
        {EQUIPMENT_SLOTS.map((slot) => {
          const instanceId = state.equipment[slot] ?? null;
          const instance = instanceId ? state.instances[instanceId] : undefined;
          const definition = instance ? lookup(instance.definitionId) : undefined;
          const linkedInstanceId = instanceId;
          const twoHandedPair =
            linkedInstanceId !== null &&
            isTwoHandedHandPair(state, linkedInstanceId, lookup) &&
            HAND_SLOTS.includes(slot);
          const isOffHandLinked = twoHandedPair && slot === 'offHand';
          const isMainHandLinked = twoHandedPair && slot === 'mainHand';

          return (
            <li key={slot}>
              <div
                role="listitem"
                data-equipment-slot={slot}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  setDragOverSlot(slot);
                }}
                onDragLeave={() => {
                  setDragOverSlot((current) => (current === slot ? null : current));
                }}
                onDrop={(event) => handleDropOnSlot(event, slot)}
                aria-label={
                  isOffHandLinked
                    ? `${EQUIPMENT_SLOT_LABELS[slot]}: Zweihändig / gekoppelt`
                    : instance && definition
                      ? `${EQUIPMENT_SLOT_LABELS[slot]}: ${definition.name}`
                      : `${EQUIPMENT_SLOT_LABELS[slot]}: leer`
                }
                className={[
                  'relative flex min-h-11 min-w-0 flex-col rounded-lg border p-2 transition-colors',
                  instance
                    ? 'border-border bg-card'
                    : 'border-dashed border-border/70 bg-muted/15 text-muted-foreground',
                  dragOverSlot === slot ? 'ring-2 ring-primary' : '',
                  isOffHandLinked || isMainHandLinked ? 'border-l-2 border-l-primary/60' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {EQUIPMENT_SLOT_LABELS[slot]}
                    </p>
                    {instance && definition && !isOffHandLinked ? (
                      <>
                        <p className="break-words text-sm font-medium leading-snug">{definition.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {definition.damage && (
                            <Badge className="text-[10px]">{definition.damage}</Badge>
                          )}
                          {definition.protection && (
                            <Badge className="text-[10px]">Schutz {definition.protection}</Badge>
                          )}
                          {definition.twoHanded && (
                            <Badge variant="outline" className="text-[10px]">
                              Zweihändig
                            </Badge>
                          )}
                          {definition.traits?.slice(0, 2).map((trait) => (
                            <Badge key={trait} variant="secondary" className="text-[10px]">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </>
                    ) : isOffHandLinked ? (
                      <p className="text-sm italic text-muted-foreground">Zweihändig / gekoppelt</p>
                    ) : (
                      <p className="text-xs">{EQUIPMENT_SLOT_CATEGORY_HINTS[slot]}</p>
                    )}
                  </div>
                  {instanceId && !isOffHandLinked && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="size-11 min-h-11 min-w-11 shrink-0"
                          aria-label={`${EQUIPMENT_SLOT_LABELS[slot]} Aktionen`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleUnequip(slot)}>
                          Ablegen ins Inventar
                        </DropdownMenuItem>
                        {isQuickEligible(instanceId) && onRequestQuickAssign && (
                          <DropdownMenuItem
                            onSelect={() => {
                              onRequestQuickAssign(instanceId);
                            }}
                          >
                            Schnellzugriff zuweisen
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <AlertDialog
        open={pendingEquip !== null}
        onOpenChange={(open) => {
          if (!open) setPendingEquip(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ausrüstung ersetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingEquip
                ? `Folgende Gegenstände kehren ins Inventar zurück: ${pendingEquip.displacedNames.join(', ')}.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingEquip}>Ausrüsten</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
