#!/usr/bin/env node
/**
 * liveact-face-asset-check — CLI: Khronos then SagaDrive face-asset gate (#383).
 * Location: scripts/liveact-face-asset-check.mjs
 *
 * Usage:
 *   node scripts/liveact-face-asset-check.mjs \
 *     --input <glb> --baseline <glb> --profile <core-v1|full-v1> --out <json>
 */
import process from 'node:process';
import {
  parseFaceAssetCheckArgs,
  validateLiveActFaceAsset,
} from './lib/liveact-face-asset-validate.mjs';

async function main() {
  try {
    const args = parseFaceAssetCheckArgs(process.argv.slice(2));
    const result = await validateLiveActFaceAsset({
      inputPath: args.input,
      baselinePath: args.baseline,
      profile: args.profile,
      outPath: args.out || undefined,
    });
    if (!result.ok) {
      console.error(
        `liveact-face-asset-check FAIL: ${result.inventory.sagaDrive.errors.join(', ')}`,
      );
      process.exit(1);
    }
    console.log(
      `liveact-face-asset-check OK profile=${args.profile} channels=${result.inventory.usableMorphCount}`,
    );
  } catch (err) {
    console.error(`liveact-face-asset-check FAIL: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

await main();
