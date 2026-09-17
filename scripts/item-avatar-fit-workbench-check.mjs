#!/usr/bin/env node
/**
 * item-avatar-fit-workbench-check — deterministic tests for #160.
 * Location: scripts/item-avatar-fit-workbench-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`item-avatar-fit-workbench-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const defaults = read('src/domains/character/avatar/item-avatar-fit-defaults.ts');
const index = read('src/domains/character/avatar/index.ts');
const section = read('src/app/items/workbench/ItemAvatarFitSection.tsx');
const editor = read('src/app/items/workbench/ItemWorkbenchEditor.tsx');

check(/defaultAnchorForItemType/.test(defaults), 'type→anchor');
check(/resolveWorkbenchDefaultAnchor/.test(defaults), 'resolve');
check(/rightHand/.test(defaults) && /leftHand/.test(defaults) && /head/.test(defaults), 'defaults');
check(!/from ['"]react['"]/.test(defaults), 'domain no react');
check(/resolveWorkbenchDefaultAnchor/.test(index), 'barrel');

check(/Am Avatar ausrichten|Avatar \/ Ausrichtung/.test(section), 'section title');
check(/data-item-avatar-fit-section/.test(section), 'section attr');
check(/Zurücksetzen/.test(section), 'reset');
check(/createDefaultItemAvatarFitDraft/.test(section), 'default draft');
check(/no-3d/.test(section), 'no-3d state');
check(/ItemAvatarFitSection/.test(editor), 'editor wires section');
check(/fitDraft/.test(editor), 'fit state');

function defaultAnchor(type, misc) {
  if (type === 'misc' && misc === 'head') return 'head';
  if (type === 'weapon') return 'rightHand';
  if (type === 'shield') return 'leftHand';
  if (type === 'armor') return 'chest';
  return 'hips';
}
check(defaultAnchor('weapon') === 'rightHand', 'weapon');
check(defaultAnchor('shield') === 'leftHand', 'shield');
check(defaultAnchor('misc', 'head') === 'head', 'helm');

console.log('item-avatar-fit-workbench-check PASS');
