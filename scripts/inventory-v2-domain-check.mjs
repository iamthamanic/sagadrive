#!/usr/bin/env node
/**
 * Inventory v2 domain check (#106) — runs the real domain code (bundled via
 * esbuild) against the binding slot/stack/container/equipment/quick-access
 * rules from the epic. Covers the twelve required test groups of issue #106.
 * Location: scripts/inventory-v2-domain-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outdir = join(root, 'node_modules', '.cache', 'inventory-v2-domain-check');
mkdirSync(outdir, { recursive: true });

const esbuild = join(root, 'node_modules', '.bin', 'esbuild');
execFileSync(
  esbuild,
  [
    join(root, 'src/domains/character/inventory-v2/index.ts'),
    '--bundle',
    '--format=esm',
    `--outfile=${join(outdir, 'inventory.mjs')}`,
  ],
  { stdio: 'inherit' },
);

const inv = await import(pathToFileURL(join(outdir, 'inventory.mjs')).href);

let failures = 0;
let group = '';

function section(name) {
  group = name;
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  }
}

function equal(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — erwartet ${b}, war ${a}`);
  }
}

/** Assert an operation succeeded and return the resulting state. */
function expectOk(result, message) {
  if (!result.ok) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — blockiert mit ${result.error} (${result.reason})`);
    return null;
  }
  return result.state;
}

/** Assert an operation was refused with a specific error code. */
function expectError(result, code, message) {
  if (result.ok) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — Operation war erfolgreich, erwartet ${code}`);
    return;
  }
  if (result.error !== code) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — erwartet ${code}, war ${result.error}`);
  }
}

/** Run an operation and assert the input state was not mutated (purity). */
function pure(state, run, message) {
  const before = JSON.stringify(state);
  const result = run();
  if (JSON.stringify(state) !== before) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message} — Eingabezustand wurde mutiert`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Test catalog
// ---------------------------------------------------------------------------

/** @type {Record<string, import('../src/domains/character/inventory-v2/types').ItemDefinition>} */
const CATALOG = {};

function define(definition) {
  CATALOG[definition.id] = {
    scope: 'core',
    description: `Testdefinition ${definition.id}`,
    load: 0,
    cost: 0,
    stackLimit: 1,
    ...definition,
  };
}

define({ id: 'core:shortsword', name: 'Kurzschwert', type: 'weapon', load: 1, cost: 2, equipSlots: ['mainHand', 'offHand'] });
define({ id: 'core:aermelmesser', name: 'Ärmelmesser', type: 'weapon', load: 1, cost: 1, equipSlots: ['mainHand', 'offHand'] });
define({ id: 'core:zweihaender', name: 'Zweihänder', type: 'weapon', load: 2, cost: 3, equipSlots: ['mainHand', 'offHand'] });
define({
  id: 'core:greatsword',
  name: 'Großschwert',
  type: 'weapon',
  load: 2,
  cost: 3,
  equipSlots: ['mainHand', 'offHand'],
  twoHanded: true,
  requirements: { minimumStrength: 2 },
});
define({
  id: 'core:heavy-hammer',
  name: 'Schwerer Hammer',
  type: 'weapon',
  load: 3,
  cost: 3,
  equipSlots: ['mainHand', 'offHand'],
  twoHanded: true,
  requirements: { minimumStrength: 4 },
});
define({ id: 'core:shield', name: 'Schild', type: 'shield', load: 1, cost: 2, protection: 1, equipSlots: ['offHand'] });
define({ id: 'core:helm', name: 'Helm', type: 'armor', load: 1, cost: 2, protection: 1, equipSlots: ['head'] });
define({ id: 'core:leather-armor', name: 'Lederrüstung', type: 'armor', load: 2, cost: 3, protection: 2, equipSlots: ['body'] });
define({ id: 'core:amulet', name: 'Amulett', type: 'misc', load: 0, cost: 1, equipSlots: ['accessory1', 'accessory2'] });
define({ id: 'core:rope', name: 'Seil', type: 'tool', load: 1, cost: 1 });
define({ id: 'core:torch', name: 'Fackel', type: 'tool', load: 0, cost: 1, stackLimit: 5 });
define({ id: 'core:ration', name: 'Ration', type: 'consumable', load: 1, cost: 1, stackLimit: 3 });
define({ id: 'core:potion', name: 'Trank', type: 'consumable', load: 0, cost: 2, stackLimit: 5 });
define({ id: 'core:backpack', name: 'Rucksack', type: 'container', load: 1, cost: 2, containerCapacity: 4 });
define({ id: 'core:pouch', name: 'Beutel', type: 'container', load: 0, cost: 1, containerCapacity: 2 });
// Identical name + type, different ids — exercises the definition-id tie-breaker.
define({ id: 'core:dagger-a', name: 'Dolch', type: 'weapon', load: 1, cost: 1 });
define({ id: 'core:dagger-b', name: 'Dolch', type: 'weapon', load: 1, cost: 1 });

const lookup = (definitionId) => CATALOG[definitionId];

/** Instance ids currently referenced by the base grid, in slot order. */
function baseDefinitionIds(state) {
  return state.baseSlots.map((reference) =>
    reference === null ? null : state.instances[reference].definitionId,
  );
}

/** Instances of a definition with their quantities, in base-slot order. */
function stacksOf(state, definitionId) {
  return state.baseSlots
    .filter((reference) => reference !== null && state.instances[reference].definitionId === definitionId)
    .map((reference) => state.instances[reference].quantity);
}

/** Place a definition directly into a base slot and return the new instance id. */
function place(state, definitionId, slotIndex, overrides = {}) {
  const instanceId = overrides.instanceId ?? `t-${definitionId.replace(/[^a-z]/g, '')}-${slotIndex}`;
  state.instances[instanceId] = {
    instanceId,
    definitionId,
    quantity: overrides.quantity ?? 1,
    ...(overrides.state ? { state: overrides.state } : {}),
  };
  state.baseSlots[slotIndex] = instanceId;
  if (CATALOG[definitionId].type === 'container') {
    state.containers[instanceId] = Array.from(
      { length: CATALOG[definitionId].containerCapacity },
      () => null,
    );
  }
  return instanceId;
}

// ===========================================================================
// 1. 20-slot boundary and atomic add failure
// ===========================================================================
section('1 · 20-Slot-Grenze & atomarer Add-Fehler');
{
  check(inv.BASE_SLOT_COUNT === 20, 'BASE_SLOT_COUNT ist 20');
  check(inv.QUICK_SLOT_COUNT === 4, 'QUICK_SLOT_COUNT ist 4');

  const empty = inv.createEmptyInventory();
  equal(empty.baseSlots.length, 20, 'leeres Inventar hat 20 Basisplätze');
  equal(empty.quickSlots, [null, null, null, null], 'leeres Inventar hat 4 explizit leere Schnellzugriffe');
  check(empty.baseSlots.every((slot) => slot === null), 'leere Positionen sind explizite null');

  let state = empty;
  for (let index = 0; index < 20; index += 1) {
    state = expectOk(inv.addItems(state, lookup, 'core:rope', 1), `Seil ${index + 1} hinzufügen`) ?? state;
  }
  equal(inv.freeBaseSlotIndices(state).length, 0, 'nach 20 Seilen ist kein Platz mehr frei');
  equal(Object.keys(state.instances).length, 20, '20 Instanzen vorhanden');

  const full = pure(state, () => inv.addItems(state, lookup, 'core:rope', 1), 'Add bei vollem Inventar');
  expectError(full, 'BASE_SLOTS_FULL', '21. Seil wird abgewiesen');

  // Atomicity: three non-stackable units into a single free slot must add none.
  const nineteen = expectOk(inv.removeItem(state, state.baseSlots[19]), 'einen Platz freimachen');
  equal(inv.freeBaseSlotIndices(nineteen).length, 1, 'genau ein freier Platz');
  const partial = pure(nineteen, () => inv.addItems(nineteen, lookup, 'core:rope', 3), 'atomarer Teil-Add');
  expectError(partial, 'BASE_SLOTS_FULL', '3 Seile bei 1 freiem Platz werden atomar abgewiesen');
  equal(stacksOf(nineteen, 'core:rope').length, 19, 'kein Teil-Add: weiterhin 19 Seile');
}

