#!/usr/bin/env node
/**
 * vendor-mediapipe-face-landmarker — copy pinned WASM + ensure Face Landmarker model
 * under public/mediapipe/** for first-party Face Tracking (#243).
 * Location: scripts/vendor-mediapipe-face-landmarker.mjs
 *
 * Runtime never loads CDN URLs. Build/CI runs this via prebuild/postinstall.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgWasm = join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const outWasm = join(root, 'public/mediapipe/wasm');
const outModelDir = join(root, 'public/mediapipe/models');
const outModel = join(outModelDir, 'face_landmarker.task');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

function fail(msg) {
  console.error(`vendor-mediapipe-face-landmarker FAIL: ${msg}`);
  process.exit(1);
}

if (!existsSync(pkgWasm)) {
  fail('missing node_modules/@mediapipe/tasks-vision/wasm — run npm install');
}

mkdirSync(dirname(outWasm), { recursive: true });
rmSync(outWasm, { recursive: true, force: true });
cpSync(pkgWasm, outWasm, { recursive: true });

mkdirSync(outModelDir, { recursive: true });
if (!existsSync(outModel) || statSync(outModel).size < 100_000) {
  // Build-time only: fetch model once into first-party public path (not a runtime CDN load).
  const curl = spawnSync('curl', ['-fsSL', '-o', outModel, MODEL_URL], { stdio: 'inherit' });
  if (curl.status !== 0) {
    // Fallback: try copying a sibling cache if present
    const cache = join(root, 'node_modules/.cache/face_landmarker.task');
    if (existsSync(cache)) {
      copyFileSync(cache, outModel);
    } else {
      fail('could not download face_landmarker.task (curl failed) and no cache present');
    }
  }
}

const wasmFiles = ['vision_wasm_internal.wasm', 'vision_wasm_internal.js'];
for (const name of wasmFiles) {
  if (!existsSync(join(outWasm, name))) fail(`missing wasm artifact ${name}`);
}
if (!existsSync(outModel) || statSync(outModel).size < 100_000) {
  fail('face_landmarker.task missing or too small');
}

console.log('vendor-mediapipe-face-landmarker OK → public/mediapipe/**');
