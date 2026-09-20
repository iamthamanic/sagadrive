#!/usr/bin/env node
/**
 * avatar-body-face-editor-check — deterministic checks for #215 morph UI.
 * Location: scripts/avatar-body-face-editor-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-body-face-editor-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const panels = read('src/app/character/avatar/AvatarMorphEditorPanels.tsx');
const editor = [
  read('src/app/character/edit/CharacterEditor.tsx'),
  read('src/app/character/edit/useCharacterAvatarEditor.ts'),
].join('\n');
const runtime = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');
const morph = read('src/domains/character/avatar/morph-contract.ts');

check(/AvatarMorphEditorPanels/.test(panels), 'panels component');
check(/AVATAR_MORPH_BODY_META/.test(panels), 'body meta from #212');
check(/AVATAR_MORPH_FACE_META/.test(panels), 'face meta from #212');
check(/data-testid="avatar-morph-unsupported"/.test(panels), 'unsupported state');
check(/Preset anwenden/.test(panels), 'species apply confirm');
check(/Eigene Werte behalten/.test(panels), 'keep own values');
check(/min-h-11/.test(panels), '44px touch targets');
check(/AvatarMorphEditorPanels/.test(editor), 'editor mounts morph panels');
check(/withAvatarMorphState/.test(editor), 'save attaches morph');
check(/morphCapabilities/.test(editor), 'capability gating');
check(/applyMorphState/.test(runtime), 'runtime morph without reload');
check(/applyMorphState/.test(canvas), 'canvas applies morph live');
check(/validateAvatarMorphInput/.test(morph), 'validation still domain');

console.log('avatar-body-face-editor-check PASS');