// ===========================================================================
// 2. Filling partial stacks before creating new stacks
// ===========================================================================
section('2 · Teilstapel vor neuem Stapel füllen');
{
  let state = expectOk(inv.addItems(inv.createEmptyInventory(), lookup, 'core:torch', 3), '3 Fackeln');
  equal(stacksOf(state, 'core:torch'), [3], 'ein Stapel mit 3 Fackeln');

  state = expectOk(inv.addItems(state, lookup, 'core:torch', 1), '1 weitere Fackel');
  equal(stacksOf(state, 'core:torch'), [4], 'Teilstapel wird gefüllt, kein neuer Stapel');
  equal(inv.freeBaseSlotIndices(state).length, 19, 'kein zusätzlicher Platz belegt');

  state = expectOk(inv.addItems(state, lookup, 'core:torch', 4), '4 weitere Fackeln');
  equal(stacksOf(state, 'core:torch'), [5, 3], 'erst auf Stapellimit auffüllen, dann neuer Stapel');

  // Stack limit 1 never tops up.
  let single = expectOk(inv.addItems(inv.createEmptyInventory(), lookup, 'core:rope', 2), '2 Seile');
  equal(stacksOf(single, 'core:rope'), [1, 1], 'stackLimit=1 erzeugt zwei getrennte Stapel');
}

// ===========================================================================
// 3. Split / merge and incompatible instance state
// ===========================================================================
section('3 · Teilen, Zusammenlegen & inkompatibler Instanzzustand');
{
  let state = expectOk(inv.addItems(inv.createEmptyInventory(), lookup, 'core:ration', 3), '3 Rationen');
  const sourceId = state.baseSlots[0];

  const split = pure(state, () => inv.splitStack(state, lookup, sourceId, 1, { kind: 'base', slotIndex: 1 }), 'Split');
  const afterSplit = expectOk(split, '1 Ration abteilen');
  equal(afterSplit.instances[sourceId].quantity, 2, 'Quelle behält 2');
  equal(state.instances[sourceId].quantity, 3, 'Eingabezustand unverändert');
  const splitId = afterSplit.baseSlots[1];
  equal(afterSplit.instances[splitId].quantity, 1, 'neuer Stapel hat 1');

  const merged = expectOk(inv.mergeStacks(afterSplit, lookup, splitId, sourceId), 'zurück zusammenlegen');
  equal(merged.instances[sourceId].quantity, 3, 'Ziel hat wieder 3');
  check(merged.instances[splitId] === undefined, 'Quell-Instanz ist entfernt');
  equal(merged.baseSlots[1], null, 'Quell-Platz ist wieder leer');

  expectError(
    inv.splitStack(state, lookup, sourceId, 3, { kind: 'base', slotIndex: 1 }),
    'INVALID_INPUT',
    'Teilmenge gleich Stapelgröße wird abgewiesen',
  );
  expectError(
    inv.splitStack(state, lookup, sourceId, 1, { kind: 'base', slotIndex: 0 }),
    'SLOT_OCCUPIED',
    'Split auf belegten Platz wird abgewiesen',
  );

  const ropes = expectOk(inv.addItems(inv.createEmptyInventory(), lookup, 'core:rope', 2), '2 Seile');
  expectError(
    inv.splitStack(ropes, lookup, ropes.baseSlots[0], 1, { kind: 'base', slotIndex: 5 }),
    'INVALID_INPUT',
    'nicht stapelbarer Gegenstand mit Menge 1 kann nicht geteilt werden',
  );
  expectError(
    inv.mergeStacks(ropes, lookup, ropes.baseSlots[0], ropes.baseSlots[1]),
    'NOT_STACKABLE',
    'stackLimit=1 verhindert Zusammenlegen',
  );

  // Divergent per-instance state never merges and is never topped up.
  const stateful = inv.createEmptyInventory();
  const plainId = place(stateful, 'core:ration', 0, { quantity: 1, instanceId: 'plain' });
  const engravedId = place(stateful, 'core:ration', 1, {
    quantity: 1,
    instanceId: 'engraved',
    state: { engraving: 'Hausmarke' },
  });
  expectError(
    inv.mergeStacks(stateful, lookup, engravedId, plainId),
    'INCOMPATIBLE_STACK',
    'abweichender Instanzzustand blockiert Merge',
  );

  const onlyStateful = inv.createEmptyInventory();
  place(onlyStateful, 'core:ration', 0, { quantity: 1, instanceId: 'engraved', state: { engraving: 'Hausmarke' } });
  const added = expectOk(inv.addItems(onlyStateful, lookup, 'core:ration', 1), 'Ration zu bestücktem Stapel');
  equal(added.instances.engraved.quantity, 1, 'Stapel mit Instanzzustand wird nicht aufgefüllt');
  equal(stacksOf(added, 'core:ration'), [1, 1], 'stattdessen entsteht ein neuer Stapel');
  equal(added.instances[plainId], undefined, 'keine Fremdinstanz eingeschleppt');

  // The stack key must be injective: a delimiter-joined `k=v` string would make
  // these pairs compare equal and let a merge discard one of the two states.
  const ambiguous = inv.createEmptyInventory();
  const joinedId = place(ambiguous, 'core:ration', 0, { instanceId: 'joined', state: { a: 'x|b=y' } });
  const twoKeyId = place(ambiguous, 'core:ration', 1, { instanceId: 'split', state: { a: 'x', b: 'y' } });
  const numericId = place(ambiguous, 'core:ration', 2, { instanceId: 'numeric', state: { x: 1 } });
  const textualId = place(ambiguous, 'core:ration', 3, { instanceId: 'textual', state: { x: '1' } });
  expectError(
    inv.mergeStacks(ambiguous, lookup, joinedId, twoKeyId),
    'INCOMPATIBLE_STACK',
    'Trennzeichen im Wert kollidiert nicht mit zwei Schlüsseln',
  );
  expectError(
    inv.mergeStacks(ambiguous, lookup, numericId, textualId),
    'INCOMPATIBLE_STACK',
    'Zahl 1 und Text "1" gelten nicht als derselbe Stapel',
  );
  const sameState = inv.createEmptyInventory();
  const leftId = place(sameState, 'core:ration', 0, { instanceId: 'left', state: { b: 'y', a: 'x' } });
  const rightId = place(sameState, 'core:ration', 1, { instanceId: 'right', state: { a: 'x', b: 'y' } });
  const orderMerged = expectOk(inv.mergeStacks(sameState, lookup, leftId, rightId), 'gleicher Zustand merged');
  equal(orderMerged.instances[rightId].quantity, 2, 'Schlüsselreihenfolge ist für die Identität egal');

  const capped = expectOk(inv.addItems(inv.createEmptyInventory(), lookup, 'core:ration', 3), 'voller Stapel');
  const extra = expectOk(inv.addItems(capped, lookup, 'core:ration', 1), 'eine weitere Ration');
  expectError(
    inv.mergeStacks(extra, lookup, extra.baseSlots[1], extra.baseSlots[0]),
    'STACK_LIMIT_REACHED',
    'Merge über das Stapellimit wird abgewiesen',
  );
}

