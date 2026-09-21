#!/usr/bin/env node
/**
 * liveact-face-authoring-qtmesh — CLI wrapper for offline QtMesh FaceRig (#384).
 * Location: scripts/liveact-face-authoring-qtmesh.mjs
 *
 * Usage:
 *   node scripts/liveact-face-authoring-qtmesh.mjs \
 *     --input <glb> --output <glb> --run-dir <dir> [--qtmesh-bin <path>] [--bootstrap]
 *
 * Does not download QtMesh during unit tests; bootstrap is opt-in for real authoring runs.
 */
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import {
  FACE_AUTHORING_PROVIDER,
  QTMESH_PINNED_COMMIT,
  QTMESH_REPOSITORY,
  DEFAULT_FULLBODY_MAX_RESIDUAL,
  canonicalizeFaceExport,
  parseFaceAuthoringArgs,
  repoRootFromThisModule,
  runQtmeshFaceAuthoring,
  sha256File,
} from './lib/liveact-face-authoring-qtmesh.mjs';
import { validateLiveActFaceAsset } from './lib/liveact-face-asset-validate.mjs';

function usage() {
  console.log(`Usage:
  node scripts/liveact-face-authoring-qtmesh.mjs \\
    --input <glb> --output <glb> --run-dir <dir> \\
    [--baseline <glb>] [--profile core-v1|full-v1] \\
    [--qtmesh-bin <path>] [--max-residual N] [--bootstrap] [--canonicalize-only]`);
}

async function maybeBootstrap(root) {
  const script = join(root, 'scripts/bootstrap-qtmesh-facerig.sh');
  if (!existsSync(script)) {
    throw new Error(`bootstrap script missing: ${script}`);
  }
  const r = spawnSync('bash', [script], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error(`bootstrap-qtmesh-facerig.sh failed with exit ${r.status}`);
  }
}

