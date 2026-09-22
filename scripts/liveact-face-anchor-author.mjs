#!/usr/bin/env node
/**
 * liveact-face-anchor-author — write SagaDriveFaceAnchorsV1 manifests from GLB (#399).
 * Location: scripts/liveact-face-anchor-author.mjs
 *
 * Offline only. Domain stays provider-neutral; this script never names DCC tools.
 */
import process from 'node:process';
import {
  authorFaceAnchorsFromGlb,
  parseFaceAnchorAuthorArgs,
} from './lib/liveact-face-anchor-author-lib.mjs';

const args = parseFaceAnchorAuthorArgs(process.argv.slice(2));

try {
  const result = await authorFaceAnchorsFromGlb({
    inputPath: args.input,
    outputPath: args.output,
    nodeIdentity: args.node ?? undefined,
    bootstrap: args.bootstrap,
  });
  const count = Object.keys(result.manifest.anchors).length;
  console.log(
    `liveact-face-anchor-author OK: ${count} anchors → ${args.output}; authoring → ${result.authoringPath}`,
  );
} catch (err) {
  console.error(`liveact-face-anchor-author FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