// ===========================================================================
// 4. Deterministic sort without implicit merge
// ===========================================================================
section('4 · Deterministisches Sortieren ohne implizites Merge');
{
  const state = inv.createEmptyInventory();
  place(state, 'core:ration', 0, { quantity: 2 });
  place(state, 'core:backpack', 1);
  place(state, 'core:zweihaender', 2);
  place(state, 'core:aermelmesser', 3);
  place(state, 'core:shield', 4);
  place(state, 'core:helm', 5);
  place(state, 'core:rope', 6);
  place(state, 'core:amulet', 7);

  const sorted = expectOk(inv.sortBaseGrid(state, lookup), 'Basisgrid sortieren');
  equal(
    baseDefinitionIds(sorted).slice(0, 8),
    [
      'core:aermelmesser',
      'core:zweihaender',
      'core:helm',
      'core:shield',
      'core:rope',
      'core:ration',
      'core:backpack',
      'core:amulet',
    ],
    'Typreihenfolge weapon → armor → shield → tool → consumable → container → misc, Namen nach de-DE',
  );
  check(
    sorted.baseSlots.slice(8).every((slot) => slot === null),
    'freie Positionen werden zu expliziten null am Ende',
  );

  // de-DE collation, not code-unit order: "Ärmelmesser" sorts before "Zweihänder".
  check(
    'Ärmelmesser'.localeCompare('Zweihänder', 'de-DE') < 0 && 'Ärmelmesser' > 'Zweihänder',
    'Testdaten belegen, dass Code-Unit-Sortierung ein anderes Ergebnis liefern würde',
  );

  const ties = inv.createEmptyInventory();
  place(ties, 'core:dagger-b', 0);
  place(ties, 'core:dagger-a', 1);
  const sortedTies = expectOk(inv.sortBaseGrid(ties, lookup), 'Namensgleichheit sortieren');
  equal(
    baseDefinitionIds(sortedTies).slice(0, 2),
    ['core:dagger-a', 'core:dagger-b'],
    'Definition-ID ist stabiler Tie-Breaker',
  );

  const unmerged = inv.createEmptyInventory();
  place(unmerged, 'core:torch', 0, { quantity: 3, instanceId: 'torch-a' });
  place(unmerged, 'core:torch', 4, { quantity: 1, instanceId: 'torch-b' });
  const sortedStacks = expectOk(inv.sortBaseGrid(unmerged, lookup), 'Stapel sortieren');
  equal(stacksOf(sortedStacks, 'core:torch'), [3, 1], 'Sortieren führt keine Stapel zusammen');

  const untouched = inv.createEmptyInventory();
  const backpackId = place(untouched, 'core:backpack', 0);
  const insideId = place(untouched, 'core:rope', 1);
  const withContent = expectOk(
    inv.moveIntoContainer(untouched, lookup, insideId, backpackId, 2),
    'Seil in Rucksack',
  );
  const sortedWithContainer = expectOk(inv.sortBaseGrid(withContent, lookup), 'sortieren mit Behälterinhalt');
  equal(
    sortedWithContainer.containers[backpackId],
    [null, null, insideId, null],
    'Behälterpositionen bleiben unberührt',
  );
}

// ===========================================================================
// 5. Container moves, capacity and nesting rejection
// ===========================================================================
section('5 · Behälter: Kapazität, Bewegungen & Nesting-Verbot');
{
  const state = inv.createEmptyInventory();
  const backpackId = place(state, 'core:backpack', 0);
  const pouchId = place(state, 'core:pouch', 1);
  const ropeId = place(state, 'core:rope', 2);
  equal(state.containers[backpackId].length, 4, 'Rucksack hat 4 Kapazitätspositionen');

  const moved = expectOk(inv.moveIntoContainer(state, lookup, ropeId, backpackId, 0), 'Seil in Rucksack');
  equal(moved.baseSlots[2], null, 'Basisplatz wird frei');
  equal(moved.containers[backpackId][0], ropeId, 'Seil liegt im Rucksack');
  equal(inv.calculateTotalLoad(moved, lookup), 2, 'Inhalt zählt weiter zur Last (Rucksack 1 + Seil 1)');

  expectError(
    inv.moveIntoContainer(moved, lookup, pouchId, backpackId, 1),
    'CONTAINER_NESTING_FORBIDDEN',
    'Behälter-in-Behälter ist verboten',
  );
  expectError(
    inv.moveIntoContainer(moved, lookup, ropeId, backpackId, 0),
    'CONTAINER_FULL',
    'belegte Behälterposition wird abgewiesen',
  );
  expectError(
    inv.moveIntoContainer(moved, lookup, backpackId, backpackId, 1),
    'INVALID_INPUT',
    'Behälter kann nicht in sich selbst',
  );
  expectError(
    inv.moveIntoContainer(moved, lookup, ropeId, pouchId, 0),
    'CONTAINER_NESTING_FORBIDDEN',
    'Umzug direkt aus einem Behälter in einen anderen ist verboten',
  );
  expectError(
    inv.moveIntoContainer(moved, lookup, pouchId, ropeId, 0),
    'NOT_A_CONTAINER',
    'Nicht-Behälter als Ziel wird abgewiesen',
  );

  // Fill the container to capacity, then reject one more.
  let filled = moved;
  for (let position = 1; position < 4; position += 1) {
    const extraId = `extra-${position}`;
    filled = inv.cloneInventory(filled);
    filled.instances[extraId] = { instanceId: extraId, definitionId: 'core:rope', quantity: 1 };
    filled.baseSlots[5 + position] = extraId;
    filled = expectOk(
      inv.moveIntoContainer(filled, lookup, extraId, backpackId, position),
      `Seil auf Position ${position}`,
    );
  }
  check(
    filled.containers[backpackId].every((entry) => entry !== null),
    'Rucksack ist voll',
  );
  const overflowingId = 'extra-overflow';
  const withCandidate = inv.cloneInventory(filled);
  withCandidate.instances[overflowingId] = { instanceId: overflowingId, definitionId: 'core:rope', quantity: 1 };
  withCandidate.baseSlots[10] = overflowingId;
  expectError(
    inv.moveIntoContainer(withCandidate, lookup, overflowingId, backpackId, 3),
    'CONTAINER_FULL',
    'voller Behälter nimmt nichts mehr auf',
  );

  const out = expectOk(inv.moveOutOfContainer(moved, ropeId, backpackId, 7), 'Seil aus Rucksack holen');
  equal(out.containers[backpackId][0], null, 'Behälterposition wird frei');
  equal(out.baseSlots[7], ropeId, 'Seil liegt im Basisplatz 7');
  expectError(
    inv.moveOutOfContainer(moved, ropeId, backpackId, 0),
    'SLOT_OCCUPIED',
    'Herausnehmen ohne freien Zielplatz wird atomar blockiert',
  );
  expectError(
    inv.moveOutOfContainer(moved, pouchId, backpackId, 7),
    'UNKNOWN_INSTANCE',
    'Instanz liegt nicht in diesem Behälter',
  );

  const emptyPouches = inv.createEmptyInventory();
  place(emptyPouches, 'core:pouch', 0, { instanceId: 'pouch-a' });
  place(emptyPouches, 'core:pouch', 1, { instanceId: 'pouch-b' });
  expectError(
    inv.mergeStacks(emptyPouches, lookup, 'pouch-a', 'pouch-b'),
    'NOT_STACKABLE',
    'Behälter sind nicht stapelbar',
  );

  // One instance must mean one container, even if a catalog author declares a
  // stack limit above 1 (#108/#112) — otherwise a stack would share one capacity map.
  define({ id: 'core:bad-crate', name: 'Fehlerhafte Kiste', type: 'container', load: 1, cost: 1, containerCapacity: 3, stackLimit: 5 });
  equal(inv.effectiveStackLimit(CATALOG['core:bad-crate']), 1, 'Behälter werden auf Stapellimit 1 festgenagelt');
  equal(inv.containerCapacityOf(CATALOG['core:bad-crate']), 3, 'Behälterkapazität bleibt erhalten');
  const crates = expectOk(inv.addItems(inv.createEmptyInventory(), lookup, 'core:bad-crate', 3), '3 Kisten');
  equal(stacksOf(crates, 'core:bad-crate'), [1, 1, 1], 'jede Kiste ist eine eigene Instanz');
  equal(
    Object.keys(crates.containers).length,
    3,
    'jede Kiste erhält ihre eigene Kapazitätsliste',
  );
  equal(inv.validateInventory(crates, lookup).findings, [], 'Behälter-Stapellimit ergibt gültigen Zustand');
  // A healthy save must survive a normalize on load without reporting corruption,
  // even though the catalog declares stackLimit 5 for this container.
  equal(inv.normalizeInventory(crates, lookup).repairs, [], 'gültiger Bestand erzeugt keine Reparaturen');

  const stackedCrate = inv.createEmptyInventory();
  place(stackedCrate, 'core:bad-crate', 0, { quantity: 4, instanceId: 'crate' });
  check(
    inv.validateInventory(stackedCrate, lookup).findings.some((entry) => entry.code === 'INVALID_QUANTITY'),
    'gestapelter Behälter wird als ungültige Menge gemeldet',
  );
  const repairedCrates = inv.normalizeInventory(stackedCrate, lookup);
  equal(inv.validateInventory(repairedCrates.state, lookup).findings, [], 'Normalisierung repariert den Behälter-Stapel');
  equal(
    Object.values(repairedCrates.state.instances).reduce((sum, instance) => sum + instance.quantity, 0),
    4,
    'alle vier Kisten bleiben erhalten',
  );
}

