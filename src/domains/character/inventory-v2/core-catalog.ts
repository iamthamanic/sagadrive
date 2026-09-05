/**
 * Inventory v2 Core catalog — versioned static source (#107 seed, #108 complete).
 *
 * Core definitions ship with the repository and are read-only at runtime: they
 * are never persisted in `inventory_item_definitions`, so no runtime repository
 * can create, edit or archive one. Ids are stable contracts — renaming an entry
 * must not change its id, because owned instances will reference the id.
 *
 * V1 playtest catalog (#108 option 11B): exactly 35 setting-neutral mechanical
 * archetypes. Do not invent extra entries here; further Core additions need a
 * separate issue.
 *
 * Location: src/domains/character/inventory-v2/core-catalog.ts
 */

import type { CatalogDefinitionRecord } from './catalog';
import type { ItemDefinition } from './types';

/** Bumped whenever Core entries are added or changed, for cache invalidation. */
export const CORE_CATALOG_VERSION = 2;

/** Exact V1 Core catalog size — the completeness gate for #108. */
export const CORE_CATALOG_SIZE = 35;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

const CORE_DEFINITIONS: readonly ItemDefinition[] = deepFreeze([
  // --- Weapons (8) ---
  {
    id: 'core.weapon.light-melee',
    scope: 'core',
    name: 'Leichte Nahkampfwaffe',
    description:
      'Leichte Einhandwaffe für enge Räume und schnelle Stöße. Die konkrete Form — Messer, Kurzschwert, Schlagstock — legt das Weltprofil fest.',
    type: 'weapon',
    load: 1,
    cost: 1,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    damage: 'd6+1',
    damageType: 'Kinetisch',
    traits: ['Finesse'],
  },
  {
    id: 'core.weapon.standard-melee',
    scope: 'core',
    name: 'Standard-Nahkampfwaffe',
    description:
      'Ausgewogene Einhandwaffe für den regulären Nahkampf. Form und Material bestimmt das Weltprofil.',
    type: 'weapon',
    load: 1,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    damage: 'd8+2',
    damageType: 'Kinetisch',
  },
  {
    id: 'core.weapon.heavy-melee',
    scope: 'core',
    name: 'Schwere Nahkampfwaffe',
    description:
      'Zweihändige Nahkampfwaffe mit hoher Wucht. Benötigt beide Hände und liefert spürbar mehr Schaden.',
    type: 'weapon',
    load: 2,
    cost: 3,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    twoHanded: true,
    damage: 'd10+3',
    damageType: 'Kinetisch',
  },
  {
    id: 'core.weapon.reach-melee',
    scope: 'core',
    name: 'Reichweiten-Nahkampfwaffe',
    description:
      'Zweihändige Nahkampfwaffe mit verlängerter Reichweite. Ideal, wenn Abstand im Nahkampf zählt.',
    type: 'weapon',
    load: 2,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    twoHanded: true,
    damage: 'd8+2',
    damageType: 'Kinetisch',
    traits: ['Reichweite'],
  },
  {
    id: 'core.weapon.light-ranged',
    scope: 'core',
    name: 'Leichte Fernkampfwaffe',
    description:
      'Kompakte Fernkampfwaffe für kurze bis mittlere Distanz. Die konkrete Ausführung legt das Weltprofil fest.',
    type: 'weapon',
    load: 1,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    damage: 'd6+1',
    damageType: 'Kinetisch',
  },
  {
    id: 'core.weapon.standard-ranged',
    scope: 'core',
    name: 'Standard-Fernkampfwaffe',
    description:
      'Reguläre Fernkampfwaffe für den typischen Schusswechsel. Form und Munition bestimmt das Weltprofil.',
    type: 'weapon',
    load: 1,
    cost: 3,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    damage: 'd8+2',
    damageType: 'Kinetisch',
  },
  {
    id: 'core.weapon.heavy-ranged',
    scope: 'core',
    name: 'Schwere Fernkampfwaffe',
    description:
      'Zweihändige Fernkampfwaffe mit hoher Durchschlagskraft. Benötigt beide Hände.',
    type: 'weapon',
    load: 2,
    cost: 4,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    twoHanded: true,
    damage: 'd10+3',
    damageType: 'Kinetisch',
  },
  {
    id: 'core.weapon.armor-piercing',
    scope: 'core',
    name: 'Durchdringungswaffe',
    description:
      'Zweihändige Waffe, die einen Punkt Schutz ignoriert. Geeignet gegen gepanzerte Ziele.',
    type: 'weapon',
    load: 2,
    cost: 4,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    twoHanded: true,
    damage: 'd8+2',
    damageType: 'Kinetisch',
    traits: ['Durchdringung 1'],
  },

  // --- Armor & shield (4) ---
  {
    id: 'core.armor.light',
    scope: 'core',
    name: 'Leichte Rüstung',
    description:
      'Leichter Körperschutz ohne starke Bewegungseinschränkung. Form und Material bestimmt das Weltprofil.',
    type: 'armor',
    load: 1,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['body'],
    protection: 1,
    requirements: { minimumStrength: 1 },
  },
  {
    id: 'core.armor.medium',
    scope: 'core',
    name: 'Mittlere Rüstung',
    description:
      'Ausgewogener Körperschutz für Abenteurer, die Standfestigkeit brauchen. Erfordert etwas Kraft.',
    type: 'armor',
    load: 2,
    cost: 3,
    stackLimit: 1,
    equipSlots: ['body'],
    protection: 2,
    requirements: { minimumStrength: 2 },
  },
  {
    id: 'core.armor.heavy',
    scope: 'core',
    name: 'Schwere Rüstung',
    description:
      'Schwerer Körperschutz mit maximalem Kern-Schutz. Nur mit ausreichender Stärke tragbar.',
    type: 'armor',
    load: 3,
    cost: 4,
    stackLimit: 1,
    equipSlots: ['body'],
    protection: 3,
    requirements: { minimumStrength: 4 },
  },
  {
    id: 'core.shield.standard',
    scope: 'core',
    name: 'Schild',
    description:
      'Tragbarer Schild für eine Hand. Gewährt +1 Verteidigung; die konkrete Bauweise legt das Weltprofil fest.',
    type: 'shield',
    load: 1,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['mainHand', 'offHand'],
    traits: ['+1 Verteidigung', '1 Hand'],
  },

  // --- Tools (8) ---
  {
    id: 'core.tool.medical',
    scope: 'core',
    name: 'Medizinisches Set',
    description:
      'Werkzeuge und Verbände für medizinische Versorgung. Verleiht keinen Zahlenbonus — die Wirkung kommt aus Fertigkeit und Szene.',
    type: 'tool',
    load: 1,
    cost: 2,
    stackLimit: 1,
  },
  {
    id: 'core.tool.repair',
    scope: 'core',
    name: 'Reparaturset',
    description:
      'Werkzeuge zum Flicken von Geräten, Fahrzeugen oder Ausrüstung. Ohne impliziten Zahlenbonus.',
    type: 'tool',
    load: 1,
    cost: 2,
    stackLimit: 1,
  },
  {
    id: 'core.tool.precision',
    scope: 'core',
    name: 'Präzisionswerkzeug',
    description:
      'Feine Werkzeuge für Schlosserei, Elektronik oder filigrane Arbeit. Wirkung über Fertigkeit, nicht über versteckte Boni.',
    type: 'tool',
    load: 1,
    cost: 2,
    stackLimit: 1,
  },
  {
    id: 'core.tool.survival',
    scope: 'core',
    name: 'Überlebensset',
    description:
      'Grundausstattung für Lager, Wetter und Wildnis. Kein stillschweigender Zahlenbonus.',
    type: 'tool',
    load: 1,
    cost: 2,
    stackLimit: 1,
  },
  {
    id: 'core.tool.climbing',
    scope: 'core',
    name: 'Kletterset',
    description:
      'Seile, Karabiner und Hilfsmittel zum Klettern. Die Probe bleibt Athletik/Akrobatik.',
    type: 'tool',
    load: 2,
    cost: 2,
    stackLimit: 1,
  },
  {
    id: 'core.tool.navigation',
    scope: 'core',
    name: 'Navigationsset',
    description:
      'Hilfsmittel zur Orientierung und Routenfindung. Kein automatischer Erfolg auf Navigation.',
    type: 'tool',
    load: 1,
    cost: 2,
    stackLimit: 1,
  },
  {
    id: 'core.tool.research',
    scope: 'core',
    name: 'Analyse- & Forschungsset',
    description:
      'Instrumente und Notizhilfen für Untersuchung und Analyse. Wirkung über Ermitteln/Wissen, nicht über versteckte Boni.',
    type: 'tool',
    load: 1,
    cost: 2,
    stackLimit: 1,
  },
  {
    id: 'core.tool.craft',
    scope: 'core',
    name: 'Handwerksset',
    description:
      'Werkzeuge für Fertigung und Umbau. Erfindet kein Crafting-Subsystem und keinen Zahlenbonus.',
    type: 'tool',
    load: 2,
    cost: 2,
    stackLimit: 1,
  },

  // --- Consumables (5) ---
  {
    id: 'core.consumable.medical',
    scope: 'core',
    name: 'Medizinischer Verbrauch',
    description:
      'Verbrauchsmaterial für medizinische Szenen. Verbrauchen reduziert die Menge um 1; konkrete Heilwirkung legt Weltprofil oder Fähigkeit fest.',
    type: 'consumable',
    load: 0,
    cost: 1,
    stackLimit: 5,
  },
  {
    id: 'core.consumable.repair',
    scope: 'core',
    name: 'Reparaturmaterial',
    description:
      'Verbrauchsmaterial für Reparaturen. Verbrauchen reduziert die Menge um 1; kein automatischer Reparaturerfolg.',
    type: 'consumable',
    load: 0,
    cost: 1,
    stackLimit: 5,
  },
  {
    id: 'core.consumable.ration',
    scope: 'core',
    name: 'Nahrung & Wasser',
    description:
      'Tagesverpflegung und Trinkwasser. Verbrauchen reduziert die Menge um 1; kein Stillen von anderen Mechaniken.',
    type: 'consumable',
    load: 0,
    cost: 1,
    stackLimit: 5,
  },
  {
    id: 'core.consumable.energy',
    scope: 'core',
    name: 'Energie- / Betriebsmittel',
    description:
      'Betriebsmittel für Geräte und Fahrzeuge. Verbrauchen reduziert die Menge um 1; Wirkung ist weltprofilabhängig.',
    type: 'consumable',
    load: 0,
    cost: 1,
    stackLimit: 5,
  },
  {
    id: 'core.consumable.general',
    scope: 'core',
    name: 'Allgemeiner Verbrauch',
    description:
      'Generisches Verbrauchsmaterial für Szenenbedarf. Verbrauchen reduziert die Menge um 1 ohne fest verdrahteten Effekt.',
    type: 'consumable',
    load: 0,
    cost: 1,
    stackLimit: 5,
  },

  // --- Containers (4) ---
  {
    id: 'core.container.pouch',
    scope: 'core',
    name: 'Gürteltasche',
    description:
      'Kleine Tasche mit zwei Plätzen. Belegt selbst einen Basisslot; Inhalt zählt weiterhin zur Last.',
    type: 'container',
    load: 0,
    cost: 1,
    stackLimit: 1,
    containerCapacity: 2,
  },
  {
    id: 'core.container.bag',
    scope: 'core',
    name: 'Tasche',
    description:
      'Tragbare Tasche mit vier Plätzen. Kein Nesting — Container dürfen keine Container enthalten.',
    type: 'container',
    load: 1,
    cost: 1,
    stackLimit: 1,
    containerCapacity: 4,
  },
  {
    id: 'core.container.backpack',
    scope: 'core',
    name: 'Rucksack',
    description:
      'Rucksack mit sechs Plätzen. Belegt einen Basisslot; Last des Inhalts zählt vollständig weiter.',
    type: 'container',
    load: 1,
    cost: 2,
    stackLimit: 1,
    containerCapacity: 6,
  },
  {
    id: 'core.container.transport',
    scope: 'core',
    name: 'Transportbehälter',
    description:
      'Großer Behälter mit zehn Plätzen für sperrige Transporte. Kein Nesting in V1.',
    type: 'container',
    load: 2,
    cost: 2,
    stackLimit: 1,
    containerCapacity: 10,
  },

  // --- Misc / wearable utility (6) ---
  {
    id: 'core.misc.light-source',
    scope: 'core',
    name: 'Lichtquelle',
    description:
      'Tragbare Lichtquelle für dunkle Orte. Form — Fackel, Lampe, Glowstick — legt das Weltprofil fest.',
    type: 'misc',
    load: 0,
    cost: 1,
    stackLimit: 3,
  },
  {
    id: 'core.misc.rope',
    scope: 'core',
    name: 'Seil / Leine',
    description:
      'Seil oder Leine für Klettern, Sichern und Ziehen. Kein stillschweigender Zahlenbonus.',
    type: 'misc',
    load: 1,
    cost: 1,
    stackLimit: 2,
  },
  {
    id: 'core.misc.documentation',
    scope: 'core',
    name: 'Dokumentationsmaterial',
    description:
      'Notizbücher, Datenträger oder vergleichbares Material zum Festhalten von Informationen.',
    type: 'misc',
    load: 0,
    cost: 1,
    stackLimit: 3,
  },
  {
    id: 'core.misc.communicator',
    scope: 'core',
    name: 'Kommunikationsmittel',
    description:
      'Gerät oder Artefakt zur Kommunikation über Distanz. Die konkrete Realisierung — mundan, magisch oder technisch — gehört zum Weltprofil.',
    type: 'misc',
    load: 0,
    cost: 2,
    stackLimit: 1,
    equipSlots: ['accessory1', 'accessory2'],
  },
  {
    id: 'core.misc.headgear',
    scope: 'core',
    name: 'Kopfbedeckung / Schutzhelm',
    description:
      'Kopfbedeckung oder Helm ohne eigenen Schutzwert. Schutz kommt nur, wenn eine Regel oder Fähigkeit ihn ausdrücklich vergibt.',
    type: 'misc',
    load: 1,
    cost: 1,
    stackLimit: 1,
    equipSlots: ['head'],
  },
  {
    id: 'core.misc.special-device',
    scope: 'core',
    name: 'Spezialgerät',
    description:
      'Universelles Spezialgerät für außergewöhnliche Aufgaben. Mundane, magische oder technische Ausprägung bestimmt das Weltprofil; kein versteckter Zahlenbonus.',
    type: 'misc',
    load: 1,
    cost: 3,
    stackLimit: 1,
    equipSlots: ['special'],
  },
] satisfies ItemDefinition[]);

/** All Core definitions, in declaration order. */
export function listCoreItemDefinitions(): readonly ItemDefinition[] {
  return CORE_DEFINITIONS;
}

/** Resolve a Core definition by stable id, or `undefined` if unknown. */
export function getCoreItemDefinition(definitionId: string): ItemDefinition | undefined {
  return CORE_DEFINITIONS.find((definition) => definition.id === definitionId);
}

/** Core definitions as catalog records — always active, never owned. */
export function coreCatalogRecords(): CatalogDefinitionRecord[] {
  return CORE_DEFINITIONS.map((definition) => ({ definition, status: 'active' as const }));
}
