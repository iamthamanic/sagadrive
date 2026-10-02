#!/usr/bin/env node
/**
 * liveact-face-functional-morph-author — CLI for GT-aware functional morph rewrite (#423).
 * Location: scripts/liveact-face-functional-morph-author.mjs
 *
 * Usage:
 *   node scripts/liveact-face-functional-morph-author.mjs \
 *     --input <glb> --output <glb> --anchors <face-anchors.json> \
 *     --authoring <face-mapping-authoring.json> --channel jawOpen \
 *     [--report <report.json>]
 */
import process from 'node:process';
import {
  authorLiveActFunctionalMorph,
  parseFunctionalMorphAuthorArgs,
} from './lib/liveact-face-functional-morph-author.mjs';

function usage() {
  console.log(`Usage:
  node scripts/liveact-face-functional-morph-author.mjs \\
    --input <glb> --output <glb> \\
    --anchors <face-anchors.json> --authoring <face-mapping-authoring.json> \\
    --channel jawOpen [--report <report.json>]`);
}

async function main() {
  let args;
  try {
    args = parseFunctionalMorphAuthorArgs(process.argv.slice(2));
  } catch (err) {
    usage();
    throw err;
  }
  if (args.help) {
    usage();
    return;
  }
  const report = await authorLiveActFunctionalMorph({
    inputPath: args.input,
    outputPath: args.output,
    anchorsPath: args.anchors,
    authoringPath: args.authoring,
    channel: args.channel,
    reportPath: args.report,
  });
  console.log(
    `liveact-face-functional-morph-author OK channel=${report.channel} affected=${report.channelStats.affectedVertices} gapΔ=${Number(report.channelStats.mouthGapDelta).toFixed(5)} out=${report.outputPath}`,
  );
}

main().catch((err) => {
  console.error(`liveact-face-functional-morph-author FAIL: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