// ===========================================================================
// 6. Total load across every location, two-handed counted once
// ===========================================================================
section('6 · Traglast über alle Orte, Zweihand nur einmal');
{
  const state = inv.createEmptyInventory();
  const greatswordId = place(state, 'core:greatsword', 0);
  const armorId = place(state, 'core:leather-armor', 1);
  const backpackId = place(state, 'core:backpack', 2);
  const rationId = place(state, 'core:ration', 3, { quantity: 3 });
  place(state, 'core:rope', 4, { instanceId: 'rope-base' });
  state.instances['rope-overflow'] = { instanceId: 'rope-overflow', definitionId: 'core:rope', quantity: 1 };
  state.legacyOverflow = ['rope-overflow'];

  let composed = expectOk(inv.moveIntoContainer(state, lookup, rationId, backpackId, 0), 'Rationen in Rucksack');
  composed = expectOk(inv.equipItem(composed, lookup, armorId, 'body', 3), 'Rüstung anlegen');
  composed = expectOk(inv.equipItem(composed, lookup, greatswordId, 'mainHand', 3), 'Zweihänder ausrüsten');

  equal(composed.equipment.mainHand, greatswordId, 'Zweihänder belegt die Haupthand');
  equal(composed.equipment.offHand, greatswordId, 'Zweihänder belegt auch die Nebenhand');
  equal(
    inv.equipmentSlotsOf(composed, greatswordId),
    ['mainHand', 'offHand'],
    'eine Instanz, zwei Hand-Referenzen',
  );
  check(inv.isTwoHandedHandPair(composed, greatswordId, lookup), 'Hand-Paar wird als Zweihand erkannt');

  // greatsword 2 + armor 2 + backpack 1 + 3 rations × 1 + rope 1 + overflow rope 1
  equal(inv.calculateTotalLoad(composed, lookup), 10, 'Last summiert jeden Ort genau einmal');
  equal(
    inv.listPlacements(composed).length,
    Object.keys(composed.instances).length,
    'jede Instanz hat genau einen physischen Ort',
  );
  equal(
    inv.findInstanceLocation(composed, greatswordId),
    { kind: 'equipment', slot: 'mainHand' },
    'Zweihand-Instanz meldet einen Ort',
  );
  equal(inv.findInstanceLocation(composed, 'rope-overflow'), { kind: 'overflow' }, 'Overflow ist ein Ort');
  equal(inv.validateInventory(composed, lookup).findings, [], 'zusammengesetzter Zustand ist gültig');
}

// ===========================================================================
// 7. Two-handed equip conflict: success and atomic rollback
// ===========================================================================
section('7 · Zweihand-Konflikt: Verdrängung & atomarer Rollback');
{
  const base = inv.createEmptyInventory();
  const swordId = place(base, 'core:shortsword', 0);
  const shieldId = place(base, 'core:shield', 1);
  const greatswordId = place(base, 'core:greatsword', 2);

  let armed = expectOk(inv.equipItem(base, lookup, swordId, 'mainHand', 3), 'Kurzschwert in Haupthand');
  armed = expectOk(inv.equipItem(armed, lookup, shieldId, 'offHand', 3), 'Schild in Nebenhand');
  equal(inv.equipmentSlotsOf(armed, shieldId), ['offHand'], 'Schild ist ein Einhand-Gegenstand');

  const swapped = expectOk(inv.equipItem(armed, lookup, greatswordId, 'mainHand', 3), 'Zweihänder ausrüsten');
  equal(swapped.equipment.mainHand, greatswordId, 'Zweihänder in Haupthand');
  equal(swapped.equipment.offHand, greatswordId, 'Zweihänder in Nebenhand');
  check(
    swapped.baseSlots.includes(swordId) && swapped.baseSlots.includes(shieldId),
    'beide verdrängten Gegenstände liegen wieder im Basisinventar',
  );
  equal(inv.validateInventory(swapped, lookup).findings, [], 'Zustand nach Verdrängung ist gültig');

  // Rollback: only the vacated source slot is free, but two items must be displaced.
  let cramped = armed;
  const freeIndices = inv.freeBaseSlotIndices(cramped);
  cramped = inv.cloneInventory(cramped);
  for (const index of freeIndices) {
    if (cramped.baseSlots[index] === greatswordId) continue;
    const fillerId = `filler-${index}`;
    cramped.instances[fillerId] = { instanceId: fillerId, definitionId: 'core:rope', quantity: 1 };
    cramped.baseSlots[index] = fillerId;
  }
  equal(inv.freeBaseSlotIndices(cramped).length, 0, 'Basisinventar ist voll');
  const blocked = pure(
    cramped,
    () => inv.equipItem(cramped, lookup, greatswordId, 'mainHand', 3),
    'Zweihand-Rollback',
  );
  expectError(blocked, 'BASE_SLOTS_FULL', 'zwei Verdrängte bei einem freiwerdenden Platz werden blockiert');
  equal(cramped.equipment.mainHand, swordId, 'Originalzustand bleibt erhalten (Haupthand)');
  equal(cramped.equipment.offHand, shieldId, 'Originalzustand bleibt erhalten (Nebenhand)');

  // One displaced item fits into the vacated source slot.
  let single = inv.cloneInventory(cramped);
  delete single.equipment.offHand;
  const shieldSlot = inv.freeBaseSlotIndices(single)[0];
  check(shieldSlot === undefined, 'Nebenhand freigeben schafft keinen Basisplatz');
  single = expectOk(inv.equipItem(single, lookup, greatswordId, 'mainHand', 3), 'Zweihänder bei einem Verdrängten');
  equal(single.equipment.offHand, greatswordId, 'Zweihänder belegt beide Hände');
  check(single.baseSlots.includes(swordId), 'das verdrängte Kurzschwert nutzt den freigewordenen Quellplatz');

  // Unequip needs exactly one free base slot, even for a two-handed instance.
  const noRoom = pure(single, () => inv.unequipItem(single, 'mainHand'), 'Ablegen ohne Platz');
  expectError(noRoom, 'BASE_SLOTS_FULL', 'Ablegen ohne freies Basis-Fach wird blockiert');

  const roomy = expectOk(inv.removeItem(single, single.baseSlots[19]), 'Platz schaffen');
  const stowed = expectOk(inv.unequipItem(roomy, 'mainHand'), 'Zweihänder ablegen');
  equal(stowed.equipment.mainHand, undefined, 'Haupthand ist frei');
  equal(stowed.equipment.offHand, undefined, 'Nebenhand ist ebenfalls frei');
  check(stowed.baseSlots.includes(greatswordId), 'Zweihänder liegt als ein Stapel im Basisinventar');

  // No silent retargeting of an invalid slot request.
  expectError(
    inv.equipItem(base, lookup, greatswordId, 'head', 3),
    'NOT_EQUIPPABLE',
    'Zweihänder wird nicht still in eine Hand umgeleitet',
  );
  expectError(
    inv.equipItem(base, lookup, shieldId, 'mainHand', 3),
    'NOT_EQUIPPABLE',
    'Schild deklariert nur die Nebenhand',
  );
  const ropeOnly = inv.createEmptyInventory();
  const plainRopeId = place(ropeOnly, 'core:rope', 0);
  expectError(
    inv.equipItem(ropeOnly, lookup, plainRopeId, 'body', 3),
    'NOT_EQUIPPABLE',
    'nicht ausrüstbarer Gegenstand wird abgewiesen',
  );
}

