#!/usr/bin/env node
/**
 * liveact-face-anchors-character-persist-check — Face Mapping → avatar.face_anchors (#persist).
 * Location: scripts/liveact-face-anchors-character-persist-check.mjs
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
    console.error(`liveact-face-anchors-character-persist-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const entity = read('src/domains/character/domain/character.entity.ts');
const contract = read('src/domains/character/avatar/face-anchor-contract.ts');
const barrel = read('src/domains/character/avatar/index.ts');
const hook = read('src/app/character/edit/useCharacterAvatarEditor.ts');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const surface = read('src/app/character/avatar/AvatarSurfaceViewer.tsx');
const controls = read('src/app/character/liveact/LiveActViewportControls.tsx');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const acceptance = read('.qa/acceptance/liveact-face-anchors-character-persist.md');

check(/face_anchors\?:/.test(entity), 'DTO face_anchors field');
check(/SagaDriveFaceAnchorsManifestV1/.test(entity), 'DTO uses manifest type');
check(/readFaceAnchorsFromAvatar/.test(contract), 'read helper');
check(/readFaceAnchorsFromAvatar/.test(barrel), 'barrel export');
check(/commitFaceAnchors/.test(hook), 'hook commitFaceAnchors');
check(/readFaceAnchorsFromAvatar/.test(hook), 'hook hydrates face_anchors');
check(/face_anchors: faceAnchorsManifest/.test(hook), 'currentAvatar merges face_anchors');
check(/setFaceAnchorsManifest\(null\)/.test(hook), 'clears on model/source change');
check(/onFaceAnchorsCommitted=\{commitFaceAnchors\}/.test(editor), 'editor wires commit');
check(/onFaceAnchorsCommitted/.test(surface), 'surface accepts commit');
check(/handleFaceAnchorsCommitted/.test(surface), 'surface refreshes availability');
check(/onFaceAnchorsCommitted\?\.\(manifest\)/.test(controls), 'Speichern commits');
check(/characterOverride/.test(studio) || /face_anchors \?\? null/.test(studio), 'runtime override');
check(/avatar\.face_anchors/.test(studio), 'loadModel reads avatar.face_anchors');
check(/liveact-face-anchors-character-persist/.test(acceptance), 'acceptance exists');

// PR #440 review: hydrated anchors without model reload must rebind (P1).
const applyAppearanceBody = studio.match(/applyAppearance\(avatar: CharacterAvatarDto[\s\S]*?\n {2}\}/)?.[0] ?? '';
check(/this\.syncCharacterFaceAnchors\(avatar\)/.test(applyAppearanceBody), 'applyAppearance rebinds changed face_anchors');
check(
  /this\.syncCharacterFaceAnchors\(this\.currentAvatar \?\? avatar, true\)/.test(studio),
  'loadModel binds anchors from the latest avatar, not the load-start snapshot',
);
check(!/loadFaceAnchorsManifestForModel\(safeUrl, avatar\.face_anchors/.test(studio), 'no stale load-start anchors read');

// PR #440 review: empty / invalid drafts must not become an override (P2).
check(/validateFaceMappingDraft\(current\)/.test(controls), 'Speichern validates the draft');
check(/disabled=\{!draftValidation\?\.ok\}/.test(controls), 'Speichern disabled for invalid drafts');

// PR #440 review: every topology-changing path clears anchors (P2).
const bodyConversion = hook.match(/const applyBodyConversion = [\s\S]*?\n {2}\};/)?.[0] ?? '';
check(/setFaceAnchorsManifest\(null\)/.test(bodyConversion), 'applyBodyConversion clears anchors');
const appearancePreset = hook.match(/const applyAppearancePreset = [\s\S]*?\n {2}\};/)?.[0] ?? '';
check(/setFaceAnchorsManifest\(null\)/.test(appearancePreset), 'applyAppearancePreset clears anchors when the preset owns the mesh');

console.log('liveact-face-anchors-character-persist-check OK');
