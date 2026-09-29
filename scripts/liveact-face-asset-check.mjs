#!/usr/bin/env node
/**
 * liveact-face-asset-check — CLI: Khronos then SagaDrive face-asset gate (#383/#422).
 * Location: scripts/liveact-face-asset-check.mjs
 *
 * Usage:
 *   node scripts/liveact-face-asset-check.mjs \
 *     --input <glb> --baseline <glb> --profile <core-v1|full-v1> \
 *     [--anchors <face-anchors.json>] [--authoring <face-mapping-authoring.json>] --out <json>
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
      anchorsPath: args.anchors || undefined,
      authoringPath: args.authoring || undefined,
      gazeOwner: args.gazeOwner || undefined,
      functionalMode: args.functionalMode || undefined,
    });
    if (!result.ok) {
      const semanticHint =
        result.inventory.semanticQa?.violations?.length > 0
          ? ` semantic=${result.inventory.semanticQa.violations.slice(0, 3).join(';')}`
          : '';
      const functionalHint =
        result.inventory.functionalQa?.violations?.length > 0
          ? ` functional=${result.inventory.functionalQa.violations.slice(0, 3).join(';')}`
          : '';
      console.error(
        `liveact-face-asset-check FAIL: ${result.inventory.sagaDrive.errors.join(', ')}${semanticHint}${functionalHint}`,
      );
      process.exit(1);
    }
    const semanticStatus = result.inventory.semanticQa?.skipped
      ? 'semantic=skipped'
      : `semantic=pass`;
    const functionalStatus = result.inventory.functionalQa?.skipped
      ? 'functional=skipped'
      : result.inventory.functionalQa?.pass
        ? 'functional=pass'
        : 'functional=fail';
    console.log(
      `liveact-face-asset-check OK profile=${args.profile} channels=${result.inventory.usableMorphCount} ${semanticStatus} ${functionalStatus}`,
    );
  } catch (err) {
    console.error(`liveact-face-asset-check FAIL: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

await main();
