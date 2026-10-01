#!/usr/bin/env node
/**
 * liveact-423-visual-sanity — headless VRM morph pose screenshots for #423 final gate.
 * Location: scripts/liveact-423-visual-sanity.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RUN = join(ROOT, '.qa/runs/liveact-423-visual-sanity');
mkdirSync(RUN, { recursive: true });

const pageSrc = `
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

window.__SAGADRIVE_VISUAL__ = async function (url, poses) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setSize(512, 512);
  renderer.setClearColor(0x2a2a2a, 1);
  document.body.innerHTML = '';
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dir = new THREE.DirectionalLight(0xffffff, 0.95);
  dir.position.set(0.35, 1.15, 1.05);
  scene.add(dir);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 20);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm;
  const rootObj = vrm ? vrm.scene : gltf.scene;
  scene.add(rootObj);
  const box = new THREE.Box3().setFromObject(rootObj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const headY = center.y + size.y * 0.32;
  camera.position.set(0, headY, Math.max(size.z, size.y) * 0.55);
  camera.lookAt(0, headY, 0);

  function setMorph(weights) {
    rootObj.traverse((o) => {
      if (!o.isMesh || !o.morphTargetDictionary || !o.morphTargetInfluences) return;
      for (const k of Object.keys(o.morphTargetDictionary)) {
        o.morphTargetInfluences[o.morphTargetDictionary[k]] = 0;
      }
      for (const [name, w] of Object.entries(weights || {})) {
        const idx = o.morphTargetDictionary[name];
        if (idx != null) o.morphTargetInfluences[idx] = w;
      }
    });
    if (vrm?.expressionManager) {
      const em = vrm.expressionManager;
      for (const exp of em.expressions ?? []) em.setValue(exp.expressionName, 0);
      for (const [name, w] of Object.entries(weights || {})) {
        try { em.setValue(name, w); } catch {}
        if (name === 'eyeBlinkLeft') try { em.setValue('blinkLeft', w); } catch {}
        if (name === 'eyeBlinkRight') try { em.setValue('blinkRight', w); } catch {}
      }
      em.update();
    }
  }

  const out = {};
  for (const pose of poses) {
    setMorph(pose.weights);
    renderer.render(scene, camera);
    out[pose.id] = renderer.domElement.toDataURL('image/jpeg', 0.88);
  }
  return out;
};
`;

await build({
  stdin: { contents: pageSrc, resolveDir: ROOT, loader: 'js' },
  bundle: true,
  format: 'esm',
  outfile: join(RUN, 'visual.js'),
  platform: 'browser',
  target: 'es2022',
});
writeFileSync(
  join(RUN, 'index.html'),
  `<!doctype html><html><body style="margin:0;background:#222"><script type="module" src="/__harness/visual.js"></script></body></html>\n`,
);

const PUBLIC = join(ROOT, 'public');
const server = createServer((req, res) => {
  const url = String(req.url || '/').split('?')[0];
  if (url.startsWith('/__harness/')) {
    const p = join(RUN, url.slice('/__harness/'.length));
    if (!existsSync(p)) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': url.endsWith('.js') ? 'text/javascript' : 'text/html' });
    res.end(readFileSync(p));
    return;
  }
  const p = join(PUBLIC, decodeURIComponent(url));
  if (!existsSync(p) || !p.startsWith(PUBLIC)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const poses = [
  { id: 'neutral', weights: {} },
  { id: 'jawOpen', weights: { jawOpen: 1 } },
  { id: 'blinkLeft', weights: { eyeBlinkLeft: 1 } },
  { id: 'blinkRight', weights: { eyeBlinkRight: 1 } },
  { id: 'browInnerUp', weights: { browInnerUp: 1 } },
  { id: 'smileLeft', weights: { mouthSmileLeft: 1 } },
  { id: 'smileRight', weights: { mouthSmileRight: 1 } },
  { id: 'pucker', weights: { mouthPucker: 1 } },
  { id: 'bothSmiles', weights: { mouthSmileLeft: 1, mouthSmileRight: 1 } },
  { id: 'bothBlinks', weights: { eyeBlinkLeft: 1, eyeBlinkRight: 1 } },
  { id: 'jaw_bothSmiles', weights: { jawOpen: 1, mouthSmileLeft: 1, mouthSmileRight: 1 } },
  { id: 'jaw_pucker', weights: { jawOpen: 1, mouthPucker: 1 } },
];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
});
const report = { at: new Date().toISOString(), assets: {} };

for (const id of ['m5', 'f5']) {
  const stem =
    id === 'm5'
      ? 'human-male-quality-20260921-m5-face3'
      : 'human-female-quality-20260921-f5-face3';
  const outDir = join(
    ROOT,
    `assets/species-3d/human/runs/quality-20260930-${id}-face3/qa/final/visual`,
  );
  mkdirSync(outDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await page.goto(`http://127.0.0.1:${port}/__harness/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__SAGADRIVE_VISUAL__ === 'function');
  const url = `/assets/avatars/species/${stem}.vrm`;
  const shots = await page.evaluate(
    async ({ url, poses }) => window.__SAGADRIVE_VISUAL__(url, poses),
    { url, poses },
  );
  const paths = {};
  for (const [poseId, dataUrl] of Object.entries(shots)) {
    const prefix = 'data:image/jpeg;base64,';
    if (!String(dataUrl).startsWith(prefix)) throw new Error(`bad dataUrl for ${poseId}`);
    const file = join(outDir, `${poseId}.jpg`);
    writeFileSync(file, Buffer.from(String(dataUrl).slice(prefix.length), 'base64'));
    paths[poseId] = `qa/final/visual/${poseId}.jpg`;
  }
  report.assets[id] = {
    vrm: `public/assets/avatars/species/${stem}.vrm`,
    shots: paths,
    count: Object.keys(paths).length,
  };
  await page.close();
  console.log(id, 'shots', Object.keys(paths).length);
}

await browser.close();
server.close();
for (const id of ['m5', 'f5']) {
  writeFileSync(
    join(ROOT, `assets/species-3d/human/runs/quality-20260930-${id}-face3/qa/final/visual-report.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
console.log('liveact-423-visual-sanity OK');