// ===========================================================================
// 8. Minimum strength blocks equipping, never ownership
// ===========================================================================
section('8 · Mindeststärke blockiert nur das Ausrüsten');
{
  const state = inv.createEmptyInventory();
  const hammerId = place(state, 'core:heavy-hammer', 0);

  const blocked = pure(state, () => inv.equipItem(state, lookup, hammerId, 'mainHand', 3), 'Stärke 3');
  expectError(blocked, 'REQUIREMENT_NOT_MET', 'Mindeststärke 4 wird bei Stärke 3 nicht erfüllt');
  equal(state.baseSlots[0], hammerId, 'Besitz bleibt gültig — Gegenstand bleibt im Inventar');
  equal(inv.calculateTotalLoad(state, lookup), 3, 'nicht ausgerüsteter Besitz zählt zur Last');

  const equipped = expectOk(inv.equipItem(state, lookup, hammerId, 'mainHand', 4), 'Stärke 4');
  equal(equipped.equipment.mainHand, hammerId, 'bei erfüllter Voraussetzung wird ausgerüstet');
  equal(equipped.baseSlots[0], null, 'ausgerüstete Gegenstände belegen keinen Basisplatz');
  equal(inv.calculateTotalLoad(equipped, lookup), 3, 'Ausrüsten ändert die Last nicht');
}

// ===========================================================================
// 9. Quick-slot eligibility and automatic cleanup
// ===========================================================================
section('9 · Schnellzugriff: Eignung & automatische Bereinigung');
{
  const state = inv.createEmptyInventory();
  const potionId = place(state, 'core:potion', 0, { quantity: 2 });
  const helmId = place(state, 'core:helm', 1);
  const backpackId = place(state, 'core:backpack', 2);
  const ropeId = place(state, 'core:rope', 3);
  state.instances['overflow-rope'] = { instanceId: 'overflow-rope', definitionId: 'core:rope', quantity: 1 };
  state.legacyOverflow = ['overflow-rope'];

  let assigned = expectOk(inv.assignQuickSlot(state, 0, potionId), 'Basis-Gegenstand belegen');
  assigned = expectOk(inv.equipItem(assigned, lookup, helmId, 'head', 3), 'Helm anlegen');
  assigned = expectOk(inv.assignQuickSlot(assigned, 1, helmId), 'ausgerüsteten Gegenstand belegen');
  equal(assigned.quickSlots, [potionId, helmId, null, null], 'zwei Referenzen belegt');
  equal(
    Object.keys(assigned.instances).length,
    Object.keys(state.instances).length,
    'Schnellzugriff erzeugt keine Instanz',
  );
  equal(inv.freeBaseSlotIndices(assigned).length, 17, 'Schnellzugriff erzeugt keinen Slot');

  expectError(
    inv.assignQuickSlot(assigned, 2, 'overflow-rope'),
    'NOT_QUICK_SLOT_ELIGIBLE',
    'Overflow-Gegenstände sind nicht schnellzugriff-fähig',
  );
  expectError(inv.assignQuickSlot(assigned, 4, potionId), 'INVALID_INPUT', 'Index 4 existiert nicht');
  expectError(inv.assignQuickSlot(assigned, -1, potionId), 'INVALID_INPUT', 'negativer Index wird abgewiesen');
  expectError(inv.assignQuickSlot(assigned, 0, 'unbekannt'), 'UNKNOWN_INSTANCE', 'unbekannte Instanz wird abgewiesen');

  const inContainer = expectOk(inv.moveIntoContainer(assigned, lookup, ropeId, backpackId, 0), 'Seil in Rucksack');
  expectError(
    inv.assignQuickSlot(inContainer, 2, ropeId),
    'NOT_QUICK_SLOT_ELIGIBLE',
    'Behälter-Gegenstände sind nicht schnellzugriff-fähig',
  );

  // Moving a quick-slotted item into a container clears the reference.
  let quickThenContainer = expectOk(inv.assignQuickSlot(assigned, 2, ropeId), 'Seil belegen');
  equal(quickThenContainer.quickSlots[2], ropeId, 'Seil ist belegt');
  quickThenContainer = expectOk(
    inv.moveIntoContainer(quickThenContainer, lookup, ropeId, backpackId, 0),
    'belegtes Seil in Rucksack',
  );
  equal(quickThenContainer.quickSlots[2], null, 'Referenz wird beim Verschieben in den Behälter geleert');

  const removed = expectOk(inv.removeItem(assigned, potionId), 'belegten Gegenstand entfernen');
  equal(removed.quickSlots, [null, helmId, null, null], 'Entfernen leert alle Referenzen darauf');

  const cleared = expectOk(inv.clearQuickSlot(assigned, 1), 'Referenz manuell leeren');
  equal(cleared.quickSlots, [potionId, null, null, null], 'gezieltes Leeren funktioniert');
  equal(cleared.equipment.head, helmId, 'Leeren der Referenz legt den Helm nicht ab');

  const multi = expectOk(inv.assignQuickSlot(assigned, 3, potionId), 'gleiche Instanz zweimal belegen');
  const removedMulti = expectOk(inv.removeItem(multi, potionId), 'Instanz mit zwei Referenzen entfernen');
  equal(removedMulti.quickSlots, [null, helmId, null, null], 'alle Referenzen auf die Instanz werden geleert');
}

