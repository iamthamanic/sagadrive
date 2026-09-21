#!/usr/bin/env node
/**
 * liveact-face-pipeline-doc-check — AUTHORING-PIPELINE v1.1 + FACE-AUTHORING consistency (#386).
 * Location: scripts/liveact-face-pipeline-doc-check.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('..', import.meta.url));

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-pipeline-doc-check FAIL: ${msg}`);
    process.exit(1);
  }
}

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

const pipeline = read('assets/species-3d/AUTHORING-PIPELINE.md');
const face = read('assets/species-3d/FACE-AUTHORING.md');
const third = read('assets/species-3d/FACE-AUTHORING-THIRD-PARTY.md');
const gate = read('scripts/test-gate.mjs');
const ledger = read('assets/species-3d/human/runs/quality-20260921-m5-face1/run.json');

check(/v1\.1/.test(pipeline), 'pipeline version v1.1');
check(/QtMeshEditor FaceRig|qtmesh-facerig/.test(pipeline), 'qtmesh primary in pipeline');
check(/liveact-face-authoring-qtmesh\.mjs/.test(pipeline) || /FACE-AUTHORING\.md/.test(pipeline), 'face doc link');
check(/deprecated[\s\S]*Faceit/i.test(pipeline), 'Faceit listed under deprecated');
check(/primary Face Authoring Adapter V1/i.test(pipeline) || /QtMeshEditor FaceRig is the \*\*primary/i.test(pipeline), 'qtmesh called primary');
// Active how-to must not instruct Faceit bake as a step (negation lists are OK).
check(!/1\.\s*\*\*Faceit|→\s*Faceit|Bake expressions to Shape Keys/i.test(pipeline), 'no Faceit bake how-to steps');

check(/8720dc91bd7426908b9218673fbd74d544dd908c/.test(face), 'pinned commit documented');
check(/liveact-face-asset-check\.mjs/.test(face), 'validator referenced');
check(/bootstrap-qtmesh-facerig\.sh/.test(face), 'bootstrap referenced');
check(/mesh\.extras\.targetNames/.test(face), 'targetNames requirement');
check(/core-v1/.test(face) && /tongueOut/.test(face), 'profile rules');

check(/MIT/.test(third) && /ICT-FaceKit/.test(third), 'third-party licenses');

const requiredScripts = [
  'scripts/liveact-face-authoring-qtmesh.mjs',
  'scripts/bootstrap-qtmesh-facerig.sh',
  'scripts/liveact-face-asset-check.mjs',
  'scripts/species-authoring-rebind-pbr-maps.mjs',
];
for (const rel of requiredScripts) {
  check(existsSync(join(root, rel)), `script exists: ${rel}`);
}

check(/faceAuthoringProvider/.test(ledger) && /qtmesh-facerig/.test(ledger), 'm5-face1 ledger provider');
check(/liveact-face-pipeline-doc-check/.test(gate), 'test-gate wiring');

// Domain must stay free of provider names
const domainLiveact = join(root, 'src/domains/character/liveact');
const { readdirSync } = await import('node:fs');
for (const f of readdirSync(domainLiveact)) {
  if (!f.endsWith('.ts')) continue;
  const txt = readFileSync(join(domainLiveact, f), 'utf8');
  check(!/QtMeshEditor|Faceit|ICTFaceKit/.test(txt), `domain ${f} provider-neutral`);
}

console.log('liveact-face-pipeline-doc-check OK');
