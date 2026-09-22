#!/usr/bin/env node
/**
 * liveact-face-anchors-v1-check — SagaDriveFaceAnchorsV1 contract + runtime (#399).
 * Location: scripts/liveact-face-anchors-v1-check.mjs
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import {
  authorFaceAnchorsFromGlb,
  bootstrapMinimalFaceAnchorsManifest,
} from './lib/liveact-face-anchor-author-lib.mjs';
import {
  validateFaceAnchorsAgainstDocument,
  validateFaceAnchorsManifestFile,
} from './lib/liveact-face-anchor-validate.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const fixtureDir = join(root, '.qa/fixtures/liveact-face-anchors-v1');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-face-anchors-v1-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/face-anchor-contract.ts');
const barrel = read('src/domains/character/avatar/index.ts');
const runtime = read('src/infrastructure/character/avatar/face-anchor-runtime.ts');
const authorCli = read('scripts/liveact-face-anchor-author.mjs');
const authorLib = read('scripts/lib/liveact-face-anchor-author-lib.mjs');
const gate = read('scripts/test-gate.mjs');
const acceptance = read('.qa/acceptance/liveact-face-anchors-v1.md');

check(/SagaDriveFaceAnchorsV1|FACE_ANCHORS_CONTRACT_VERSION/.test(domain), 'contract version');
check(/SAGA_DRIVE_FACE_ANCHOR_IDS/.test(domain), 'anchor id list');
check(/mouthUpper/.test(domain) && /forehead/.test(domain), 'semantic ids');
check(/nodeIdentity/.test(domain) && /barycentric/.test(domain), 'triangle binding');
check(/parseFaceAnchorsManifestV1/.test(domain), 'fail-closed parser');
check(/validateFaceAnchorsManifestV1/.test(domain), 'manifest validator');
check(!/from ['"]three['"]/.test(domain), 'domain pure no three');
check(!/from ['"]react['"]/.test(domain), 'domain no React');
check(!/mediapipe|faceit|blender|meshy|qtmesh/i.test(domain), 'no provider names in domain');

check(/face-anchor-contract/.test(barrel), 'barrel export');

check(/evaluateFaceAnchorWorldPosition/.test(runtime), 'runtime evaluator');
check(/applyBoneTransform/.test(runtime), 'skinned deformation path');
check(/morphTargetInfluences/.test(runtime), 'morph deformation path');
check(!/headBone|HeadBone|\.getObjectByName\(['"]Head/.test(runtime), 'no head-bone fallback');

check(
  /--input/.test(authorLib) && /--output/.test(authorLib) && /authorFaceAnchorsFromGlb/.test(authorCli),
  'author CLI flags',
);
check(/liveact-face-anchors-v1-check/.test(gate), 'test-gate wiring');
check(/SagaDriveFaceAnchorsV1/.test(acceptance), 'acceptance references contract');

mkdirSync(fixtureDir, { recursive: true });

const io = new NodeIO();
async function makeFixtureGlb() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const pos = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const prim = doc.createPrimitive().setAttribute('POSITION', pos);
  const mesh = doc.createMesh('face').addPrimitive(prim);
  doc.createScene().addChild(doc.createNode('FaceMesh').setMesh(mesh));
  return Buffer.from(await io.writeBinary(doc));
}

const glbPath = join(fixtureDir, 'minimal-face.glb');
writeFileSync(glbPath, await makeFixtureGlb());

const manifestPath = join(fixtureDir, 'face-anchors.json');
await authorFaceAnchorsFromGlb({
  inputPath: glbPath,
  outputPath: manifestPath,
  nodeIdentity: 'FaceMesh',
  bootstrap: true,
});
check(existsSync(manifestPath), 'fixture face-anchors.json written');

const stale = await validateFaceAnchorsManifestFile({ manifestPath, glbPath });
check(stale.ok, 'fixture manifest validates against GLB');

const doc = await io.readBinary(new Uint8Array(readFileSync(glbPath)));
const manifest = bootstrapMinimalFaceAnchorsManifest(doc, { nodeIdentity: 'FaceMesh' });
manifest.anchors.mouthUpper = {
  nodeIdentity: 'MissingNode',
  primitiveIndex: 0,
  triangleIndex: 0,
  barycentric: { u: 1 / 3, v: 1 / 3, w: 1 / 3 },
};
const staleResult = validateFaceAnchorsAgainstDocument(doc, manifest.anchors);
check(!staleResult.ok && staleResult.errors.some((e) => e.startsWith('stale_node:')), 'stale node detected');

const domainOut = join(root, '.qa/runs/liveact-face-anchors-v1-domain-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/avatar/face-anchor-contract.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: domainOut,
  logLevel: 'silent',
});

const domainMod = await import(domainOut + `?t=${Date.now()}`);
check(domainMod.FACE_ANCHORS_CONTRACT_VERSION === 'SagaDriveFaceAnchorsV1', 'version runtime');
check(domainMod.SAGA_DRIVE_FACE_ANCHOR_IDS.length === 21, '21 anchor ids');
check(domainMod.isSagaDriveFaceAnchorId('noseTip'), 'noseTip id');
check(!domainMod.isSagaDriveFaceAnchorId('landmark_0'), 'reject unknown id');

const badParse = domainMod.parseFaceAnchorsManifestV1({ contractVersion: 'nope', anchors: {} });
check(!badParse.ok, 'parse rejects version');

const goodParse = domainMod.parseFaceAnchorsManifestV1(JSON.parse(readFileSync(manifestPath, 'utf8')));
check(goodParse.ok, 'parse accepts fixture');

const runtimeOut = join(root, '.qa/runs/liveact-face-anchors-v1-runtime-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/infrastructure/character/avatar/face-anchor-runtime.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  packages: 'external',
  outfile: runtimeOut,
  logLevel: 'silent',
});

const runtimeMod = await import(runtimeOut + `?t=${Date.now()}`);
const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 0, 0]);
const morphGeo = new THREE.BufferGeometry();
morphGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
morphGeo.morphAttributes.position = [
  new THREE.BufferAttribute(new Float32Array([0, 0.2, 0, 0, 0.2, 0, 0, 0.2, 0]), 3),
];

const mesh = new THREE.Mesh(morphGeo, new THREE.MeshBasicMaterial());
mesh.name = 'FaceMesh';
mesh.morphTargetInfluences = [1];
const rootObj = new THREE.Group();
rootObj.add(mesh);
rootObj.updateMatrixWorld(true);

const binding = {
  nodeIdentity: 'FaceMesh',
  primitiveIndex: 0,
  triangleIndex: 0,
  barycentric: { u: 1 / 3, v: 1 / 3, w: 1 / 3 },
};

const evalOk = runtimeMod.evaluateFaceAnchorWorldPosition(
  runtimeMod.buildFaceAnchorNodeIndex(rootObj),
  'mouthUpper',
  binding,
);
check(evalOk.status === 'available', 'runtime eval available');
check(
  evalOk.status === 'available' && typeof evalOk.y === 'number' && evalOk.y > 0.15,
  'morph shifts evaluated Y',
);

const evalBad = runtimeMod.evaluateFaceAnchorWorldPosition(
  runtimeMod.buildFaceAnchorNodeIndex(rootObj),
  'mouthUpper',
  { ...binding, triangleIndex: 99 },
);
check(evalBad.status === 'unavailable', 'invalid triangle unavailable');

const snapshot = runtimeMod.evaluateFaceAnchorsManifest(rootObj, goodParse.manifest);
check(snapshot.evaluations.mouthUpper?.status === 'available', 'manifest snapshot');

console.log('liveact-face-anchors-v1-check OK');