// ===========================================================================
// 10. Consumable quantity → 0 cleanup
// ===========================================================================
section('10 · Verbrauchsgut bis 0 & Bereinigung');
{
  const state = inv.createEmptyInventory();
  const potionId = place(state, 'core:potion', 0, { quantity: 2 });
  const ropeId = place(state, 'core:rope', 1);
  const withQuick = expectOk(inv.assignQuickSlot(state, 0, potionId), 'Trank belegen');

  const once = expectOk(inv.consumeItem(withQuick, lookup, potionId), 'einmal verbrauchen');
  equal(once.instances[potionId].quantity, 1, 'Menge sinkt um 1');
  equal(once.quickSlots[0], potionId, 'Referenz bleibt bei Restmenge erhalten');

  const empty = expectOk(inv.consumeItem(once, lookup, potionId), 'letzte Einheit verbrauchen');
  check(empty.instances[potionId] === undefined, 'Instanz wird bei 0 entfernt');
  equal(empty.baseSlots[0], null, 'Basisplatz wird frei');
  equal(empty.quickSlots[0], null, 'Referenz wird bereinigt');
  equal(inv.validateInventory(empty, lookup).findings, [], 'Zustand nach Verbrauch ist gültig');

  expectError(inv.consumeItem(state, lookup, ropeId), 'NOT_A_CONSUMABLE', 'Werkzeug ist kein Verbrauchsgut');
  expectError(inv.consumeItem(state, lookup, 'unbekannt'), 'UNKNOWN_INSTANCE', 'unbekannte Instanz wird abgewiesen');
}

// ===========================================================================
// 11. Legacy overflow restrictions and recovery
// ===========================================================================
section('11 · Legacy-Overflow: Einschränkungen & Rückführung');
{
  const state = inv.createEmptyInventory();
  const torchId = place(state, 'core:torch', 0, { quantity: 3, instanceId: 'torch-partial' });
  const backpackId = place(state, 'core:backpack', 1);
  state.instances['ovf-sword'] = { instanceId: 'ovf-sword', definitionId: 'core:shortsword', quantity: 1 };
  state.instances['ovf-rope'] = { instanceId: 'ovf-rope', definitionId: 'core:rope', quantity: 1 };
  state.legacyOverflow = ['ovf-sword', 'ovf-rope'];

  equal(inv.calculateTotalLoad(state, lookup), 3, 'Overflow zählt zur Last (Rucksack 1 + Schwert 1 + Seil 1)');

  expectError(
    inv.addItems(state, lookup, 'core:rope', 1),
    'OVERFLOW_NOT_EMPTY',
    'neue Basis-Stapel sind bei nicht leerem Overflow blockiert',
  );
  const toppedUp = expectOk(inv.addItems(state, lookup, 'core:torch', 2), 'Teilstapel trotz Overflow auffüllen');
  equal(toppedUp.instances[torchId].quantity, 5, 'Auffüllen eines bestehenden Teilstapels bleibt erlaubt');
  expectError(
    inv.addItems(toppedUp, lookup, 'core:torch', 1),
    'OVERFLOW_NOT_EMPTY',
    'sobald ein neuer Stapel nötig wäre, greift die Overflow-Sperre',
  );
  expectError(
    inv.splitStack(state, lookup, torchId, 1, { kind: 'base', slotIndex: 5 }),
    'OVERFLOW_NOT_EMPTY',
    'Split in einen neuen Basisplatz ist blockiert',
  );
  expectError(
    inv.equipItem(state, lookup, 'ovf-sword', 'mainHand', 3),
    'NOT_IN_BASE_INVENTORY',
    'Overflow-Gegenstände können nicht ausgerüstet werden',
  );
  expectError(
    inv.moveIntoContainer(state, lookup, 'ovf-rope', backpackId, 0),
    'NOT_IN_BASE_INVENTORY',
    'Overflow-Gegenstände können nicht direkt in Behälter',
  );
  expectError(
    inv.assignQuickSlot(state, 0, 'ovf-sword'),
    'NOT_QUICK_SLOT_ELIGIBLE',
    'Overflow-Gegenstände sind nicht schnellzugriff-fähig',
  );
  expectError(
    inv.recoverOverflowInstance(state, 'ovf-sword', 0),
    'SLOT_OCCUPIED',
    'Rückführung auf belegten Platz wird abgewiesen',
  );
  expectError(
    inv.recoverOverflowInstance(state, torchId, 5),
    'UNKNOWN_INSTANCE',
    'nur Overflow-Instanzen können zurückgeführt werden',
  );

  let recovered = expectOk(inv.recoverOverflowInstance(state, 'ovf-sword', 5), 'Schwert zurückführen');
  equal(recovered.baseSlots[5], 'ovf-sword', 'Schwert liegt im Basisplatz 5');
  equal(recovered.legacyOverflow, ['ovf-rope'], 'Overflow schrumpft');
  expectError(
    inv.addItems(recovered, lookup, 'core:rope', 1),
    'OVERFLOW_NOT_EMPTY',
    'Sperre bleibt, solange Overflow nicht leer ist',
  );

  recovered = expectOk(inv.recoverOverflowInstance(recovered, 'ovf-rope', 6), 'Seil zurückführen');
  equal(recovered.legacyOverflow, [], 'Overflow ist leer');
  const unlocked = expectOk(inv.addItems(recovered, lookup, 'core:rope', 1), 'neuer Stapel nach leerem Overflow');
  equal(stacksOf(unlocked, 'core:rope'), [1, 1], 'neue Stapel sind wieder möglich');
  equal(inv.validateInventory(unlocked, lookup).findings, [], 'Zustand nach Rückführung ist gültig');

  const equippable = expectOk(inv.equipItem(recovered, lookup, 'ovf-sword', 'mainHand', 3), 'zurückgeführtes Schwert');
  equal(equippable.equipment.mainHand, 'ovf-sword', 'nach Rückführung ist Ausrüsten erlaubt');
}

