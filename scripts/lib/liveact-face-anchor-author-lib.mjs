/**
 * liveact-face-anchor-author-lib — bootstrap/write face-anchors.json manifests (#399/#419).
 * Location: scripts/lib/liveact-face-anchor-author-lib.mjs
 *
 * Heuristic/bootstrap writes are always auto + unreviewed provenance (#419).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import {
  FACE_ANCHORS_CONTRACT_VERSION,
  SAGA_DRIVE_FACE_ANCHOR_IDS,
} from './liveact-face-anchor-ids.mjs';
import { findNodeByIdentity, listMeshedNodeIdentities } from './liveact-face-anchor-glb.mjs';
import { authorHeuristicFaceAnchorsManifest } from './liveact-face-anchor-heuristic.mjs';
import { authorMorphSeededFaceAnchorsManifest } from './liveact-face-anchor-morph-seed.mjs';
import {
  createAutoUnreviewedFaceMappingAuthoring,
  faceMappingAuthoringPathBesideAnchors,
} from './liveact-face-mapping-authoring.mjs';

const CENTROID = { u: 1 / 3, v: 1 / 3, w: 1 / 3 };

/**
 * @param {import('@gltf-transform/core').Document} document
 * @param {{ nodeIdentity?: string; primitiveIndex?: number; triangleIndex?: number }} opts
 */
export function bootstrapMinimalFaceAnchorsManifest(document, opts = {}) {
  const identities = listMeshedNodeIdentities(document);
  const nodeIdentity = opts.nodeIdentity ?? identities[0];
  if (!nodeIdentity) {
    throw new Error('No meshed nodes found for bootstrap manifest.');
  }
  const node = findNodeByIdentity(document, nodeIdentity);
  if (!node?.getMesh()) {
    throw new Error(`Node not found or has no mesh: ${nodeIdentity}`);
  }

  const primitiveIndex = opts.primitiveIndex ?? 0;
  const triangleIndex = opts.triangleIndex ?? 0;

  /** @type {Record<string, unknown>} */
  const anchors = {};
  for (const id of SAGA_DRIVE_FACE_ANCHOR_IDS) {
    anchors[id] = {
      nodeIdentity,
      primitiveIndex,
      triangleIndex,
      barycentric: { ...CENTROID },
    };
  }

  return {
    contractVersion: FACE_ANCHORS_CONTRACT_VERSION,
    anchors,
  };
}

/**
 * @param {{ inputPath: string; outputPath: string; nodeIdentity?: string; bootstrap?: boolean; seed?: "arkit-morphs"; modelPath?: string; cacheBust?: string }} opts
 */
export async function authorFaceAnchorsFromGlb(opts) {
  const io = new NodeIO();
  const document = await io.readBinary(new Uint8Array(readFileSync(opts.inputPath)));

  let manifest;
  if (opts.bootstrap) {
    manifest = bootstrapMinimalFaceAnchorsManifest(document, { nodeIdentity: opts.nodeIdentity });
  } else if (opts.seed === 'arkit-morphs') {
    const authored = authorMorphSeededFaceAnchorsManifest(document);
    manifest = {
      contractVersion: FACE_ANCHORS_CONTRACT_VERSION,
      anchors: authored.anchors,
    };
  } else {
    const authored = authorHeuristicFaceAnchorsManifest(document, {
      nodeIdentity: opts.nodeIdentity,
    });
    manifest = {
      contractVersion: FACE_ANCHORS_CONTRACT_VERSION,
      anchors: authored.anchors,
    };
  }

  writeFileSync(opts.outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  // Heuristic/bootstrap is proposal-only — never reviewed ground truth (#419).
  const authoring = createAutoUnreviewedFaceMappingAuthoring({
    modelPath: opts.modelPath ?? opts.inputPath,
    ...(opts.cacheBust ? { cacheBust: opts.cacheBust } : {}),
    note: opts.bootstrap
      ? 'Bootstrap-minimal face anchors (unreviewed auto).'
      : opts.seed === 'arkit-morphs'
        ? 'ARKit morph-seeded face anchors (unreviewed auto; overlay/diagnostic only).'
        : 'Heuristic face anchors (unreviewed auto).',
  });
  const authoringPath = faceMappingAuthoringPathBesideAnchors(opts.outputPath);
  writeFileSync(authoringPath, `${JSON.stringify(authoring, null, 2)}\n`, 'utf8');

  return { manifest, authoring, authoringPath };
}

export function parseFaceAnchorAuthorArgs(argv) {
  const args = { input: null, output: null, node: null, bootstrap: false, seed: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--output') args.output = argv[++i];
    else if (a === '--node') args.node = argv[++i];
    else if (a === '--bootstrap-minimal') args.bootstrap = true;
    else if (a === '--seed') args.seed = argv[++i];
  }
  if (!args.input || !args.output) {
    throw new Error(
      'Usage: --input <glb|vrm> --output <face-anchors.json> [--node <name>] [--bootstrap-minimal] [--seed arkit-morphs]',
    );
  }
  if (args.seed != null && args.seed !== 'arkit-morphs') {
    throw new Error(`Unknown --seed "${args.seed}" (supported: arkit-morphs)`);
  }
  return args;
}
