#!/usr/bin/env node
/**
 * liveact-session-transport-check — authoritative #364 Remote LiveAct Transport gate.
 * Location: scripts/liveact-session-transport-check.mjs
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
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
    console.error(`liveact-session-transport-check FAIL: ${msg}`);
    process.exit(1);
  }
}

check(existsSync(join(root, '.qa/design/liveact-session-transport.md')), 'design');
check(existsSync(join(root, '.qa/acceptance/liveact-session-transport.md')), 'acceptance');
check(/calibrated/.test(read('.qa/design/liveact-session-transport.md')), 'publish stage');
check(/liveact-session-transport-check/.test(read('scripts/test-gate.mjs')), 'test-gate wire');

const domainFiles = [
  'src/domains/character/liveact/liveact-network-frame.ts',
  'src/domains/character/liveact/liveact-remote-consumer.ts',
];
for (const rel of domainFiles) {
  const src = read(rel);
  for (const pattern of [/@ts-ignore/, /@ts-expect-error/, /@ts-nocheck/, / as any\b/, / as unknown as /]) {
    check(!pattern.test(src), `${rel} no type escape`);
  }
  check(!/from ['"]three['"]/.test(src) && !/livekit-client/.test(src), `${rel} pure`);
  check(!/\blocalStorage\b/.test(src) && !/\bfetch\s*\(/.test(src), `${rel} no network store`);
}

check(/publishData/.test(read('src/infrastructure/session/media/media-plane-adapter.ts')), 'adapter data');
check(/publishData/.test(read('src/infrastructure/session/media/memory-media-plane-adapter.ts')), 'memory data');
check(/publishData/.test(read('src/infrastructure/session/media/livekit-media-plane-adapter.ts')), 'livekit data');
check(/publishLiveActData/.test(read('src/infrastructure/session/media/session-media-plane.ts')), 'facade data');
check(/LiveActSessionTransport/.test(read('src/infrastructure/character/liveact/liveact-session-transport.ts')), 'transport');
check(/useLiveActSessionTransport/.test(read('src/app/session/liveact/useLiveActSessionTransport.ts')), 'hook');
check(!/supabase\.from|world_state|postgres/.test(read('src/infrastructure/character/liveact/liveact-session-transport.ts')), 'no db path');

mkdirSync(join(root, '.qa/tmp'), { recursive: true });

const netOut = join(root, '.qa/tmp/liveact-network-frame-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-network-frame.ts')],
  outfile: netOut,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  logLevel: 'silent',
});
const net = await import(netOut + `?t=${Date.now()}`);

const consOut = join(root, '.qa/tmp/liveact-remote-consumer-bundle.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-remote-consumer.ts')],
  outfile: consOut,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  logLevel: 'silent',
});
const cons = await import(consOut + `?t=${Date.now()}`);

const contractOut = join(root, '.qa/tmp/liveact-contract-bundle-364.mjs');
await build({
  entryPoints: [join(root, 'src/domains/character/liveact/liveact-contract.ts')],
  outfile: contractOut,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  logLevel: 'silent',
});
const contract = await import(contractOut + `?t=${Date.now()}`);

const base = contract.createNeutralLiveActFrame({
  timestampMs: 1000,
  sequence: 5,
  trackingLost: false,
});
const frame = {
  ...base,
  confidence: 0.9,
  trackingLost: false,
  head: { yaw: 0.2, pitch: -0.1, roll: 0 },
  face: { ...base.face, jawOpen: 0.4, mouthSmileLeft: 0.5 },
};

const encoded = net.encodeLiveActNetworkFrame(frame);
check(encoded.contractVersion === 'SagaDriveLiveActNetworkFrameV1', 'encode version');
check(encoded.face.jawOpen === 0.4, 'sparse face');
check(encoded.landmarks === undefined, 'no landmarks');

const decoded = net.decodeLiveActNetworkFrame(encoded);
check(decoded.ok === true, 'decode ok');
check(decoded.liveAct.face.jawOpen === 0.4, 'decode jaw');

const bad = net.decodeLiveActNetworkFrame({
  contractVersion: 'other',
  sequence: 1,
});
check(bad.ok === false && bad.reason === 'unsupported_contract', 'version mismatch');

const bio = net.decodeLiveActNetworkFrame({
  ...encoded,
  landmarks: [1, 2, 3],
});
check(bio.ok === false && bio.reason === 'biometric_forbidden', 'biometrics blocked');

let state = cons.createLiveActRemoteConsumerState();
let r1 = cons.acceptLiveActRemoteFrame({
  state,
  network: encoded,
  liveAct: decoded.liveAct,
  nowWallMs: 2000,
});
check(r1.result.action === 'apply', 'accept apply');
state = r1.state;

const dup = cons.acceptLiveActRemoteFrame({
  state,
  network: encoded,
  liveAct: decoded.liveAct,
  nowWallMs: 2010,
});
check(dup.result.action === 'drop' && dup.result.reason === 'duplicate', 'duplicate drop');

const older = {
  ...encoded,
  sequence: 3,
};
const ooo = cons.acceptLiveActRemoteFrame({
  state,
  network: older,
  liveAct: decoded.liveAct,
  nowWallMs: 2020,
});
check(ooo.result.action === 'drop' && ooo.result.reason === 'out_of_order', 'ooo drop');

const lostEnc = net.encodeLiveActNetworkFrame({
  ...decoded.liveAct,
  sequence: 6,
  trackingLost: true,
});
const lostDec = net.decodeLiveActNetworkFrame(lostEnc);
const lost = cons.acceptLiveActRemoteFrame({
  state,
  network: lostDec.frame,
  liveAct: lostDec.liveAct,
  nowWallMs: 2030,
});
check(lost.result.action === 'neutral', 'tracking lost neutral');

check(
  cons.resolveRemoteLiveActCharacterId({
    publisherIdentity: 'user:abc',
    rosterByUserId: { abc: 'char-1' },
  }) === 'char-1',
  'roster bind',
);
check(
  cons.resolveRemoteLiveActCharacterId({
    publisherIdentity: 'user:abc',
    rosterByUserId: {},
  }) === null,
  'no roster no bind',
);

// Memory plane A→B fan-out
const memOut = join(root, '.qa/tmp/memory-media-364.mjs');
await build({
  entryPoints: [join(root, 'src/infrastructure/session/media/memory-media-plane-adapter.ts')],
  outfile: memOut,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: true,
  logLevel: 'silent',
});
const memMod = await import(memOut + `?t=${Date.now()}`);
const bus = new memMod.MemoryMediaPlaneBus();
const a = new memMod.MemoryMediaPlaneAdapter(bus);
const b = new memMod.MemoryMediaPlaneAdapter(bus);
const accessPlayer = {
  role: 'player',
  capabilities: ['media_token'],
  characterId: 'char-a',
  userId: 'user-a',
  sessionId: 'sess-1',
  projectId: 'proj-1',
};
// Minimal connect shape — adapter only needs token/url/identity/sessionId/access.role
await a.connect({
  sessionId: 'sess-1',
  access: { role: 'player' },
  identity: 'user:ua',
  token: 't',
  url: 'memory://',
});
await b.connect({
  sessionId: 'sess-1',
  access: { role: 'gamemaster' },
  identity: 'user:ub',
  token: 't',
  url: 'memory://',
});
let received = null;
b.subscribeData((msg) => {
  received = msg;
});
await a.publish([{ kind: 'liveact-data', enabled: true }]);
await a.publishData('liveact-data', net.serializeLiveActNetworkFrame(encoded));
check(received?.publisherIdentity === 'user:ua', 'fan-out identity');
check(received?.payload.includes('SagaDriveLiveActNetworkFrameV1'), 'fan-out payload');

const evidenceDir = join(root, '.qa/evidence/liveact-session-transport');
mkdirSync(evidenceDir, { recursive: true });
writeFileSync(
  join(evidenceDir, 'gate-summary.json'),
  JSON.stringify(
    {
      encodeOk: true,
      versionMismatchBlocked: true,
      biometricsBlocked: true,
      sequenceDrops: true,
      trackingLostNeutral: true,
      memoryFanOut: true,
    },
    null,
    2,
  ),
);

console.log('liveact-session-transport-check PASS');
void accessPlayer;
