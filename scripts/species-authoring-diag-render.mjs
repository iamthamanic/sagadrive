#!/usr/bin/env node
/**
 * Headless Three.js diagnostic renders for species authoring (grey / unlit albedo / PBR).
 * Location: scripts/species-authoring-diag-render.mjs
 * Usage: node scripts/species-authoring-diag-render.mjs <model.glb> <outDir>
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createCanvas } from '@napi-rs/canvas';

const require = createRequire(import.meta.url);
const THREE = require('three');
const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');
const { RoomEnvironment } = require('three/examples/jsm/environments/RoomEnvironment.js');

const modelPath = process.argv[2];
const outDir = process.argv[3];
if (!modelPath || !outDir) {
  console.error('Usage: node scripts/species-authoring-diag-render.mjs <model.glb> <outDir>');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const width = 768;
const height = 1024;
const canvas = createCanvas(width, height);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(width, height, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2e);
const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 50);
camera.position.set(0, 1.0, 3.2);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const hemi = new THREE.HemisphereLight(0xf0f4ff, 0x222228, 0.55);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.35);
key.position.set(2.2, 3.5, 2.8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xdde4f0, 0.45);
fill.position.set(-2.0, 1.5, 1.5);
scene.add(fill);

const loader = new GLTFLoader();
const arrayBuffer = readFileSync(modelPath).buffer;

function fit(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  root.position.y += size.y * 0.5;
  const dist = Math.max(size.y * 1.55, size.x * 2.2, 2.4);
  camera.position.set(0, size.y * 0.55, dist);
  camera.lookAt(0, size.y * 0.45, 0);
}

function snapshotMaterials(root) {
  const snaps = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      snaps.push({
        mesh: o,
        material: m,
        map: m.map || null,
        normalMap: m.normalMap || null,
        metalnessMap: m.metalnessMap || null,
        roughnessMap: m.roughnessMap || null,
        color: m.color?.clone?.(),
        metalness: m.metalness,
        roughness: m.roughness,
      });
    }
  });
  return snaps;
}

function applyMode(snaps, mode) {
  for (const s of snaps) {
    const m = s.material;
    if (mode === 'grey') {
      m.map = null;
      m.normalMap = null;
      m.metalnessMap = null;
      m.roughnessMap = null;
      m.color?.set?.(0xb0b0b0);
      m.metalness = 0;
      m.roughness = 0.85;
    } else if (mode === 'unlit') {
      m.map = s.map;
      m.normalMap = null;
      m.metalnessMap = null;
      m.roughnessMap = null;
      m.color?.set?.(0xffffff);
      m.metalness = 0;
      m.roughness = 1;
      m.emissive?.set?.(0x000000);
    } else {
      m.map = s.map;
      m.normalMap = s.normalMap;
      m.metalnessMap = s.metalnessMap;
      m.roughnessMap = s.roughnessMap;
      if (s.color) m.color.copy(s.color);
      m.metalness = s.metalness;
      m.roughness = s.roughness;
    }
    m.needsUpdate = true;
  }
}

function save(name) {
  renderer.render(scene, camera);
  const buf = canvas.toBuffer('image/png');
  const path = join(outDir, name);
  writeFileSync(path, buf);
  console.log('wrote', path, buf.length);
}

loader.parse(
  arrayBuffer,
  dirname(modelPath) + '/',
  (gltf) => {
    const root = gltf.scene;
    scene.add(root);
    fit(root);
    const snaps = snapshotMaterials(root);
    applyMode(snaps, 'grey');
    save('diag-grey.png');
    applyMode(snaps, 'unlit');
    save('diag-unlit-albedo.png');
    applyMode(snaps, 'pbr');
    save('diag-pbr.png');
    console.log('diag render done');
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
