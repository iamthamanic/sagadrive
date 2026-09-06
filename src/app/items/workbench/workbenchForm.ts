/**
 * workbenchForm — form model, defaults, and draft builder for Item Workbench (#139).
 * Domain validation stays in #134/#135/#136; this only maps UI ↔ draft.
 * Location: src/app/items/workbench/workbenchForm.ts
 */
import type {
  EquipmentSlot,
  InventoryItemType,
  ItemDefinition,
} from '../../../domains/character/inventory-v2';
import type {
  ItemCapability,
  ItemContext,
  ItemKindKey,
  ItemRole,
  ItemSettingTag,
  ItemTechLevel,
} from '../../../domains/items';
import type { ItemDefinitionDraft } from '../../../infrastructure/inventory/item-catalog-service';
import {
  parseItemCost,
  parseItemLoad,
  parseMinimumStrength,
  parseProtection,
} from '../../character/inventory/inventory-ui-labels';
import type { WORKBENCH_TYPE_ENTRIES } from './workbenchLabels';

type MiscEquipChoice = 'none' | 'head' | 'accessory' | 'special' | 'feet';
type WeaponHandling = 'oneHanded' | 'twoHanded';
type AvailabilityScope = 'personal' | 'world';

export interface WorkbenchFormState {
  name: string;
  description: string;
  type: InventoryItemType;
  kindKey: ItemKindKey;
  settingTags: ItemSettingTag[];
  techLevel: ItemTechLevel | '';
  contexts: ItemContext[];
  capabilities: ItemCapability[];
  roles: ItemRole[];
  load: 0 | 1 | 2 | 3;
  cost: 0 | 1 | 2 | 3 | 4 | 5;
  stackLimit: number;
  damage: string;
  damageType: string;
  handling: WeaponHandling;
  finesse: boolean;
  reichweite: boolean;
  penetration: number;
  protection: 1 | 2 | 3;
  minimumStrength: 1 | 2 | 4;
  traits: string;
  containerCapacity: number;
  miscEquip: MiscEquipChoice;
  availability: AvailabilityScope;
  worldProfileId: string;
}

export type WorkbenchTypeEntry = (typeof WORKBENCH_TYPE_ENTRIES)[number];

