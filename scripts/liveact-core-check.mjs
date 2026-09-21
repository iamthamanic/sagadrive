#!/usr/bin/env node
/**
 * liveact-core-check — deterministic tests for LiveAct 1/7 contract + engine (#329).
 * Location: scripts/liveact-core-check.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`liveact-core-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const face = read('src/domains/character/liveact/liveact-face-contract.ts');
const contract = read('src/domains/character/liveact/liveact-contract.ts');
const caps = read('src/domains/character/liveact/liveact-capabilities.ts');
const domainIndex = read('src/domains/character/liveact/index.ts');
const engine = read('src/infrastructure/character/liveact/liveact-engine.ts');
const source = read('src/infrastructure/character/liveact/mediapipe-face-source.ts');
const output = read('src/infrastructure/character/liveact/liveact-avatar-output.ts');
const claim = read('src/infrastructure/character/liveact/liveact-camera-claim.ts');
const legacy = read('src/infrastructure/character/avatar/avatar-face-tracking-runtime.ts');

check(/LIVEACT_FACE_CHANNELS/.test(face), 'face channels const');
check(/browDownLeft/.test(face), 'browDownLeft channel');
check(/mouthSmileLeft/.test(face), 'mouthSmileLeft channel');
check(/noseSneerRight/.test(face), 'noseSneerRight channel');
check(!/happy|angry|\baa\b/.test(face), 'no happy/angry/aa collapse in face contract');
check(!/from ['"]react['"]/.test(face), 'face domain no React');
check(!/mediapipe|HTMLVideoElement|three/.test(face), 'face domain no MediaPipe/DOM/Three');

check(/LiveActFrameV1/.test(contract), 'LiveActFrameV1');
check(/timestampMs/.test(contract), 'timestampMs');
check(/sequence/.test(contract), 'sequence');
check(/trackingLost/.test(contract), 'trackingLost');
check(/eyeLeft/.test(contract) && /eyeRight/.test(contract), 'split eye gaze');
check(/assertLiveActFrameLocalOnly/.test(contract), 'privacy assert');
check(!/from ['"]react['"]/.test(contract), 'contract no React');
check(!/mediapipe|getUserMedia|HTMLVideoElement|from ['"]three['"]/.test(contract), 'contract pure');

check(/createLiveActCapabilities/.test(caps), 'capabilities helper');
check(/LIVEACT_FACE_CHANNELS/.test(domainIndex), 'barrel exports channels');
check(/mapLiveActSourceSample/.test(domainIndex), 'barrel exports mapper');

check(/export class LiveActEngine/.test(engine), 'engine class');
check(/subscribeStatus/.test(engine) && /subscribeFrame/.test(engine), 'subscriptions');
check(/getUserMedia/.test(engine), 'camera path');
check(/audio:\s*false/.test(engine), 'no microphone');
check(/claimLiveActCamera/.test(engine), 'shared camera claim');
check(/track\.stop/.test(engine), 'track cleanup');
check(/applyLiveActFrame/.test(output), 'output port');
check(/resetLiveActPose/.test(output), 'output reset');
check(/MEDIAPIPE_VISION_WASM_PATH/.test(source), 'shared wasm path');
check(/\/mediapipe\/wasm/.test(source), 'wasm under /mediapipe/wasm');
check(/\/mediapipe\/models\/face_landmarker\.task/.test(source), 'model first-party');
check(!/cdn\.jsdelivr\.net/.test(source), 'no jsdelivr');
check(!/storage\.googleapis\.com/.test(source), 'no google CDN');
check(/claimLiveActCamera/.test(claim), 'claim helper');
check(/from ['"].*liveact\/mediapipe-face-source['"]/.test(legacy), 'legacy imports shared paths');
check(/claimLiveActCamera/.test(legacy), 'legacy uses shared claim');
check(/createMediaPipeFaceTrackingDetector/.test(legacy), 'legacy detector still present');

const channelMatch = face.match(/LIVEACT_FACE_CHANNELS = \[([\s\S]*?)\] as const/);
check(Boolean(channelMatch), 'parse LIVEACT_FACE_CHANNELS');
const channelIds = [...channelMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
check(channelIds.length === 52, `expected 52 channels, got ${channelIds.length}`);
check(new Set(channelIds).size === 52, 'channels unique');

const outfile = join(root, '.qa/runs/liveact-core-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/index.ts')],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  outfile,
  logLevel: 'silent',
});

const ft = await import(outfile + `?t=${Date.now()}`);
check(ft.LIVEACT_FACE_CHANNELS.length === 52, 'runtime channel count 52');
check(ft.LIVEACT_CONTRACT_VERSION === 'SagaDriveLiveActFrameV1', 'contract version');

const neutral = ft.createNeutralLiveActFaceChannels();
check(neutral._neutral === 1, 'neutral base');
check(neutral.mouthSmileLeft === 0, 'smile zero at neutral');

const active = ft.mapLiveActSourceSample(
  {
    presence: 0.9,
    headYaw: 0.2,
    headPitch: -0.1,
    headRoll: 0.05,
    eyeLeftX: 0.3,
    eyeLeftY: -0.2,
    eyeRightX: 0.25,
    eyeRightY: -0.15,
    face: {
      mouthSmileLeft: 0.8,
      mouthSmileRight: 0.7,
      jawOpen: 0.4,
      eyeBlinkLeft: 0.1,
      eyeBlinkRight: 0.12,
    },
    faceIndex: 0,
    faceCount: 1,
  },
  { timestampMs: 1000, sequence: 1 },
);

check(active.trackingLost === false, 'active not lost');
check(active.sequence === 1, 'sequence set');
check(active.face.mouthSmileLeft === 0.8, 'smileLeft preserved (no happy collapse)');
check(active.face.jawOpen === 0.4, 'jawOpen preserved');
check(active.eyeLeft.x === 0.3, 'left eye x');
check(active.eyeRight.y === -0.15, 'right eye y');
ft.assertLiveActFrameLocalOnly(active);

const lost = ft.mapLiveActSourceSample(ft.createEmptyLiveActSourceSample(), {
  timestampMs: 2000,
  sequence: 2,
});
check(lost.trackingLost === true, 'empty sample lost');
check(lost.face._neutral === 1, 'lost → neutral');

const smoothed = ft.smoothLiveActFrame(active, lost, 0.5);
check(smoothed.trackingLost === true, 'smooth lost flag');

const capabilities = ft.createLiveActCapabilities({
  face: true,
  headPose: true,
  headBone: true,
  avatarFace: { jawOpen: true, mouthSmileLeft: true },
});
check(capabilities.activeFaceChannelCount === 2, 'capability active count');
check(capabilities.totalFaceChannelCount === 52, 'capability total');

console.log('liveact-core-check OK');