async function main() {
  const root = repoRootFromThisModule();
  let args;
  try {
    args = parseFaceAuthoringArgs(process.argv.slice(2));
  } catch (err) {
    usage();
    throw err;
  }
  if (args.help) {
    usage();
    return;
  }

  if (args.bootstrap) {
    await maybeBootstrap(root);
  }

  const outputAbs = resolve(root, args.output);
  const runDirAbs = resolve(root, args.runDir);
  const baselinePath = args.baseline
    ? resolve(root, args.baseline)
    : resolve(root, args.input);
  const inputAbs = resolve(root, args.input);

  let authoring = null;
  if (!args.canonicalizeOnly) {
    authoring = await runQtmeshFaceAuthoring({
      root,
      input: args.input,
      output: args.output,
      runDir: args.runDir,
      qtmeshBin: args.qtmeshBin,
      maxResidual: args.maxResidual ?? DEFAULT_FULLBODY_MAX_RESIDUAL,
    });
  } else if (!existsSync(outputAbs)) {
    throw new Error(`--canonicalize-only requires existing --output: ${outputAbs}`);
  }

  const canonical = await canonicalizeFaceExport({
    facePath: outputAbs,
    baselinePath,
    outputPath: outputAbs,
  });

  // Remove Assimp external image sidecars if present
  const { readdirSync } = await import('node:fs');
  for (const name of readdirSync(runDirAbs)) {
    if (/^\*\d+\.png$/i.test(name) || /\.material$/i.test(name) || name.endsWith('.embedded.glb')) {
      try {
        unlinkSync(join(runDirAbs, name));
      } catch {
        /* ignore */
      }
    }
  }

  const inventoryPath = join(runDirAbs, 'face-inventory.json');
  const validation = await validateLiveActFaceAsset({
    inputPath: outputAbs,
    baselinePath,
    profile: args.profile || 'core-v1',
    outPath: inventoryPath,
  });

  const inputStat = {
    path: args.input,
    checksum: authoring?.inputChecksum || (existsSync(inputAbs) ? sha256File(inputAbs) : null),
    bytes: existsSync(inputAbs) ? readFileSync(inputAbs).byteLength : null,
  };
  const outputChecksum = sha256File(outputAbs);
  const outputStat = {
    path: args.output,
    checksum: outputChecksum,
    bytes: readFileSync(outputAbs).byteLength,
  };

  const installMetaPath = join(root, '.cache/sagadrive-tools/qtmesh/INSTALL.json');
  let installMeta = null;
  if (existsSync(installMetaPath)) {
    try {
      installMeta = JSON.parse(readFileSync(installMetaPath, 'utf8'));
    } catch {
      installMeta = null;
    }
  }

  // Capture ICT template checksum from QtMesh app data if present
  let templateChecksum = installMeta?.faceTemplate?.checksum || null;
  const home = process.env.HOME || '';
  const templateCandidates = [
    join(home, 'Library/Application Support/QtMeshEditor/QtMeshEditor/ai_models/facerig/arkit_template.bin'),
    join(home, 'Library/Application Support/QtMeshEditor/ai_models/facerig/arkit_template.bin'),
    join(home, '.local/share/QtMeshEditor/ai_models/facerig/arkit_template.bin'),
  ];
  for (const p of templateCandidates) {
    if (existsSync(p)) {
      templateChecksum = sha256File(p);
      break;
    }
  }

  const inventory = validation.inventory;
  const gazeMode = inventory?.gazeMode ?? null;

  const runJson = {
    runId: runDirAbs.split(/[/\\]/).filter(Boolean).pop(),
    createdAt: new Date().toISOString(),
    faceAuthoringProvider: FACE_AUTHORING_PROVIDER,
    qtmesh: {
      repository: QTMESH_REPOSITORY,
      commit: QTMESH_PINNED_COMMIT,
      license: 'MIT',
      bin: authoring?.bin || null,
      binSource: authoring?.binSource || null,
      install: installMeta,
    },
    faceTemplate: {
      provider: 'ICT-FaceKit',
      license: 'MIT',
      checksum: templateChecksum,
    },
    input: inputStat,
    output: outputStat,
    faceRig: {
      shapeCount: authoring?.interpreted?.shapeCount ?? inventory?.morphCount ?? null,
      fitResidual: authoring?.interpreted?.fitResidual ?? null,
      gazeMode,
      coreProfile: args.profile || 'core-v1',
      fullProfile: validation.ok && args.profile === 'full-v1' ? 'pass' : 'measured',
      targetNamesSample: (inventory?.presentChannels || []).slice(0, 12),
      canonicalize: canonical,
    },
    validation: {
      khronos: inventory?.khronos || null,
      sagaDrive: inventory?.sagaDrive || null,
      ok: validation.ok,
      profile: args.profile || 'core-v1',
      inventoryPath: 'face-inventory.json',
      qtmeshReportPath: 'qtmesh-report.json',
    },
    beforeAfter: {
      bytes: { before: inventory?.baselineStats?.byteCount ?? null, after: inventory?.byteCount ?? null },
      triangles: {
        before: inventory?.baselineStats?.triangleCount ?? null,
        after: inventory?.triangleCount ?? null,
      },
      morphs: { before: 0, after: inventory?.morphCount ?? null },
      skins: { before: inventory?.baselineStats?.skinCount ?? null, after: inventory?.skinCount ?? null },
      bones: {
        before: inventory?.baselineStats?.skeletonJointCount ?? null,
        after: inventory?.skeletonJointCount ?? null,
      },
      materials: {
        before: inventory?.baselineStats?.materialCount ?? null,
        after: inventory?.materialCount ?? null,
      },
      textures: {
        before: inventory?.baselineStats?.textureCount ?? null,
        after: inventory?.textureCount ?? null,
      },
    },
  };

  writeFileSync(join(runDirAbs, 'run.json'), JSON.stringify(runJson, null, 2) + '\n');

  if (!validation.ok) {
    console.error(
      `liveact-face-authoring-qtmesh FAIL validation: ${(inventory?.sagaDrive?.errors || []).join(', ')}`,
    );
    process.exit(1);
  }

  console.log(
    `liveact-face-authoring-qtmesh OK output=${args.output} profile=${args.profile || 'core-v1'} morphs=${inventory?.morphCount ?? '?'} gaze=${gazeMode}`,
  );
}

main().catch((err) => {
  console.error(`liveact-face-authoring-qtmesh FAIL: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
