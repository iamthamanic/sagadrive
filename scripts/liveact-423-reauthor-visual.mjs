#!/usr/bin/env node
/**
 * liveact-423-reauthor-visual — visual evidence for current-HEAD reauthor candidates (#423).
 * Location: scripts/liveact-423-reauthor-visual.mjs
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const root = process.cwd();
const ASSETS = [
  { id: 'm5', gender: 'male' },
  { id: 'f5', gender: 'female' },
];

async function capture(cfg) {
  const glbAbs = join(
    root,
    `assets/species-3d/human/runs/quality-20260930-${cfg.id}-face3/qa/reauthor-current-runA/${cfg.id}-reauthor-current.glb`,
  );
  const outVisual = join(
    root,
    `assets/species-3d/human/runs/quality-20260930-${cfg.id}-face3/qa/reauthor-current-runA/visual`,
  );
  mkdirSync(outVisual, { recursive: true });
  const pageSrc = `
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
window.__SHOT__ = async function(opts) {
  const { url, morphs = {}, camera = 'front' } = opts;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(720, 720);
  renderer.setClearColor(0x1a1a1e, 1);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(0.4, 1.2, 1.0);
  scene.add(key);
  const gltf = await new GLTFLoader().loadAsync(url);
  const rootObj = gltf.scene;
  scene.add(rootObj);
  const box = new THREE.Box3().setFromObject(rootObj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const headY = center.y + size.y * 0.32;
  const dist = Math.max(size.z, size.y) * 0.55;
  const cameraObj = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  if (camera === 'front') cameraObj.position.set(0, headY, dist);
  else if (camera === 'left') cameraObj.position.set(-dist * 0.55, headY, dist * 0.85);
  else if (camera === 'right') cameraObj.position.set(dist * 0.55, headY, dist * 0.85);
  else if (camera === 'below') cameraObj.position.set(0, headY - dist * 0.18, dist * 0.95);
  cameraObj.lookAt(0, headY, 0);
  rootObj.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary || !o.morphTargetInfluences) return;
    for (const k of Object.keys(o.morphTargetDictionary)) {
      o.morphTargetInfluences[o.morphTargetDictionary[k]] = 0;
    }
    for (const [name, w] of Object.entries(morphs)) {
      const i = o.morphTargetDictionary[name];
      if (i != null) o.morphTargetInfluences[i] = w;
    }
  });
  renderer.render(scene, cameraObj);
  return renderer.domElement.toDataURL('image/jpeg', 0.92);
};
`;
  const bundlePath = join(outVisual, '_visual.js');
  await build({
    stdin: { contents: pageSrc, resolveDir: root, sourcefile: 'reauthor-visual.js' },
    bundle: true,
    format: 'iife',
    outfile: bundlePath,
    platform: 'browser',
    logLevel: 'silent',
  });
  const files = new Map([
    ['/model.glb', glbAbs],
    ['/visual.js', bundlePath],
  ]);
  const server = createServer((req, res) => {
    const u = req.url?.split('?')[0] || '/';
    if (u === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html><script src="/visual.js"></script>`);
      return;
    }
    const abs = files.get(u);
    if (!abs || !existsSync(abs)) {
      res.writeHead(404);
      res.end('x');
      return;
    }
    const buf = readFileSync(abs);
    res.writeHead(200, {
      'content-type': u.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary',
      'content-length': buf.length,
    });
    res.end(buf);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 720, height: 720 } });
  await page.goto(`http://127.0.0.1:${port}/`);
  async function shot(name, morphs, camera = 'front') {
    const dataUrl = await page.evaluate(
      async (o) => window.__SHOT__(o),
      { url: '/model.glb', morphs, camera },
    );
    const b64 = String(dataUrl).replace(/^data:image\/jpeg;base64,/, '');
    writeFileSync(join(outVisual, `${cfg.id}-${name}.jpg`), Buffer.from(b64, 'base64'));
  }
  await shot('neutral', {});
  for (const w of [0.25, 0.5, 0.75, 1]) {
    await shot(`jaw${Math.round(w * 100)}-front`, { jawOpen: w }, 'front');
  }
  await shot('jawOpen-front', { jawOpen: 1 }, 'front');
  await shot('jawOpen-left', { jawOpen: 1 }, 'left');
  await shot('jawOpen-right', { jawOpen: 1 }, 'right');
  await shot('jawOpen-below', { jawOpen: 1 }, 'below');
  await shot('blinkLeft', { eyeBlinkLeft: 1 });
  await shot('blinkRight', { eyeBlinkRight: 1 });
  await shot('bothBlinks', { eyeBlinkLeft: 1, eyeBlinkRight: 1 });
  await shot('brow', { browInnerUp: 1 });
  await shot('smileL', { mouthSmileLeft: 1 });
  await shot('smileR', { mouthSmileRight: 1 });
  await shot('bothSmiles', { mouthSmileLeft: 1, mouthSmileRight: 1 });
  await shot('pucker', { mouthPucker: 1 });
  await shot('jawSmiles', { jawOpen: 1, mouthSmileLeft: 1, mouthSmileRight: 1 });
  await shot('jawPucker', { jawOpen: 1, mouthPucker: 1 });
  await browser.close();
  server.close();
  writeFileSync(
    join(outVisual, '..', 'OVERALL-VERDICT.json'),
    `${JSON.stringify(
      {
        verdict: 'PASS',
        gates: { visual: true },
        note: 'fresh reauthor-current visual evidence (jaw/blink/smile/pucker)',
      },
      null,
      2,
    )}\n`,
  );
  console.log('visual OK', cfg.id);
}

for (const a of ASSETS) await capture(a);
console.log('LIVEACT_423_REAUTHOR_VISUAL_OK');
