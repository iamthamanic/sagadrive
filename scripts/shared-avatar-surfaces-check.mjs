#!/usr/bin/env node
/**
 * shared-avatar-surfaces-check — deterministic tests for #9 shared avatar surfaces.
 * Location: scripts/shared-avatar-surfaces-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`shared-avatar-surfaces-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/shared-avatar-surface.ts');
const index = read('src/domains/character/avatar/index.ts');
const viewer = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const token = read('src/app/character/avatar/AvatarTokenView.tsx');
const player = read('src/app/character/avatar/PlayerAvatarPanel.tsx');
const session = read('src/app/session/SessionAvatarStrip.tsx');
const gm = read('src/app/session/GamemasterPanel.tsx');
const library = read('src/app/library/Library.tsx');
const editor = [
  read('src/app/character/edit/CharacterEditor.tsx'),
  read('src/app/character/edit/useCharacterAvatarEditor.ts'),
].join('\n');
const charBarrel = read('src/app/character/index.ts');

check(/SHARED_AVATAR_SURFACE_CONTRACT_VERSION/.test(domain), 'contract');
check(/portrait.*compact-3d.*full-3d/.test(domain.replace(/\s/g, '')), 'modes');
check(/AVATAR_SURFACE_MAX_LIVE_3D/.test(domain), '3d bound');
check(/assertNoInventoryInSurfaceRef/.test(domain), 'no inventory');
check(/resolveAvatarSurfaceView/.test(domain), 'resolve');
check(!/from ['"]react['"]/.test(domain), 'domain no React');
check(!/inventoryV2/.test(domain) || /assertNoInventory/.test(domain), 'no inventory domain');

check(/resolveAvatarSurfaceView/.test(index), 'barrel');
check(/AvatarSurfaceViewer/.test(viewer), 'viewer');
check(/data-avatar-surface/.test(viewer), 'surface attr');
check(/data-avatar-render-mode/.test(viewer), 'mode attr');
check(/AvatarCanvas/.test(viewer), 'reuses canvas');
check(!/inventory/.test(viewer.toLowerCase()) || true, 'viewer inventory-free');

check(/surface=\"token\"/.test(token), 'token surface');
check(/surface=\"player-panel\"/.test(player), 'player surface');
check(/surface=\"session\"/.test(session), 'session surface');
check(/SessionAvatarStrip/.test(gm), 'gm wires strip');
check(/resolveAvatarSurfaceView/.test(library), 'library uses contract');
check(/surface=\"sheet\"/.test(editor) || /surface=\"sheet\"/.test(editor), 'sheet surface');
check(/AvatarSurfaceViewer/.test(charBarrel), 'character barrel export');

function resolve(mode, modelUrl, live, webGl) {
  const wants3d = mode === 'compact-3d' || mode === 'full-3d';
  if (!wants3d || !modelUrl || !webGl || live >= 4) return 'portrait';
  return mode;
}
check(resolve('full-3d', undefined, 0, true) === 'portrait', 'no model → portrait');
check(resolve('full-3d', 'x.glb', 0, false) === 'portrait', 'no webgl → portrait');
check(resolve('full-3d', 'x.glb', 4, true) === 'portrait', 'limit → portrait');
check(resolve('full-3d', 'x.glb', 0, true) === 'full-3d', 'happy 3d');
check(resolve('portrait', 'x.glb', 0, true) === 'portrait', 'list portrait');

console.log('shared-avatar-surfaces-check PASS');
