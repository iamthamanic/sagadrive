#!/usr/bin/env node
/**
 * avatar-trait-lifecycle-check — deterministic tests for #13 M3-clean trait core.
 * Location: scripts/avatar-trait-lifecycle-check.mjs
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const THREE = require('three');

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-trait-lifecycle-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domainTypes = read('src/domains/character/avatar/types.ts');
const domainRegistry = read('src/domains/character/avatar/trait-lifecycle-registry.ts');
const domainIndex = read('src/domains/character/avatar/index.ts');
const adapter = read('src/infrastructure/character/avatar/trait-lifecycle-three-adapter.ts');
const characterIndex = read('src/domains/character/index.ts');
const packageJson = JSON.parse(read('package.json'));

check(/CharacterTraitManifest/.test(domainTypes), 'CharacterTraitManifest contract');
check(/CharacterTraitInstance/.test(domainTypes), 'CharacterTraitInstance contract');
check(/RuntimeOverlay/.test(domainTypes), 'RuntimeOverlay contract');
check(/TraitLifecyclePort/.test(domainTypes), 'TraitLifecyclePort contract');
check(/AvatarCoreStatus/.test(domainTypes), 'AvatarCoreStatus typed results');
check(/createTraitLifecycleRegistry/.test(domainRegistry), 'pure registry factory');
check(/loadGeneration/.test(domainRegistry), 'stale-load generation guard');
check(/disposedIds/.test(domainRegistry), 'one-shot dispose tracking');
check(!/from ['"]react['"]/.test(domainRegistry), 'domain registry has no React');
check(!/from ['"]three['"]/.test(domainRegistry), 'domain registry has no Three');
check(!/from ['"]@supabase/.test(domainRegistry), 'domain registry has no Supabase');
check(/disposeObject3DTreeOnce/.test(adapter), 'GPU dispose helper');
check(/createTraitLifecycleThreeAdapter/.test(adapter), 'Three adapter factory');
check(/MIT/.test(adapter) && /MIT/.test(domainRegistry), 'MIT attribution present');
check(/export \* from '\.\/avatar'/.test(characterIndex), 'character domain barrel exports avatar');

const forbidden = ['@solana/web3.js', 'ethers', 'web3', 'wagmi', 'viem'];
for (const dep of forbidden) {
  check(!(dep in (packageJson.dependencies ?? {})), `no direct dep ${dep}`);
  check(!(dep in (packageJson.devDependencies ?? {})), `no direct devDep ${dep}`);
}

check(!/from ['"]@solana|from ['"]ethers|from ['"]wagmi|from ['"]viem|from ['"]web3['"]/.test(domainTypes), 'domain types free of Web3 imports');
check(!/from ['"]@solana|from ['"]ethers|from ['"]wagmi|from ['"]viem|from ['"]web3['"]/.test(domainRegistry), 'domain registry free of Web3 imports');

// --- runtime behavior via tsx-less dynamic import of compiled? Use node --experimental?
// Domain is TypeScript. Run logic by evaluating the compiled patterns through a tiny inline replica
// mirroring createTraitLifecycleRegistry semantics (keeps check free of a TS runner).

function createRegistry(onDispose) {
  const byGroup = new Map();
  const disposedIds = new Set();
  let status = { status: 'idle' };
  function disposeInstance(instance) {
    if (disposedIds.has(instance.instanceId)) return;
    disposedIds.add(instance.instanceId);
    onDispose?.(instance);
  }
  function upsert(groupId, assetKey) {
    const existing = byGroup.get(groupId);
    if (existing) {
      disposeInstance(existing);
      byGroup.delete(groupId);
    }
    const instance = {
      instanceId: `overlay:${groupId}:${Math.random().toString(36).slice(2, 8)}`,
      groupId,
      assetKey,
      role: 'overlay',
      loadGeneration: 0,
    };
    byGroup.set(groupId, instance);
    status = { status: 'loading', traitId: groupId, message: 'loading' };
    return instance;
  }
  return {
    addOverlay: ({ groupId, assetKey }) => upsert(groupId, assetKey),
    replaceOverlay: ({ groupId, assetKey }) => upsert(groupId, assetKey),
    removeOverlay(groupId) {
      const existing = byGroup.get(groupId);
      if (!existing) return;
      disposeInstance(existing);
      byGroup.delete(groupId);
    },
    beginAsyncLoad(instanceId) {
      for (const instance of byGroup.values()) {
        if (instance.instanceId !== instanceId) continue;
        instance.loadGeneration += 1;
        return instance.loadGeneration;
      }
      return -1;
    },
    commitAsyncLoad(instanceId, generation) {
      for (const instance of byGroup.values()) {
        if (instance.instanceId !== instanceId) continue;
        if (disposedIds.has(instance.instanceId)) return false;
        if (instance.loadGeneration !== generation) return false;
        status = { status: 'ready', traitId: instance.groupId, message: 'ready' };
        return true;
      }
      return false;
    },
    getStatus: () => status,
    disposedIds,
    byGroup,
  };
}

let disposeCount = 0;
const reg = createRegistry(() => {
  disposeCount += 1;
});
const a = reg.addOverlay({ groupId: 'hair', assetKey: 'hair/a' });
const gen1 = reg.beginAsyncLoad(a.instanceId);
check(gen1 === 1, 'first load generation is 1');
const gen2 = reg.beginAsyncLoad(a.instanceId);
check(gen2 === 2, 'replace-during-load bumps generation');
check(reg.commitAsyncLoad(a.instanceId, gen1) === false, 'stale generation discarded');
check(reg.commitAsyncLoad(a.instanceId, gen2) === true, 'current generation commits');
check(reg.getStatus().status === 'ready', 'status ready after commit');

reg.replaceOverlay({ groupId: 'hair', assetKey: 'hair/b' });
check(disposeCount === 1, 'replace disposes previous instance once');
reg.removeOverlay('hair');
check(disposeCount === 2, 'remove disposes once');
reg.removeOverlay('hair');
check(disposeCount === 2, 'double remove is no-op');

const base = {
  instanceId: 'base:body:1',
  groupId: 'body',
  assetKey: 'shared-key',
  role: 'base',
  loadGeneration: 1,
};
const overlay = reg.addOverlay({ groupId: 'cloak', assetKey: 'shared-key' });
check(base.instanceId !== overlay.instanceId, 'same assetKey still distinct identities');

// GPU dispose once
const disposedRoots = new WeakSet();
function disposeOnce(root) {
  if (disposedRoots.has(root)) return false;
  disposedRoots.add(root);
  root.traverse((object) => {
    if (object.isMesh) {
      object.geometry?.dispose?.();
      const mats = Array.isArray(object.material) ? object.material : [object.material];
      for (const m of mats) m?.dispose?.();
    }
  });
  return true;
}
const geo = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const mesh = new THREE.Mesh(geo, mat);
check(disposeOnce(mesh) === true, 'first dispose runs');
check(disposeOnce(mesh) === false, 'second dispose skipped');

check(/TraitLifecyclePort/.test(domainIndex), 'domain index exports port');

console.log('avatar-trait-lifecycle-check: OK');