function parseTraits(raw: string): string[] {
  return raw
    .split(',')
    .map((trait) => trait.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((trait) => trait.slice(0, 40));
}

export function emptyWorkbenchForm(entry?: WorkbenchTypeEntry): WorkbenchFormState {
  const type = entry?.type ?? 'misc';
  const kindKey = entry?.kindKey ?? 'misc';
  return {
    name: '',
    description: '',
    type,
    kindKey,
    settingTags: [],
    techLevel: '',
    contexts: [],
    capabilities: [],
    roles: [],
    load: 1,
    cost: 1,
    stackLimit: type === 'container' ? 1 : 1,
    damage: 'd8+2',
    damageType: 'Kinetisch',
    handling: 'oneHanded',
    finesse: false,
    reichweite: false,
    penetration: 0,
    protection: 1,
    minimumStrength: 1,
    traits: '',
    containerCapacity: 4,
    miscEquip: 'none',
    availability: 'personal',
    worldProfileId: '',
  };
}

export function formFromDefinition(
  definition: ItemDefinition,
  options?: { worldProfileId?: string | null; availability?: AvailabilityScope },
): WorkbenchFormState {
  const base = emptyWorkbenchForm();
  base.name = definition.name;
  base.description = definition.description;
  base.type = definition.type;
  base.kindKey = definition.kindKey ?? mapTypeToKind(definition.type);
  base.settingTags = [...(definition.settingTags ?? [])];
  base.techLevel = definition.techLevel ?? '';
  base.contexts = [...(definition.contexts ?? [])];
  base.capabilities = [...(definition.capabilities ?? [])];
  base.roles = [...(definition.roles ?? [])];
  base.load = definition.load;
  base.cost = definition.cost;
  base.stackLimit = definition.stackLimit;
  base.damage = definition.damage ?? 'd8+2';
  base.damageType = definition.damageType ?? 'Kinetisch';
  base.protection = definition.protection ?? 1;
  base.minimumStrength = definition.requirements?.minimumStrength ?? 1;
  base.containerCapacity = definition.containerCapacity ?? 4;
  base.traits = (definition.traits ?? []).join(', ');
  if (definition.twoHanded) base.handling = 'twoHanded';
  const traits = definition.traits ?? [];
  base.finesse = traits.some((t) => t.toLowerCase() === 'finesse');
  base.reichweite = traits.some((t) => t.toLowerCase() === 'reichweite');
  const penet = traits.find((t) => /^durchdringung\s*\d+$/i.test(t));
  if (penet) {
    const n = Number.parseInt(penet.replace(/\D/g, ''), 10);
    if (n >= 0 && n <= 3) base.penetration = n;
  }
  const slots = definition.equipSlots ?? [];
  if (slots.includes('head')) base.miscEquip = 'head';
  else if (slots.includes('accessory1') || slots.includes('accessory2')) base.miscEquip = 'accessory';
  else if (slots.includes('special')) base.miscEquip = 'special';
  else if (slots.includes('feet')) base.miscEquip = 'feet';

  if (options?.availability) {
    base.availability = options.availability;
  } else if (definition.scope === 'world') {
    base.availability = 'world';
  } else {
    base.availability = 'personal';
  }
  base.worldProfileId = options?.worldProfileId ?? '';
  return base;
}

function mapTypeToKind(type: InventoryItemType): ItemKindKey {
  if (type === 'weapon') return 'weapon';
  if (type === 'armor') return 'armor';
  if (type === 'shield') return 'shield';
  if (type === 'tool') return 'tool';
  if (type === 'consumable') return 'consumable';
  if (type === 'container') return 'container';
  return 'misc';
}

/** Shared fields that survive a type change. */
export function preserveSharedFields(
  previous: WorkbenchFormState,
  next: WorkbenchFormState,
): WorkbenchFormState {
  return {
    ...next,
    name: previous.name,
    description: previous.description,
    settingTags: previous.settingTags,
    techLevel: previous.techLevel,
    contexts: previous.contexts,
    capabilities: previous.capabilities,
    roles: previous.roles,
    load: previous.load,
    cost: previous.cost,
    availability: previous.availability,
    worldProfileId: previous.worldProfileId,
  };
}

export function applyTypeEntry(
  previous: WorkbenchFormState,
  entry: WorkbenchTypeEntry,
): WorkbenchFormState {
  const next = emptyWorkbenchForm(entry);
  return preserveSharedFields(previous, next);
}

export function typeChangeLosesFields(form: WorkbenchFormState, nextType: InventoryItemType): boolean {
  if (form.type === nextType) return false;
  if (form.type === 'weapon' && (form.damage || form.finesse || form.reichweite || form.penetration > 0)) {
    return true;
  }
  if (form.type === 'armor') return true;
  if (form.type === 'container' && form.containerCapacity !== 4) return true;
  if ((form.type === 'tool' || form.type === 'misc') && form.traits.trim().length > 0) return true;
  return false;
}

export function buildWorkbenchDraft(form: WorkbenchFormState): ItemDefinitionDraft | string {
  const name = form.name.trim();
  if (name.length < 1 || name.length > 80) return 'Name muss 1–80 Zeichen haben.';
  const description = form.description.trim().slice(0, 1000);
  if (!Number.isInteger(form.stackLimit) || form.stackLimit < 1 || form.stackLimit > 99) {
    return 'Stacklimit muss 1–99 sein.';
  }
  if (form.availability === 'world' && !form.worldProfileId.trim()) {
    return 'Bitte eine Welt für das Welt-Item wählen.';
  }

  const draft: ItemDefinitionDraft = {
    name,
    description,
    type: form.type,
    load: form.load,
    cost: form.cost,
    stackLimit: form.type === 'container' ? 1 : form.stackLimit,
    kindKey: form.kindKey,
    origin: form.availability === 'world' ? 'world' : 'personal',
  };

  if (form.settingTags.length > 0) draft.settingTags = [...form.settingTags];
  if (form.techLevel) draft.techLevel = form.techLevel;
  if (form.contexts.length > 0) draft.contexts = [...form.contexts];
  if (form.capabilities.length > 0) draft.capabilities = [...form.capabilities];
  if (form.roles.length > 0) draft.roles = [...form.roles];

  if (form.type === 'weapon') {
    const damageType = form.damageType.trim().slice(0, 40) || 'Kinetisch';
    const traits: string[] = [];
    if (form.finesse) traits.push('Finesse');
    if (form.reichweite) traits.push('Reichweite');
    if (form.penetration > 0) traits.push(`Durchdringung ${form.penetration}`);
    draft.damage = form.damage;
    draft.damageType = damageType;
    draft.traits = traits;
    draft.twoHanded = form.handling === 'twoHanded';
    draft.equipSlots = ['mainHand', 'offHand'] as EquipmentSlot[];
  }

  if (form.type === 'armor') {
    draft.protection = form.protection;
    draft.requirements = { minimumStrength: form.minimumStrength };
    draft.equipSlots = ['body'];
  }

  if (form.type === 'shield') {
    draft.traits = ['+1 Verteidigung', '1 Hand'];
    draft.equipSlots = ['mainHand', 'offHand'];
  }

  if (form.type === 'tool') {
    const traits = parseTraits(form.traits);
    if (traits.length > 0) draft.traits = traits;
  }

  if (form.type === 'container') {
    if (
      !Number.isInteger(form.containerCapacity) ||
      form.containerCapacity < 1 ||
      form.containerCapacity > 20
    ) {
      return 'Kapazität muss 1–20 sein.';
    }
    draft.containerCapacity = form.containerCapacity;
    draft.stackLimit = 1;
  }

  if (form.type === 'misc') {
    const traits = parseTraits(form.traits);
    if (traits.length > 0) draft.traits = traits;
    if (form.miscEquip === 'head') draft.equipSlots = ['head'];
    if (form.miscEquip === 'accessory') draft.equipSlots = ['accessory1', 'accessory2'];
    if (form.miscEquip === 'special') draft.equipSlots = ['special'];
    if (form.miscEquip === 'feet') draft.equipSlots = ['feet'];
  }

  if (form.type === 'consumable') {
    const traits = parseTraits(form.traits);
    if (traits.length > 0) draft.traits = traits;
  }

  return draft;
}

export function serializeForm(form: WorkbenchFormState): string {
  return JSON.stringify(form);
}

export {
  parseItemCost,
  parseItemLoad,
  parseMinimumStrength,
  parseProtection,
};
