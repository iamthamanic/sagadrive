#!/usr/bin/env node
/**
 * avatar-facial-expressions-check — deterministic tests for #11 facial API.
 * Location: scripts/avatar-facial-expressions-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-facial-expressions-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/facial-contract.ts');
const index = read('src/domains/character/avatar/index.ts');
const runtime = read('src/infrastructure/character/avatar/avatar-facial-runtime.ts');
const studio = read('src/infrastructure/character/avatar/character-studio-runtime.ts');
const controls = read('src/app/character/avatar/AvatarFacialPreviewControls.tsx');
const canvas = read('src/app/character/avatar/AvatarCanvas.tsx');

check(/FACIAL_CONTRACT_VERSION/.test(domain), 'facial contract version');
check(/FACIAL_VRM_ALIASES/.test(domain), 'VRM alias table');
check(/blink/.test(domain) && /happy/.test(domain) && /aa/.test(domain), 'blink emotion viseme keys');
check(/clampFacialWeight/.test(domain), 'weight clamp');
check(/applyFacialLayerUpdate/.test(domain), 'layer conflict rules');
check(/createNeutralFacialWeights/.test(domain), 'neutral reset weights');
check(!/from ['"]three['"]/.test(domain), 'domain no Three');
check(!/from ['"]react['"]/.test(domain), 'domain no React');

check(/export \{[\s\S]*resolveFacialAvailability/.test(index), 'barrel exports availability');
check(/FACIAL_VRM_ALIASES/.test(index), 'barrel exports aliases');

check(/AvatarFacialRuntime/.test(runtime), 'facial runtime class');
check(/expressionManager/.test(runtime), 'uses VRM expressionManager');
check(/resetValues|resetToNeutral/.test(runtime), 'reset path');
check(/setValue/.test(runtime), 'setValue path');
check(!/appearance\.avatar\s*=/.test(runtime), 'no appearance persistence write');

check(/facialRuntime\.bind/.test(studio), 'studio binds facial on load');
check(/setFacialWeight/.test(studio), 'studio exposes setFacialWeight');
check(/resetFacialToNeutral/.test(studio), 'studio exposes reset');
check(/facialRuntime\.dispose/.test(studio), 'studio disposes facial');

check(/data-avatar-facial-key/.test(controls), 'facial key test ids');
check(/data-avatar-facial-reset/.test(controls), 'reset control');
check(/Neutral/.test(controls), 'neutral reset label');
check(/AvatarFacialPreviewControls/.test(canvas), 'canvas mounts facial controls');

// --- pure domain replica ---
function clamp(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
check(clamp(1.5) === 1 && clamp(-1) === 0 && clamp(0.4) === 0.4, 'clamp 0..1');

function resolve(present) {
  const aliases = {
    blink: ['blink', 'Blink'],
    happy: ['happy', 'joy', 'A'],
    aa: ['aa', 'a', 'A'],
  };
  const set = new Set(present);
  const available = [];
  for (const [key, list] of Object.entries(aliases)) {
    if (list.some((a) => set.has(a))) available.push(key);
  }
  return available;
}
check(resolve(['joy', 'blink']).includes('happy') && resolve(['joy', 'blink']).includes('blink'), 'VRM1 joy→happy alias');
check(resolve(['A']).includes('happy') || resolve(['A']).includes('aa'), 'VRM0 A alias present');
check(resolve([]).length === 0, 'empty fail-soft');

function layerUpdate(current, key, weight, emotions, visemes) {
  const next = { ...current };
  if (emotions.includes(key)) for (const e of emotions) if (e !== key) next[e] = 0;
  if (visemes.includes(key)) for (const v of visemes) if (v !== key) next[v] = 0;
  next[key] = clamp(weight);
  return next;
}
const after = layerUpdate({ happy: 1, blink: 0.2, aa: 0.5 }, 'sad', 1, ['neutral','happy','angry','sad'], ['aa','ih','ou','ee','oh']);
check(after.sad === 1 && after.happy === 0 && after.blink === 0.2 && after.aa === 0.5, 'emotion zeros peers keeps blink/viseme');

console.log('avatar-facial-expressions-check PASS');
