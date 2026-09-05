#!/usr/bin/env node
/**
 * Inventory v2 mobile UX contract (#113).
 * Static checks for Inventar|Ausrüstung segment, 2-col grid, slot aria-labels,
 * ~44px touch targets, and move-target Sheet wiring.
 * Location: scripts/inventory-mobile-ui-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
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

const requiredFiles = [
  'src/app/character/inventory/CharacterInventoryV2Panel.tsx',
  'src/app/character/inventory/InventoryMobileViewSwitch.tsx',
  'src/app/character/inventory/InventoryMoveTargetSheet.tsx',
  'src/app/character/inventory/InventoryBaseGrid.tsx',
  'src/app/character/inventory/InventoryEquipmentPanel.tsx',
  'src/app/character/inventory/InventoryQuickSlotsBar.tsx',
  'src/app/character/inventory/InventoryItemActions.tsx',
  'src/app/character/inventory/InventoryContainerPanel.tsx',
];

section('1 · Dateien vorhanden');
for (const rel of requiredFiles) {
  check(existsSync(`${root}/${rel}`), rel);
}

const panel = read('src/app/character/inventory/CharacterInventoryV2Panel.tsx');
const switchSrc = read('src/app/character/inventory/InventoryMobileViewSwitch.tsx');
const moveSheet = read('src/app/character/inventory/InventoryMoveTargetSheet.tsx');
const grid = read('src/app/character/inventory/InventoryBaseGrid.tsx');
const equipment = read('src/app/character/inventory/InventoryEquipmentPanel.tsx');
const quick = read('src/app/character/inventory/InventoryQuickSlotsBar.tsx');
const actions = read('src/app/character/inventory/InventoryItemActions.tsx');
const container = read('src/app/character/inventory/InventoryContainerPanel.tsx');
const catalog = read('src/app/character/inventory/InventoryCatalogDialog.tsx');
const allUi = [panel, switchSrc, moveSheet, grid, equipment, quick, actions, container, catalog].join(
  '\n',
);

section('2 · Mobile segment Inventar | Ausrüstung');
requireMatch(panel, /InventoryMobileViewSwitch/, 'Panel wires InventoryMobileViewSwitch');
requireMatch(panel, /InventoryMoveTargetSheet/, 'Panel wires InventoryMoveTargetSheet');
requireMatch(panel, /max-width:\s*\$\{NARROW_MAX_PX\}px\)|max-width:\s*639px/, 'Narrow matchMedia ≤639px');
requireMatch(panel, /data-inventory-mobile-layout/, 'Mobile layout hook');
requireMatch(panel, /lg:flex-row/, 'Desktop lg:flex-row preserved');
requireMatch(switchSrc, /Inventar/, 'Segment label Inventar');
requireMatch(switchSrc, /Ausrüstung/, 'Segment label Ausrüstung');
requireMatch(switchSrc, /aria-selected/, 'Segment aria-selected');
requireMatch(switchSrc, /role="tablist"|role='tablist'/, 'Segment tablist');

section('3 · Grid 2-col + Inventarplatz aria');
requireMatch(grid, /grid-cols-2/, 'Mobile grid-cols-2');
requireMatch(grid, /Inventarplatz \$\{slotIndex \+ 1\}: leer|Inventarplatz \$\{.*\}: leer/, 'aria leer pattern');
requireMatch(grid, /Inventarplatz \$\{slotIndex \+ 1\}: \$\{displayName\} ×\$\{qty\}/, 'aria occupied ×qty');
requireMatch(grid, /min-h-\[88px\]|min-h-11|min-h-\[44px\]/, 'Slot min touch height');

section('4 · Equipment / Quick / Actions touch + a11y');
requireMatch(equipment, /min-h-11/, 'Equipment min-h-11');
requireMatch(equipment, /: leer`|: leer'/, 'Equipment empty aria');
requireMatch(equipment, /Zweihändig \/ gekoppelt/, 'Two-handed copy');
requireMatch(quick, /min-h-11/, 'Quick slots min-h-11');
requireMatch(quick, /Schnellzugriff \$\{index \+ 1\}: leer/, 'Quick empty aria');
requireMatch(actions, /min-h-11/, 'Item actions min-h-11');
requireMatch(actions, /useIsMobile|actionsSheetOpen/, 'Mobile actions Sheet');
requireMatch(actions, /data-inventory-item-actions-sheet|SheetContent/, 'Actions Sheet content');
requireMatch(moveSheet, /Zielplatz wählen/, 'Move target Sheet title');
requireMatch(moveSheet, /min-h-14|min-h-11/, 'Move target touch height');

section('5 · Sheets / Dialogs mobile overflow');
requireMatch(container, /side=\{isMobile \? 'bottom' : 'right'\}|side="bottom"/, 'Container bottom Sheet on mobile');
requireMatch(catalog, /max-h-\[90dvh\]|max-h-\[95vh\]|max-h-\[90vh\]/, 'Catalog max height');
requireMatch(allUi, /overflow-x-hidden|w-\[calc\(100%/, 'Overflow / width clamp somewhere');
requireMatch(allUi, /min-h-11|min-h-\[44px\]/, 'Touch target class present');

check(failures === 0, `${failures} Fehler insgesamt`);

if (failures > 0) {
  console.error(`\ninventory-mobile-ui-check: ${failures} Fehler`);
  process.exit(1);
}

console.log('inventory-mobile-ui-check: OK');
