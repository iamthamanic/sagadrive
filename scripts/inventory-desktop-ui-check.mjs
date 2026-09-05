#!/usr/bin/env node
/**
 * Inventory v2 desktop UI contract (#110) — static checks that the Character
 * inventory panel wires domain ops, catalog service, BASE_SLOT_COUNT=20, and
 * that CharacterEditor persists inventory_v2.
 * Location: scripts/inventory-desktop-ui-check.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;
let group = '';

function read(relPath) {
  return readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8');
}

function section(name) {
  group = name;
}

function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL [${group}]: ${message}`);
  }
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) {
    failures += 1;
    console.error(`FAIL [${group}]: fehlt ${label}`);
  }
}

function rejectMatch(content, pattern, label) {
  if (pattern.test(content)) {
    failures += 1;
    console.error(`FAIL [${group}]: ${label}`);
  }
}

const panel = read('src/app/character/inventory/CharacterInventoryV2Panel.tsx');
const grid = read('src/app/character/inventory/InventoryBaseGrid.tsx');
const actions = read('src/app/character/inventory/InventoryItemActions.tsx');
const catalogDialog = read('src/app/character/inventory/InventoryCatalogDialog.tsx');
const personalForm = read('src/app/character/inventory/PersonalItemFormDialog.tsx');
const overflow = read('src/app/character/inventory/InventoryOverflowSection.tsx');
const summary = read('src/app/character/inventory/InventorySummaryBar.tsx');
const labels = read('src/app/character/inventory/inventory-ui-labels.ts');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const progressionIndex = read('src/app/character/progression/index.ts');
const allUi = [panel, grid, actions, catalogDialog, personalForm, overflow, summary, labels].join(
  '\n',
);

section('1 · Dateien und 20-Slot-Grid');
requireMatch(grid, /BASE_SLOT_COUNT/, 'BASE_SLOT_COUNT Import/Usage in InventoryBaseGrid');
requireMatch(panel, /BASE_SLOT_COUNT/, 'BASE_SLOT_COUNT in CharacterInventoryV2Panel');
requireMatch(summary, /Inventar \{occupiedSlots\} \/ \{BASE_SLOT_COUNT\}|Inventar \{.*\} \/ \{BASE_SLOT_COUNT\}/, 'Summary Inventar X / 20');
requireMatch(summary, /BASE_SLOT_COUNT/, 'Summary uses BASE_SLOT_COUNT');
requireMatch(grid, /data-inventory-base-grid/, 'Grid test hook');
requireMatch(panel, /data-character-inventory-v2/, 'Panel test hook');

section('2 · Domain-Ops (kein Reimplementieren)');
for (const op of [
  'addItems',
  'moveBaseSlot',
  'mergeStacks',
  'sortBaseGrid',
  'splitStack',
  'consumeItem',
  'removeItem',
  'equipItem',
  'recoverOverflowInstance',
  'calculateTotalLoad',
]) {
  requireMatch(allUi, new RegExp(`\\b${op}\\b`), `Domain-Op ${op}`);
}
requireMatch(panel, /from ['"].*domains\/character\/inventory-v2/, 'Panel imports inventory-v2 domain');
requireMatch(grid, /from ['"].*domains\/character\/inventory-v2/, 'Grid imports inventory-v2 domain');

section('3 · Katalog-Service, kein Direktzugriff');
requireMatch(panel, /loadCharacterItemCatalog/, 'Panel lädt Katalog über Service');
requireMatch(catalogDialog, /addItems/, 'Catalog dry-run/add über Domain');
requireMatch(personalForm, /createPersonalDefinition/, 'Personal create über Service');
requireMatch(personalForm, /updateDefinition/, 'Personal update über Service');
requireMatch(personalForm, /archiveDefinition/, 'Personal archive über Service');
rejectMatch(
  allUi,
  /supabase\.from\(\s*['"]inventory_item_definitions['"]\s*\)/,
  'UI darf inventory_item_definitions nicht direkt abfragen',
);
rejectMatch(allUi, /from\(['"]inventory_item_definitions['"]\)/, 'Kein direktes from(inventory_item_definitions)');

section('4 · CharacterEditor-Verdrahtung');
requireMatch(editor, /CharacterInventoryV2Panel/, 'Editor rendert CharacterInventoryV2Panel');
requireMatch(editor, /inventory_v2:\s*inventoryV2/, 'Save-Payload enthält inventory_v2');
requireMatch(editor, /inventoryV2/, 'Editor hält inventoryV2 State');
requireMatch(editor, /createEmptyInventory/, 'Neues Inventar über createEmptyInventory');
requireMatch(editor, /migrateCharacterInventoryToV2/, 'Migration beim Laden wenn Schema ≠ 2');
requireMatch(editor, /onLoadInfoChange/, 'Sidebar-Last über onLoadInfoChange');
requireMatch(editor, /getAuthenticatedUserId/, 'userId über Auth');
requireMatch(progressionIndex, /CharacterInventoryV2Panel/, 'progression barrel exportiert V2 Panel');
requireMatch(progressionIndex, /CharacterInventoryPanel/, 'Legacy Panel-Export bleibt');

section('5 · UX-Verträge');
requireMatch(overflow, /Nicht einsortierte Alt-Gegenstände/, 'Overflow-Überschrift');
requireMatch(overflow, /In freien Inventarplatz verschieben/, 'Overflow-Recover-Aktion');
requireMatch(actions, /Aus Inventar entfernen/, 'Remove-Aktion');
requireMatch(actions, /nicht in die Welt abgelegt|NOT dropping|kein Boden/i, 'Remove-Klarstellung Welt-Drop');
requireMatch(catalogDialog, /Eigenen Gegenstand erstellen/, 'Personal create CTA');
requireMatch(catalogDialog, /TabsTrigger value="core"/, 'Core-Tab');
requireMatch(catalogDialog, /hasWorld && <TabsTrigger value="world"/, 'Welt-Tab nur bei World');
requireMatch(labels, /inventoryCarryCapacity/, 'Traglast-Helper');

check(failures === 0, `${failures} Fehler insgesamt`);

if (failures > 0) {
  console.error(`\ninventory-desktop-ui-check: ${failures} Fehler`);
  process.exit(1);
}

console.log('inventory-desktop-ui-check: OK');
