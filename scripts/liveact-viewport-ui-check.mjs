#!/usr/bin/env node
/**
 * liveact-viewport-ui-check — structural acceptance for LiveAct 2/7 (#330).
 * Location: scripts/liveact-viewport-ui-check.mjs
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
    console.error(`liveact-viewport-ui-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const settings = read('src/app/character/avatar/AvatarPreviewSettings.tsx');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');
const hook = read('src/app/character/liveact/useLiveActViewport.ts');
const pip = read('src/app/character/liveact/LiveActCameraPreview.tsx');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const editor = read('src/app/character/edit/CharacterEditor.tsx');

check(/LiveActViewportControls/.test(surface), 'surface hosts LiveAct chrome');
check(/useLiveActViewport/.test(surface), 'surface uses liveact hook');
check(/data-avatar-surface-fallback/.test(surface), 'fallback still present');
check(/LiveActViewportControls/.test(surface) && /runtimeReady=\{false\}/.test(surface), 'gear on fallback path');
check(/data-testid="avatar-preview-settings"/.test(settings), 'gear test id');
check(!/disabled=\{disabled\}/.test(settings) || /Avatar-Vorschau Einstellungen/.test(settings), 'gear button not gated by runtime');
check(/liveact-tracking-toggle/.test(settings), 'tracking toggle');
check(/liveact-camera-preview-toggle/.test(settings), 'pip toggle');
check(/liveact-face-overlay-toggle/.test(settings), 'face overlay toggle');
check(/LiveActFaceOverlay/.test(pip), 'pip composes face overlay');
check(/liveact-bones-toggle/.test(settings), 'bones stub');
check(/liveact-calibrate/.test(settings), 'calibrate control');
check(/Landmarks über PiP/.test(settings), 'face overlay DE copy');
check(/subscribeDiagnostics/.test(hook), 'hook diagnostics ref');
check(/3D-Modell erforderlich/.test(settings), 'disabled hint');
check(/scaleX\(-1\)/.test(pip), 'mirrored pip');
check(/aspect-\[4\/3\]/.test(pip), 'pip 4:3');
check(/liveact-camera-pip/.test(pip), 'pip test id');
check(/hideEditorFaceTrackingBar/.test(canvas), 'editor hides FT bar');
check(/hideMtoonToggle/.test(canvas), 'editor hides mtoon button');
check(/LiveActEngine/.test(hook), 'hook binds LiveActEngine');
check(/audio/.test(read('src/infrastructure/character/liveact/liveact-engine.ts')), 'engine audio false path exists');
check(!/useLiveActViewport|LiveActEngine|trackingEnabled/.test(editor), 'no LiveAct state in CharacterEditor');
check(/LiveActViewportControls/.test(controls), 'controls compose settings+pip');

console.log('liveact-viewport-ui-check OK');
