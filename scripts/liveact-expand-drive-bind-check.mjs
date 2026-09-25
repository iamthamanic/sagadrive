#!/usr/bin/env node
/**
 * liveact-expand-drive-bind-check — Setup modal gets LiveAct bindOutput.
 * Location: scripts/liveact-expand-drive-bind-check.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-expand-drive-bind-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const expand = read('src/app/character/avatar/AvatarPreviewExpandDialog.tsx');
const acceptance = read('.qa/acceptance/liveact-expand-drive-bind.md');
const gate = read('scripts/test-gate.mjs');

check(/expandStudioRuntimeRef/.test(surface), 'surface owns expand runtime ref');
check(/expandRuntimeReady/.test(surface), 'surface tracks expand ready');
check(/previewExpandOpen && expandRuntimeReady/.test(surface), 'bind prefers expand when open+ready');
check(/driveExpand[\s\S]{0,80}expandStudioRuntimeRef/.test(surface), 'bind selects expand runtime');
check(/onRuntimeReadyChange/.test(expand), 'expand reports ready to parent');
check(/studioRuntimeRef: MutableRefObject/.test(expand), 'expand uses parent-owned runtime ref');
check(/bindOutput/.test(acceptance), 'acceptance mentions bindOutput');
check(/checkLiveActExpandDriveBind/.test(gate), 'test-gate wires expand drive bind');

console.log('liveact-expand-drive-bind-check OK');
