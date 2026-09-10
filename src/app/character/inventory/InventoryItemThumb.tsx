/**
 * InventoryItemThumb — square item thumbnail for inventory/equipment.
 * Resolution order: assetSrc (storage) → public SVG iconKey → bundled PNG iconKey → type PNG → slot glyph.
 * Location: src/app/character/inventory/InventoryItemThumb.tsx
 */
import { useEffect, useState } from 'react';
import type { EquipmentSlot, InventoryItemType, ItemDefinition } from '../../../domains/character/inventory-v2';
import { buildItemIconPublicSrc, parseItemThumbnailAssetKey } from '../../../domains/items';

import slotHead from '../../../assets/inventory/slots/head.png';
import slotBody from '../../../assets/inventory/slots/body.png';
import slotAccessory1 from '../../../assets/inventory/slots/accessory1.png';
import slotAccessory2 from '../../../assets/inventory/slots/accessory2.png';
import slotMainHand from '../../../assets/inventory/slots/mainHand.png';
import slotOffHand from '../../../assets/inventory/slots/offHand.png';
import slotSpecial from '../../../assets/inventory/slots/special.png';
import slotFeet from '../../../assets/inventory/slots/feet.png';

import typeWeapon from '../../../assets/inventory/items/weapon.png';
import typeArmor from '../../../assets/inventory/items/armor.png';
import typeShield from '../../../assets/inventory/items/shield.png';
import typeTool from '../../../assets/inventory/items/tool.png';
import typeConsumable from '../../../assets/inventory/items/consumable.png';
import typeContainer from '../../../assets/inventory/items/container.png';
import typeMisc from '../../../assets/inventory/items/misc.png';

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  head: slotHead,
  body: slotBody,
  accessory1: slotAccessory1,
  accessory2: slotAccessory2,
  mainHand: slotMainHand,
  offHand: slotOffHand,
  special: slotSpecial,
  feet: slotFeet,
};

const TYPE_ICONS: Record<InventoryItemType, string> = {
  weapon: typeWeapon,
  armor: typeArmor,
  shield: typeShield,
  tool: typeTool,
  consumable: typeConsumable,
  container: typeContainer,
  misc: typeMisc,
};

const ITEM_ICON_MODULES = import.meta.glob('../assets/inventory/items/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function bundledItemIconPngSrc(iconKey: string | undefined): string | null {
  if (!iconKey) return null;
  const key = `../assets/inventory/items/${iconKey}.png`;
  return ITEM_ICON_MODULES[key] ?? null;
}

/** Prefer static public SVG (`/assets/items/{slug}.svg`), then legacy bundled PNG. */
function itemIconSrc(iconKey: string | undefined): string | null {
  const svg = buildItemIconPublicSrc(iconKey ?? '');
  if (svg) return svg;
  return bundledItemIconPngSrc(iconKey);
}

/**
 * Sync fallback chain without remote asset URLs.
 * Prefer `assetSrc` when the caller already resolved `assetKey` → signed URL.
 */
export function resolveInventoryThumbSrc(options: {
  definition?: ItemDefinition | null;
  slot: EquipmentSlot;
  assetSrc?: string | null;
}): string {
  const { definition, slot, assetSrc } = options;
  if (assetSrc) return assetSrc;
  if (definition) {
    const custom = itemIconSrc(definition.iconKey);
    if (custom) return custom;
    return TYPE_ICONS[definition.type] ?? SLOT_ICONS[slot];
  }
  return SLOT_ICONS[slot];
}

export function definitionHasThumbnailAsset(definition?: ItemDefinition | null): boolean {
  return Boolean(parseItemThumbnailAssetKey(definition?.assetKey));
}

export interface InventoryItemThumbProps {
  slot: EquipmentSlot;
  definition?: ItemDefinition | null;
  /** Resolved signed URL for definition.assetKey (thumbnail2d). */
  assetSrc?: string | null;
  muted?: boolean;
  className?: string;
  alt?: string;
}

export function InventoryItemThumb({
  slot,
  definition,
  assetSrc = null,
  muted = false,
  className,
  alt = '',
}: InventoryItemThumbProps) {
  const primary = resolveInventoryThumbSrc({ definition, slot, assetSrc });
  const fallback = SLOT_ICONS[slot];
  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(primary);
  }, [primary]);

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={[
        'pointer-events-none select-none object-contain p-1.5',
        muted ? 'opacity-40' : 'opacity-90',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-inventory-item-thumb={slot}
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
    />
  );
}
