#!/usr/bin/env node
/**
 * Inventory v2 World catalog authoring UI contract (#112) — static checks that
 * WorldProfileEditorDialog wires WorldItemCatalogSection, the section uses
 * catalog service + Core list, PersonalItemFormDialog supports world mode, and
 * InventoryCatalogDialog shows Core/Welt/Eigen scope badges.
 * Location: scripts/inventory-world-catalog-ui-check.mjs
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

const editor = read('src/modules/worlds/components/WorldProfileEditorDialog.tsx');
const sectionUi = read('src/modules/worlds/components/WorldItemCatalogSection.tsx');
const personalForm = read('src/app/character/inventory/PersonalItemFormDialog.tsx');
const catalogDialog = read('src/app/character/inventory/InventoryCatalogDialog.tsx');
const service = read('src/infrastructure/inventory/item-catalog-service.ts');

section('1 · WorldProfileEditorDialog verdrahtet Section');
requireMatch(editor, /WorldItemCatalogSection/, 'Import/Usage WorldItemCatalogSection');
requireMatch(editor, /worldProfileId=\{world\.id\}/, 'world.id an Section');
requireMatch(editor, /max-w-3xl/, 'Dialog max-w-3xl');
requireMatch(editor, /Speichere die Welt zuerst/, 'Hinweis wenn Welt noch nicht gespeichert');

section('2 · WorldItemCatalogSection Service & Domain');
requireMatch(sectionUi, /PersonalItemFormDialog/, 'PersonalItemFormDialog reuse');
requireMatch(sectionUi, /archiveDefinition/, 'archiveDefinition');
requireMatch(sectionUi, /restoreDefinition/, 'restoreDefinition');
requireMatch(sectionUi, /loadWorldProfileItemCatalog/, 'loadWorldProfileItemCatalog');
requireMatch(sectionUi, /listCoreItemDefinitions/, 'listCoreItemDefinitions');
requireMatch(sectionUi, /mode=["']world["']/, 'PersonalItemFormDialog mode=world');
requireMatch(sectionUi, /Ausrüstung & Gegenstände/, 'Section-Titel');
requireMatch(sectionUi, /Gegenstand erstellen/, 'Create CTA');
requireMatch(sectionUi, /Core-Gegenstand als Vorlage/, 'Core-Vorlage CTA');
requireMatch(sectionUi, /Archivierte anzeigen/, 'Archiv-Toggle');
requireMatch(sectionUi, /data-world-item-catalog/, 'data-world-item-catalog hook');
requireMatch(sectionUi, /data-testid=["']world-item-catalog["']/, 'data-testid hook');
// createWorldDefinition is invoked via PersonalItemFormDialog mode=world
requireMatch(personalForm, /createWorldDefinition/, 'createWorldDefinition (via form)');
rejectMatch(
  sectionUi,
  /supabase\.from\(\s*['"]inventory_item_definitions['"]\s*\)/,
  'Section darf inventory_item_definitions nicht direkt abfragen',
);

section('3 · PersonalItemFormDialog World-Mode');
requireMatch(personalForm, /mode\?:\s*['"]personal['"]\s*\|\s*['"]world['"]/, 'mode prop');
requireMatch(personalForm, /createWorldDefinition/, 'createWorldDefinition');
requireMatch(personalForm, /restoreDefinition/, 'restoreDefinition');
requireMatch(personalForm, /export function draftFromDefinition/, 'draftFromDefinition export');
requireMatch(
  personalForm,
  /Dieser Gegenstand wird für neue Inventarzugänge ausgeblendet/,
  'World archive confirmation copy',
);
requireMatch(personalForm, /Wieder aktivieren/, 'Wieder aktivieren');

section('4 · Katalog-Service Loader');
requireMatch(service, /loadWorldProfileItemCatalog/, 'loadWorldProfileItemCatalog export');
requireMatch(service, /scope === ['"]world['"]/, 'filter world scope');

section('5 · Character catalog scope badges');
requireMatch(catalogDialog, /['"]Core['"]/, 'Core badge string');
requireMatch(catalogDialog, /['"]Welt['"]/, 'Welt badge string');
requireMatch(catalogDialog, /['"]Eigen['"]/, 'Eigen badge string');

check(failures === 0, `${failures} Fehler insgesamt`);

if (failures > 0) {
  console.error(`\ninventory-world-catalog-ui-check: ${failures} Fehler`);
  process.exit(1);
}

console.log('inventory-world-catalog-ui-check: OK');
// silence unused root warning in some bundlers
void root;
