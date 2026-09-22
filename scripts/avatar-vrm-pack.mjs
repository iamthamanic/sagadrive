#!/usr/bin/env node
/**
 * avatar-vrm-pack — CLI: validated GLB + face inventory → VRM 1.0 (#404).
 * Location: scripts/avatar-vrm-pack.mjs
 *
 * Usage:
 *   node scripts/avatar-vrm-pack.mjs \
 *     --input public/.../m5-face1.glb \
 *     --inventory assets/.../face-inventory.json \
 *     --out .qa/runs/packed-m5.vrm \
 *     [--rig path/to/SagaDriveHumanoidRigV1.json]
 */
import process from 'node:process';
import { packAvatarVrm1 } from './lib/avatar-vrm-pack.mjs';

function parseArgs(argv) {
  const args = {
    input: null,
    inventory: null,
    out: null,
    rig: null,
    name: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--inventory') args.inventory = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--rig') args.rig = argv[++i];
    else if (a === '--name') args.name = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.input || !args.inventory || !args.out) {
  console.log(`Usage: node scripts/avatar-vrm-pack.mjs --input <glb> --inventory <json> --out <vrm> [--rig <json>] [--name <meta>]`);
  process.exit(args.help ? 0 : 1);
}

try {
  const result = await packAvatarVrm1({
    inputGlbPath: args.input,
    inventoryPath: args.inventory,
    outputVrmPath: args.out,
    rigPath: args.rig,
    metaName: args.name,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        outputVrmPath: result.outputVrmPath,
        manifestPath: result.manifestPath,
        humanoidBoneCount: result.manifest.humanoidBoneCount,
        gazeMode: result.manifest.gazeMode,
        lookAtType: result.manifest.lookAtType,
        outputBytes: result.manifest.outputBytes,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error(`avatar-vrm-pack FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