// ===========================================================================
// 12. Invariant validator and normalization policy
// ===========================================================================
section('12 · Invariantenprüfung & Normalisierung');
{
  const valid = expectOk(inv.addItems(inv.createEmptyInventory(), lookup, 'core:rope', 2), 'gültiger Zustand');
  equal(inv.validateInventory(valid, lookup), { ok: true, findings: [] }, 'gültiger Zustand hat keine Findings');

  const codesFor = (state) => inv.validateInventory(state, lookup).findings.map((entry) => entry.code);

  const dangling = inv.cloneInventory(valid);
  dangling.baseSlots[5] = 'geist';
  check(codesFor(dangling).includes('DANGLING_REFERENCE'), 'hängende Basis-Referenz wird erkannt');

  const duplicate = inv.cloneInventory(valid);
  duplicate.baseSlots[5] = duplicate.baseSlots[0];
  check(codesFor(duplicate).includes('DUPLICATE_LOCATION'), 'doppelter physischer Ort wird erkannt');

  const unplaced = inv.cloneInventory(valid);
  unplaced.instances['waise'] = { instanceId: 'waise', definitionId: 'core:rope', quantity: 1 };
  check(codesFor(unplaced).includes('UNPLACED_INSTANCE'), 'Instanz ohne Ort wird erkannt');

  const shortGrid = inv.cloneInventory(valid);
  shortGrid.baseSlots = shortGrid.baseSlots.slice(0, 10);
  check(codesFor(shortGrid).includes('INVALID_BASE_SLOT_COUNT'), 'falsche Slotzahl wird erkannt');

  const shortQuick = inv.cloneInventory(valid);
  shortQuick.quickSlots = [null, null];
  check(codesFor(shortQuick).includes('INVALID_QUICK_SLOT_COUNT'), 'falsche Schnellzugriffszahl wird erkannt');

  const badQuantity = inv.cloneInventory(valid);
  badQuantity.instances[badQuantity.baseSlots[0]].quantity = 0;
  check(codesFor(badQuantity).includes('INVALID_QUANTITY'), 'Menge 0 wird erkannt');

  const overLimit = inv.cloneInventory(valid);
  overLimit.instances[overLimit.baseSlots[0]].quantity = 9;
  check(codesFor(overLimit).includes('INVALID_QUANTITY'), 'Menge über dem Stapellimit wird erkannt');

  const unknownDefinition = inv.cloneInventory(valid);
  unknownDefinition.instances[unknownDefinition.baseSlots[0]].definitionId = 'core:gibtsnicht';
  check(codesFor(unknownDefinition).includes('UNKNOWN_DEFINITION'), 'unbekannte Definition wird erkannt');
  // Explicit policy: an unresolvable definition contributes 0 to the load sum and
  // is only visible through validation — never silently accepted as a valid total.
  equal(
    inv.calculateTotalLoad(unknownDefinition, lookup),
    1,
    'unauflösbare Definition trägt 0 zur Last bei (nur das zweite Seil zählt)',
  );
  check(
    !inv.validateInventory(unknownDefinition, lookup).ok,
    'derselbe Zustand ist gleichzeitig als ungültig gemeldet',
  );

  const nested = inv.createEmptyInventory();
  const outerId = place(nested, 'core:backpack', 0);
  const innerId = place(nested, 'core:pouch', 1);
  nested.baseSlots[1] = null;
  nested.containers[outerId][0] = innerId;
  check(codesFor(nested).includes('CONTAINER_NESTING'), 'Behälter-in-Behälter wird erkannt');

  const badCapacity = inv.createEmptyInventory();
  const capId = place(badCapacity, 'core:backpack', 0);
  badCapacity.containers[capId] = [null, null];
  check(codesFor(badCapacity).includes('INVALID_CONTAINER_CAPACITY'), 'falsche Behälterkapazität wird erkannt');

  const halfTwoHanded = inv.createEmptyInventory();
  const gsId = place(halfTwoHanded, 'core:greatsword', 0);
  halfTwoHanded.baseSlots[0] = null;
  halfTwoHanded.equipment = { mainHand: gsId };
  check(
    codesFor(halfTwoHanded).includes('INVALID_TWO_HANDED_REFERENCE'),
    'Zweihand-Gegenstand mit nur einer Hand-Referenz wird erkannt',
  );

  const wrongSlot = inv.createEmptyInventory();
  const helmId = place(wrongSlot, 'core:helm', 0);
  wrongSlot.baseSlots[0] = null;
  wrongSlot.equipment = { body: helmId };
  check(codesFor(wrongSlot).includes('INCOMPATIBLE_EQUIPMENT'), 'unpassender Ausrüstungs-Slot wird erkannt');

  const straySlot = inv.cloneInventory(valid);
  straySlot.equipment = { pocket: straySlot.baseSlots[0] };
  check(codesFor(straySlot).includes('INVALID_EQUIPMENT_SLOT'), 'unbekannter Ausrüstungs-Slot wird erkannt');

  const badQuickTarget = inv.createEmptyInventory();
  const bpId = place(badQuickTarget, 'core:backpack', 0);
  const insideId = place(badQuickTarget, 'core:rope', 1);
  badQuickTarget.baseSlots[1] = null;
  badQuickTarget.containers[bpId][0] = insideId;
  badQuickTarget.quickSlots[0] = insideId;
  check(
    codesFor(badQuickTarget).includes('QUICK_SLOT_NOT_ELIGIBLE'),
    'Schnellzugriff auf Behälter-Gegenstand wird erkannt',
  );

  const badVersion = inv.cloneInventory(valid);
  badVersion.schemaVersion = 99;
  check(codesFor(badVersion).includes('INVALID_SCHEMA_VERSION'), 'falsche Schema-Version wird erkannt');

  // --- Normalization repairs every case above into a valid state -----------
  const corrupt = {
    schemaVersion: 0,
    instances: {
      'a': { instanceId: 'a', definitionId: 'core:rope', quantity: 1 },
      'b': { instanceId: 'b', definitionId: 'core:pouch', quantity: 1 },
      'c': { instanceId: 'c', definitionId: 'core:backpack', quantity: 1 },
      'd': { instanceId: 'd', definitionId: 'core:helm', quantity: 1 },
      'e': { instanceId: 'e', definitionId: 'core:torch', quantity: 12 },
      'f': { instanceId: 'f', definitionId: 'core:greatsword', quantity: 1 },
      'g': { instanceId: 'g', definitionId: 'core:rope', quantity: -3 },
    },
    baseSlots: ['a', 'a', 'geist', null],
    containers: { c: ['b', 'a', 'geist'], nichtbehaelter: ['d'] },
    equipment: { body: 'd', mainHand: 'f', pocket: 'a' },
    quickSlots: ['b', 'geist'],
    legacyOverflow: ['geist', 'a'],
  };
  const normalized = inv.normalizeInventory(corrupt, lookup);
  const report = inv.validateInventory(normalized.state, lookup);
  equal(report.findings, [], 'normalisierter Zustand erfüllt alle Invarianten');
  equal(normalized.state.baseSlots.length, 20, 'Normalisierung erzwingt 20 Basisplätze');
  equal(normalized.state.quickSlots.length, 4, 'Normalisierung erzwingt 4 Schnellzugriffe');
  equal(normalized.state.schemaVersion, inv.INVENTORY_V2_SCHEMA_VERSION, 'Schema-Version wird gesetzt');
  check(normalized.repairs.length > 0, 'Reparaturen werden protokolliert');
  check(
    normalized.repairs.some((entry) => entry.code === 'INVALID_EQUIPMENT_SLOT'),
    'unbekannter Ausrüstungs-Slot wird als Reparatur protokolliert',
  );
  check(
    normalized.repairs.some((entry) => entry.code === 'CONTAINER_NESTING'),
    'Behälter-in-Behälter wird als Reparatur protokolliert',
  );
  check(
    normalized.state.equipment.mainHand === 'f' && normalized.state.equipment.offHand === 'f',
    'halb ausgerüsteter Zweihänder wird auf beide Hand-Referenzen vervollständigt',
  );

  // A two-handed grip claims both hands; a different one-hand occupant is displaced.
  const contestedHands = inv.normalizeInventory(
    {
      schemaVersion: inv.INVENTORY_V2_SCHEMA_VERSION,
      instances: {
        gs: { instanceId: 'gs', definitionId: 'core:greatsword', quantity: 1 },
        sh: { instanceId: 'sh', definitionId: 'core:shield', quantity: 1 },
      },
      baseSlots: Array.from({ length: 20 }, () => null),
      containers: {},
      equipment: { mainHand: 'gs', offHand: 'sh' },
      quickSlots: [null, null, null, null],
      legacyOverflow: [],
    },
    lookup,
  );
  equal(inv.validateInventory(contestedHands.state, lookup).findings, [], 'Hand-Konflikt ergibt gültigen Zustand');
  equal(contestedHands.state.equipment.offHand, 'gs', 'Zweihänder belegt beide Hände');
  check(contestedHands.state.baseSlots.includes('sh'), 'das verdrängte Schild bleibt erhalten');
  check(
    contestedHands.repairs.some((entry) => entry.code === 'INVALID_TWO_HANDED_REFERENCE'),
    'Verdrängung durch die Zweihand-Regel wird protokolliert',
  );
  // 12 torches at stack limit 5 must survive as 5 + 5 + 2 without loss.
  const torchUnits = Object.values(normalized.state.instances)
    .filter((instance) => instance.definitionId === 'core:torch')
    .reduce((sum, instance) => sum + instance.quantity, 0);
  equal(torchUnits, 12, 'Mengen über dem Stapellimit werden verlustfrei aufgeteilt');
  check(
    Object.values(normalized.state.instances).every((instance) => instance.quantity >= 1),
    'ungültige Mengen werden auf mindestens 1 korrigiert',
  );
  equal(
    inv.listPlacements(normalized.state).length,
    Object.keys(normalized.state.instances).length,
    'nach der Normalisierung hat jede Instanz genau einen Ort',
  );

  // Legacy grids longer than 20 keep the first 20 positions and stay lossless.
  const legacyInstances = {};
  const legacySlots = [];
  for (let index = 0; index < 25; index += 1) {
    const id = `legacy-${index}`;
    legacyInstances[id] = { instanceId: id, definitionId: 'core:rope', quantity: 1 };
    legacySlots.push(id);
  }
  const legacy = inv.normalizeInventory(
    {
      schemaVersion: inv.INVENTORY_V2_SCHEMA_VERSION,
      instances: legacyInstances,
      baseSlots: legacySlots,
      containers: {},
      equipment: {},
      quickSlots: [null, null, null, null],
      legacyOverflow: [],
    },
    lookup,
  );
  equal(inv.validateInventory(legacy.state, lookup).findings, [], 'Legacy-Normalisierung ist gültig');
  equal(Object.keys(legacy.state.instances).length, 25, 'keine Instanz wird gelöscht');
  equal(legacy.state.baseSlots.filter((slot) => slot !== null).length, 20, 'die ersten 20 Stapel bleiben im Grid');
  equal(legacy.state.legacyOverflow.length, 5, 'der Rest bleibt im sichtbaren Legacy-Overflow');
  equal(legacy.state.baseSlots[0], 'legacy-0', 'persistierte Positionen bleiben erhalten');
  equal(inv.calculateTotalLoad(legacy.state, lookup), 25, 'Overflow zählt weiter zur Last');
  expectError(
    inv.addItems(legacy.state, lookup, 'core:rope', 1),
    'OVERFLOW_NOT_EMPTY',
    'Legacy-Overflow blockiert neue Stapel',
  );

  equal(
    inv.normalizeInventory(undefined, lookup).state.baseSlots.length,
    20,
    'fehlender Zustand ergibt ein leeres, gültiges Inventar',
  );

  // Zwei Datensätze mit derselben eingebetteten instanceId dürfen sich nicht
  // gegenseitig überschreiben — Normalisieren ist verlustfrei.
  const collided = inv.normalizeInventory(
    {
      schemaVersion: 2,
      instances: {
        a: { instanceId: 'b', definitionId: 'core:rope', quantity: 1 },
        b: { instanceId: 'b', definitionId: 'core:torch', quantity: 3 },
      },
      baseSlots: Array.from({ length: 20 }, (_, index) => (index === 0 ? 'a' : index === 1 ? 'b' : null)),
      containers: {},
      equipment: {},
      quickSlots: [null, null, null, null],
      legacyOverflow: [],
    },
    lookup,
  );
  equal(Object.keys(collided.state.instances).sort(), ['a', 'b'], 'beide Datensätze überleben die Kollision');
  equal(collided.state.instances.a.definitionId, 'core:rope', 'Datensatz a behält seine Definition');
  equal(collided.state.instances.b.quantity, 3, 'Datensatz b behält seine Menge');
  equal(collided.state.baseSlots.slice(0, 2), ['a', 'b'], 'die Slot-Referenzen bleiben gültig');
  equal(inv.validateInventory(collided.state, lookup).findings, [], 'Ergebnis ist invariantenkonform');

  // Eine unauflösbare Definition kann die Domäne nicht reparieren: behalten,
  // aber getrennt melden, damit erneutes Laden keine Reparatur vortäuscht.
  const orphanState = inv.createEmptyInventory();
  place(orphanState, 'core:rope', 0, { instanceId: 'orphan' });
  orphanState.instances.orphan.definitionId = 'core:geloescht';
  const orphan = inv.normalizeInventory(orphanState, lookup);
  equal(orphan.unresolved, ['orphan'], 'unauflösbare Definition wird gemeldet');
  equal(orphan.repairs, [], 'sie zählt nicht als angewandte Reparatur');
  check(orphan.state.instances.orphan !== undefined, 'die Instanz bleibt erhalten');
  equal(
    inv.normalizeInventory(orphan.state, lookup).repairs,
    [],
    'erneutes Laden meldet weiterhin keine Reparatur',
  );
  check(
    inv.validateInventory(orphan.state, lookup).findings.some((entry) => entry.code === 'UNKNOWN_DEFINITION'),
    'die Prüfung meldet den fehlenden Katalogeintrag weiterhin',
  );

  // Ein Behälter ohne Kapazitätsliste ist für moveIntoContainer unbrauchbar und
  // muss deshalb auch als ungültig gemeldet werden.
  const mapless = inv.createEmptyInventory();
  place(mapless, 'core:backpack', 0, { instanceId: 'no-map' });
  delete mapless.containers['no-map'];
  check(
    inv.validateInventory(mapless, lookup).findings.some(
      (entry) => entry.code === 'INVALID_CONTAINER_CAPACITY',
    ),
    'Behälter ohne Kapazitätsliste wird gemeldet',
  );
  const remapped = inv.normalizeInventory(mapless, lookup);
  equal(remapped.state.containers['no-map'], [null, null, null, null], 'Normalisieren legt die Liste an');
  equal(inv.validateInventory(remapped.state, lookup).findings, [], 'danach ist der Zustand gültig');

  // Ein Zweihänder, dessen Definition einen Nicht-Hand-Slot deklariert, wird von
  // equipItem und normalizeInventory abgelehnt — die Prüfung darf ihn nicht durchwinken.
  define({
    id: 'core:kopf-zweihaender',
    name: 'Kopf-Zweihänder',
    type: 'weapon',
    load: 2,
    cost: 3,
    equipSlots: ['head'],
    twoHanded: true,
  });
  const headTwoHanded = inv.createEmptyInventory();
  const headId = place(headTwoHanded, 'core:kopf-zweihaender', 0, { instanceId: 'kopf' });
  headTwoHanded.baseSlots[0] = null;
  headTwoHanded.equipment.head = headId;
  check(
    inv.validateInventory(headTwoHanded, lookup).findings.some(
      (entry) => entry.code === 'INVALID_TWO_HANDED_REFERENCE',
    ),
    'Zweihänder außerhalb der Hände wird gemeldet',
  );
  const headRepaired = inv.normalizeInventory(headTwoHanded, lookup);
  equal(headRepaired.state.equipment.head, undefined, 'Normalisieren legt ihn ab');
  equal(inv.validateInventory(headRepaired.state, lookup).findings, [], 'danach ist der Zustand gültig');

  // Normalisieren ist idempotent: ein bereits reparierter Zustand darf beim
  // nächsten Laden weder Reparaturen melden noch sich noch einmal verändern.
  for (const [label, repaired] of [
    ['korrupter Zustand', normalized.state],
    ['umkämpfte Hände', contestedHands.state],
    ['Legacy-Overflow', legacy.state],
  ]) {
    const again = inv.normalizeInventory(repaired, lookup);
    equal(again.repairs, [], `${label}: erneutes Normalisieren meldet keine Reparaturen`);
    equal(again.state, repaired, `${label}: erneutes Normalisieren ändert nichts`);
    equal(inv.validateInventory(repaired, lookup).findings, [], `${label}: erfüllt alle Invarianten`);
  }
}

if (failures > 0) {
  console.error(`\nInventory v2 domain check failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log('Inventory v2 domain check passed (12 Testgruppen, #106).');
