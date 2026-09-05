#!/usr/bin/env node
/**
 * Inventory v2 mobile UX contract (#113).
 * Static checks: segmented Inventar/Ausrüstung (<640px), move-target Sheet,
 * bottom action/container Sheets, overflow-x guards.
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
  'src/app/character/inventory/InventoryMobileViewSwitch.tsx',
  'src/app/character/inventory/InventoryMoveTargetSheet.tsx',
  'src/app/character/inventory/CharacterInventoryV2Panel.tsx',
  'src/app/character/inventory/InventoryItemActions.tsx',
  'src/app/character/inventory/InventoryContainerPanel.tsx',
  'src/app/character/inventory/InventoryBaseGrid.tsx',
];

section('1 · Dateien vorhanden');
for (const rel of requiredFiles) {
  check(existsSync(`${root}/${rel}`), rel);
}

const panel = read('src/app/character/inventory/CharacterInventoryV2Panel.tsx');
const switchFile = read('src/app/character/inventory/InventoryMobileViewSwitch.tsx');
const moveSheet = read('src/app/character/inventory/InventoryMoveTargetSheet.tsx');
const actions = read('src/app/character/inventory/InventoryItemActions.tsx');
const container = read('src/app/character/inventory/InventoryContainerPanel.tsx');
const grid = read('src/app/character/inventory/InventoryBaseGrid.tsx');
const catalog = read('src/app/character/inventory/InventoryCatalogDialog.tsx');

section('2 · Mobile Segment + Pane wiring');
requireMatch(panel, /InventoryMobileViewSwitch/, 'panel imports mobile switch');
requireMatch(panel, /InventoryMoveTargetSheet/, 'panel imports move target sheet');
requireMatch(panel, /NARROW_MAX_PX\s*=\s*639|max-width:\s*\$\{NARROW_MAX_PX\}/, '639px narrow contract');
requireMatch(panel, /useIsNarrowViewport|matchMedia/, 'narrow viewport detection');
requireMatch(panel, /mobileView === 'inventar'/, 'inventar pane gate');
requireMatch(panel, /mobileView === 'ausruestung'/, 'ausruestung pane gate');
requireMatch(panel, /data-inventory-mobile-panel="inventar"/, 'inventar pane marker');
requireMatch(panel, /data-inventory-mobile-panel="ausruestung"/, 'ausruestung pane marker');
requireMatch(panel, /data-inventory-mobile-layout/, 'mobile layout marker');
requireMatch(panel, /data-inventory-desktop-layout/, 'desktop layout marker');
requireMatch(panel, /isNarrow\s*\?/, 'isNarrow layout branch');
requireMatch(panel, /overflow-x-hidden/, 'panel overflow-x guard');
requireMatch(switchFile, /aria-selected/, 'segment aria-selected');
requireMatch(switchFile, /data-inventory-mobile-view-switch/, 'switch marker');
requireMatch(switchFile, /min-h-11/, 'segment touch target');

section('3 · Move target Sheet (kein DnD-Zwang)');
requireMatch(moveSheet, /side="bottom"/, 'move sheet bottom');
requireMatch(moveSheet, /data-inventory-move-target-sheet/, 'move sheet marker');
requireMatch(moveSheet, /Zusammenführen/, 'merge preview label');
requireMatch(moveSheet, /Tauschen/, 'swap preview label');
requireMatch(moveSheet, /isSameStackFamily/, 'merge uses domain family check');
requireMatch(panel, /setMoveSheetSlot/, 'panel opens move sheet on mobile');

section('4 · Touch action / container Sheets');
requireMatch(actions, /data-inventory-item-actions-sheet/, 'mobile actions sheet');
requireMatch(actions, /side="bottom"/, 'actions sheet bottom');
requireMatch(actions, /min-h-11 min-w-11|size-11 min-h-11/, '44px action trigger');
requireMatch(actions, /useIsMobile/, 'actions useIsMobile');
requireMatch(container, /side=\{isMobile \? 'bottom' : 'right'\}/, 'container side responsive');
requireMatch(container, /useIsMobile/, 'container useIsMobile');
requireMatch(grid, /grid-cols-2/, '2-column mobile grid');
requireMatch(catalog, /overflow-x-hidden/, 'catalog overflow-x');
requireMatch(catalog, /data-inventory-catalog-dialog/, 'catalog marker');

section('5 · Domain still only via existing ops');
requireMatch(panel, /moveBaseSlot/, 'panel still uses moveBaseSlot');
requireMatch(panel, /mergeStacks/, 'panel still uses mergeStacks');

if (failures > 0) {
  console.error(`\nInventory mobile UI check failed: ${failures} issue(s).`);
  process.exit(1);
}

console.log('Inventory mobile UI check passed.');
