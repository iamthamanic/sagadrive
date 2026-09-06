/**
 * InventoryEquipmentPaperDollFigure — neutral fashion-sketch line-art body for
 * the equipment paper-doll. Same Meshy sketch style as Spezies (cropped from
 * human.png); includes drawn shoes. Not species-specific.
 * Location: src/app/character/inventory/InventoryEquipmentPaperDollFigure.tsx
 */
import paperDollSrc from '../../../assets/inventory/equipment-paper-doll.png';

export function InventoryEquipmentPaperDollFigure({ className }: { className?: string }) {
  return (
    <img
      src={paperDollSrc}
      alt="Neutrale Ausrüstungsfigur"
      role="img"
      draggable={false}
      className={['pointer-events-none select-none h-full w-full object-fill', className]
        .filter(Boolean)
        .join(' ')}
      data-equipment-paper-doll-figure="true"
    />
  );
}
