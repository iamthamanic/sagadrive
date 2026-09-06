/**
 * InventoryEquipmentPaperDollHotspots — body-part hit targets over the paper-doll.
 * Click selects a slot (sticky glow until another slot or empty figure is clicked).
 * Feet uses two boot regions so both shoes glow when selected.
 * Location: src/app/character/inventory/InventoryEquipmentPaperDollHotspots.tsx
 */
import type { DragEvent } from 'react';
import type { EquipmentSlot } from '../../../domains/character/inventory-v2';
import { EQUIPMENT_SLOT_LABELS } from './inventory-ui-labels';

/**
 * Anatomical hit boxes (% of figure frame). Frame aspect must match the PNG.
 * Accessoires = Handgelenke; Haupt-/Nebenhand = Hände; Füße = beide Stiefel.
 */
const HOTSPOTS: ReadonlyArray<{
  id: string;
  slot: EquipmentSlot;
  top: string;
  left: string;
  width: string;
  height: string;
  radius: string;
  z: number;
}> = [
  { id: 'body', slot: 'body', top: '16%', left: '36%', width: '28%', height: '18%', radius: '42% / 30%', z: 1 },
  // Spezial — Markierung als Gürtel rund um die Hüfte (Kachel bleibt rechts oben)
  { id: 'special', slot: 'special', top: '35%', left: '30%', width: '40%', height: '6%', radius: '9999px', z: 3 },
  { id: 'head', slot: 'head', top: '2%', left: '37%', width: '26%', height: '10%', radius: '50%', z: 5 },
  // Handgelenke — knapp über den Händen (äußere Armenden)
  { id: 'accessory1', slot: 'accessory1', top: '39.5%', left: '4%', width: '12%', height: '3.5%', radius: '9999px', z: 7 },
  { id: 'accessory2', slot: 'accessory2', top: '39.5%', left: '84%', width: '12%', height: '3.5%', radius: '9999px', z: 7 },
  // Hände — PNG-Tinte der Handflächen (~3–16% / ~84–97%), nicht Hüfte
  { id: 'mainHand', slot: 'mainHand', top: '43.5%', left: '3%', width: '13%', height: '7.5%', radius: '0.55rem', z: 6 },
  { id: 'offHand', slot: 'offHand', top: '43.5%', left: '84%', width: '13%', height: '7.5%', radius: '0.55rem', z: 6 },
  // Beide Stiefel (PNG: weit außen, nicht in der Mitte)
  { id: 'feet-left', slot: 'feet', top: '85%', left: '8%', width: '22%', height: '14%', radius: '0.45rem', z: 5 },
  { id: 'feet-right', slot: 'feet', top: '85%', left: '70%', width: '22%', height: '14%', radius: '0.45rem', z: 5 },
];

export interface InventoryEquipmentPaperDollHotspotsProps {
  selectedSlot: EquipmentSlot | null;
  hoverSlot: EquipmentSlot | null;
  onSelect: (slot: EquipmentSlot | null) => void;
  onHover: (slot: EquipmentSlot | null) => void;
  onDropOnSlot: (event: DragEvent<HTMLButtonElement>, slot: EquipmentSlot) => void;
  onDragOverSlot: (slot: EquipmentSlot) => void;
}

export function InventoryEquipmentPaperDollHotspots({
  selectedSlot,
  hoverSlot,
  onSelect,
  onHover,
  onDropOnSlot,
  onDragOverSlot,
}: InventoryEquipmentPaperDollHotspotsProps) {
  return (
    <div
      className="absolute inset-0 z-[2]"
      data-equipment-paper-doll-hotspots="true"
      onClick={() => onSelect(null)}
    >
      {HOTSPOTS.map(({ id, slot, top, left, width, height, radius, z }) => {
        const selected = selectedSlot === slot;
        const hovered = hoverSlot === slot && !selected;
        return (
          <button
            key={id}
            type="button"
            data-equipment-hotspot={slot}
            data-equipment-hotspot-part={id}
            data-equipment-hotspot-selected={selected ? 'true' : undefined}
            aria-label={
              slot === 'feet'
                ? `${EQUIPMENT_SLOT_LABELS[slot]} am Körper (${id === 'feet-left' ? 'links' : 'rechts'})`
                : `${EQUIPMENT_SLOT_LABELS[slot]} am Körper`
            }
            aria-pressed={selected}
            style={{ top, left, width, height, borderRadius: radius, zIndex: z }}
            className={[
              'absolute border transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              selected
                ? 'border-primary bg-primary/40 shadow-[0_0_16px_rgba(45,212,191,0.65)]'
                : hovered
                  ? 'border-primary/55 bg-primary/18'
                  : 'border-transparent bg-transparent hover:border-primary/40 hover:bg-primary/12',
            ].join(' ')}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(slot);
            }}
            onMouseEnter={() => onHover(slot)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(slot)}
            onBlur={() => onHover(null)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              onDragOverSlot(slot);
              onHover(slot);
            }}
            onDrop={(event) => {
              event.stopPropagation();
              onSelect(slot);
              onDropOnSlot(event, slot);
            }}
          />
        );
      })}
    </div>
  );
}
