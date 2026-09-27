/**
 * liveact-tracking-roundtrip-eval — poses, left/right actions and verdicts of the LiveAct round trip.
 * Location: scripts/lib/liveact-tracking-roundtrip-eval.mjs
 *
 * Node side of `scripts/saga-human-canonical-v1-pose-sheet.mjs --roundtrip`; the browser side
 * (render, track, probe) is scripts/lib/saga-human-canonical-v1/roundtrip-page.mjs.
 * FAIL = evidence against an app convention (axis, sign, side) — gates the run.
 * WEAK = the tracker barely sees the asset's expression (asset finding). SKIP = not assertable
 * on this avatar. INFO = measured range, never gating.
 */

/**
 * Conventions: frame values applied to the rendered avatar (it plays the user in front of the
 * webcam) and what the tracked, unmirrored sample must show relative to the tracked neutral pose.
 * head: expected Δ in degrees (unlisted axes ≈ 0) · dominant: [higher, lower] channel ·
 * gazeDeg: eye rotation to apply (converted per avatar) · gazeX / gazeY: expected Δ sign of both
 * eyes · rises: channel Δ must exceed the threshold · info: reported, never gating.
 */
export const ROUNDTRIP = [
  { id: 'neutral', label: 'neutral' },
  { id: 'headYawLeft', label: 'Kopf yaw +20° (links)', head: { yaw: 0.35 }, expect: { head: { yaw: 20 } } },
  { id: 'headYawRight', label: 'Kopf yaw −20° (rechts)', head: { yaw: -0.35 }, expect: { head: { yaw: -20 } } },
  { id: 'headPitchDown', label: 'Kopf pitch +15° (runter)', head: { pitch: 0.26 }, expect: { head: { pitch: 15 } } },
  { id: 'headPitchUp', label: 'Kopf pitch −15° (hoch)', head: { pitch: -0.26 }, expect: { head: { pitch: -15 } } },
  { id: 'headRollRight', label: 'Kopf roll +15°', head: { roll: 0.26 }, expect: { head: { roll: 15 } } },
  { id: 'blinkLeft', label: 'eyeBlinkLeft', face: { eyeBlinkLeft: 1 }, expect: { dominant: ['eyeBlinkLeft', 'eyeBlinkRight'] } },
  { id: 'blinkRight', label: 'eyeBlinkRight', face: { eyeBlinkRight: 1 }, expect: { dominant: ['eyeBlinkRight', 'eyeBlinkLeft'] } },
  { id: 'gazeLeft', label: 'Blick 15° links', gazeDeg: { x: 15 }, expect: { gazeX: 1 } },
  { id: 'gazeRight', label: 'Blick 15° rechts', gazeDeg: { x: -15 }, expect: { gazeX: -1 } },
  { id: 'gazeUp', label: 'Blick 15° hoch', gazeDeg: { y: 15 }, expect: { gazeY: 1 } },
  { id: 'gazeDown', label: 'Blick 15° runter', gazeDeg: { y: -15 }, expect: { gazeY: -1 } },
  { id: 'gazeUp20', label: 'Blick 20° hoch', gazeDeg: { y: 20 }, expect: { gazeY: 1, info: true } },
  { id: 'gazeUp25', label: 'Blick 25° hoch', gazeDeg: { y: 25 }, expect: { gazeY: 1, info: true } },
  { id: 'gazeUp30', label: 'Blick 30° hoch', gazeDeg: { y: 30 }, expect: { gazeY: 1, info: true } },
  { id: 'jawOpen', label: 'jawOpen .7', face: { jawOpen: 0.7 }, expect: { rises: 'jawOpen' } },
  { id: 'smileLeft', label: 'mouthSmileLeft', face: { mouthSmileLeft: 1 }, expect: { dominant: ['mouthSmileLeft', 'mouthSmileRight'] } },
  { id: 'jawLeft', label: 'jawLeft', face: { jawLeft: 1 }, expect: { dominant: ['jawLeft', 'jawRight'] } },
  { id: 'mouthLeft', label: 'mouthLeft', face: { mouthLeft: 1 }, expect: { dominant: ['mouthLeft', 'mouthRight'] } },
];

/**
 * Left/right chain: a RAW (anatomical) user action, the side the mirrored webcam preview (PiP)
 * shows it on, and the avatar's own side when copied anatomically (morph / bone convention).
 * probe: how the browser reads the effect (moved-vertex centroid, mean displacement, head / eye axis).
 */
export const LR_ACTIONS = [
  { id: 'blinkLeft', raw: { face: { eyeBlinkLeft: 1 } }, probe: 'morphPosition', pip: 'left', side: 'avatar-left' },
  { id: 'smileLeft', raw: { face: { mouthSmileLeft: 1 } }, probe: 'morphPosition', pip: 'left', side: 'avatar-left' },
  { id: 'jawLeft', raw: { face: { jawLeft: 1 } }, probe: 'morphDirection', pip: 'left', side: 'avatar-left' },
  { id: 'mouthLeft', raw: { face: { mouthLeft: 1 } }, probe: 'morphDirection', pip: 'left', side: 'avatar-left' },
  { id: 'headTurnLeft', raw: { headYaw: 0.35 }, probe: 'headForward', pip: 'left', side: 'avatar-left' },
  { id: 'headTiltRight', raw: { headRoll: 0.26 }, probe: 'headUp', pip: 'right', side: 'avatar-right' },
  { id: 'headNodDown', raw: { headPitch: 0.26 }, probe: 'headForward', pip: 'down' },
  { id: 'gazeLeft', raw: { eyeLeftX: 1, eyeRightX: 1 }, probe: 'eyeForward', pip: 'left', side: 'avatar-left' },
  { id: 'gazeUp', raw: { eyeLeftY: 1, eyeRightY: 1 }, probe: 'eyeForward', pip: 'up' },
];

/** Lip channels the webcam test found stiff (user list); flagged in the channel audit. */
export const LIP_FOCUS = [
  'mouthRollUpper',
  'mouthRollLower',
  'mouthPressLeft',
  'mouthPressRight',
  'mouthClose',
  'mouthUpperUpLeft',
  'mouthUpperUpRight',
  'mouthLowerDownLeft',
  'mouthLowerDownRight',
  'mouthSmileLeft',
  'mouthSmileRight',
  'mouthFunnel',
  'mouthPucker',
];

/** MediaPipe head pose on renders is not exact; axis swaps / sign flips are ≥ 15° off. */
const HEAD_TOLERANCE_DEG = 8;
const DOMINANCE_MIN = 0.2;
const GAZE_MIN = 0.1;
const RISE_MIN = 0.3;
/** Below this the tracker barely sees the expression: left/right is not judgeable (WEAK). */
const VISIBLE_MIN = 0.25;
/** Gaze is only assertable where the avatar visibly rotates its eyes. */
const GAZE_MIN_EYE_DEG = 8;
/** Tracked neutral render within these bounds counts as neutral. */
const NEUTRAL_HEAD_MAX_DEG = 5;
const NEUTRAL_GAZE_MAX = 0.15;
/** Channel audit (render proxy): morph ≥ 1 mm is visible geometry; tracker Δ classes. */
const MORPH_VISIBLE_MM = 1;
const TRACK_GOOD = 0.3;
const TRACK_WEAK = 0.1;
const SEVERITY = ['OK', 'SKIP', 'WEAK', 'FAIL'];

const fmt = (v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
const line = (status, where, notes) => `${status.padEnd(9)} ${where.padEnd(38)} ${notes}`;

/** Tracked pose vs. tracked neutral per avatar: head axes, sides, gaze sign. */
export function evaluateConventions(report) {
  const rows = [];
  const failures = [];
  const assetWeak = [];
  for (const [avatarId, entry] of Object.entries(report.avatars)) {
    const neutral = entry.poses.neutral;
    if (!neutral?.detected) {
      failures.push(`${avatarId}: neutral frame — no face detected`);
      continue;
    }
    for (const pose of ROUNDTRIP) {
      const { expect } = pose;
      if (!expect) continue;
      const tracked = entry.poses[pose.id];
      const where = `${avatarId}/${pose.id}`;
      if (!tracked?.detected) {
        if (expect.info) rows.push(line('INFO', where, 'kein Gesicht erkannt'));
        else failures.push(`${where}: no face detected`);
        continue;
      }
      const notes = [];
      let status = 'OK';
      const raise = (next) => {
        if (SEVERITY.indexOf(next) > SEVERITY.indexOf(status)) status = next;
      };
      if (expect.head) {
        for (const axis of ['yaw', 'pitch', 'roll']) {
          const got = tracked.sample.headDeg[axis] - neutral.sample.headDeg[axis];
          const want = expect.head[axis] ?? 0;
          if (Math.abs(got - want) > HEAD_TOLERANCE_DEG) raise('FAIL');
          notes.push(`${axis} ${got.toFixed(1)}° (soll ${want}°)`);
        }
      }
      if (expect.dominant) {
        const [hi, lo] = expect.dominant;
        const a = tracked.sample.face[hi];
        const b = tracked.sample.face[lo];
        if (Math.max(a, b) < VISIBLE_MIN) raise('WEAK');
        else if (b - a >= DOMINANCE_MIN) raise('FAIL');
        else if (a - b < DOMINANCE_MIN) raise('WEAK');
        notes.push(`${hi} ${a.toFixed(2)} vs ${lo} ${b.toFixed(2)}`);
      }
      for (const [key, axis] of [
        ['gazeX', 'x'],
        ['gazeY', 'y'],
      ]) {
        if (!expect[key]) continue;
        const eyeDeg = tracked.applied.leftEyeRotationDeg;
        const dl = tracked.sample.eyeLeft[axis] - neutral.sample.eyeLeft[axis];
        const dr = tracked.sample.eyeRight[axis] - neutral.sample.eyeRight[axis];
        notes.push(`Δ${axis} L ${fmt(dl)} R ${fmt(dr)} (Auge ${eyeDeg ?? 'n/a'}°)`);
        if (eyeDeg === null || eyeDeg < GAZE_MIN_EYE_DEG) {
          raise('SKIP');
          continue;
        }
        const along = (d) => Math.sign(d) === expect[key] && Math.abs(d) >= GAZE_MIN;
        const against = (d) => Math.sign(d) === -expect[key] && Math.abs(d) >= GAZE_MIN;
        if (against(dl) || against(dr)) raise('FAIL');
        else if (!along(dl) || !along(dr)) raise('WEAK');
      }
      if (expect.rises) {
        const got = tracked.sample.face[expect.rises] - neutral.sample.face[expect.rises];
        if (got < RISE_MIN) raise('WEAK');
        notes.push(`Δ${expect.rises} ${fmt(got)}`);
      }
      const text = notes.join(' · ');
      rows.push(line(expect.info ? `INFO:${status}` : status, where, text));
      if (expect.info) continue;
      if (status === 'FAIL') failures.push(`${where}: ${text}`);
      if (status === 'WEAK') assetWeak.push(`${where}: ${text}`);
    }
  }
  return { rows, failures, assetWeak };
}

/**
 * Tracker reading of each untouched avatar + the app camera's elevation vs. the eye line.
 * BIAS = the tracker reads a neutral face as turned; uncalibrated, that offset drives the avatar
 * (calibration step 1 subtracts it). Never gating.
 */
export function evaluateNeutral(report) {
  const rows = [];
  for (const [avatarId, entry] of Object.entries(report.avatars)) {
    const n = entry.poses.neutral;
    const where = `${avatarId}/neutral`;
    if (!n?.detected) {
      rows.push(line('SKIP', where, 'kein Gesicht erkannt'));
      continue;
    }
    const h = n.sample.headDeg;
    const gx = (n.sample.eyeLeft.x + n.sample.eyeRight.x) / 2;
    const gy = (n.sample.eyeLeft.y + n.sample.eyeRight.y) / 2;
    const neutral =
      Math.max(Math.abs(h.yaw), Math.abs(h.pitch), Math.abs(h.roll)) <= NEUTRAL_HEAD_MAX_DEG &&
      Math.max(Math.abs(gx), Math.abs(gy)) <= NEUTRAL_GAZE_MAX;
    const cam = entry.appFramingEyeElevationDeg ?? {};
    rows.push(
      line(
        neutral ? 'OK' : 'BIAS',
        where,
        `Tracker: Kopf yaw ${h.yaw}° pitch ${h.pitch}° roll ${h.roll}° · Blick x ${fmt(gx)} y ${fmt(gy)} · ` +
          `angewandt lookAt ${n.applied.lookAtYawDeg ?? 'n/a'}°/${n.applied.lookAtPitchDeg ?? 'n/a'}° · ` +
          `App-Kamera ggü. Augenlinie: full ${cam.full}°, portrait ${cam.portrait}°, face ${cam.face}° · ` +
          `MediaPipe ${n.categoryCount} Kategorien, tongueOut ${n.hasTongueOut ? 'ja' : 'nein'}`,
      ),
    );
  }
  return { rows };
}

function describeRaw(raw) {
  const face = Object.keys(raw.face ?? {});
  if (face.length) return face.join('+');
  return Object.entries(raw)
    .filter(([key]) => key !== 'face')
    .map(([key, value]) => `${key} ${fmt(value)}`)
    .join(' ');
}

function describeMapped(action, result) {
  if (action.raw.face) return result.mapped.join('+') || '—';
  if ('headYaw' in action.raw || 'headPitch' in action.raw || 'headRoll' in action.raw) {
    const { yaw, pitch, roll } = result.mappedHead;
    return `head yaw ${fmt(yaw)} pitch ${fmt(pitch)} roll ${fmt(roll)}`;
  }
  return `gaze x ${fmt(result.mappedGaze.x)} y ${fmt(result.mappedGaze.y)}`;
}

/**
 * App orientation must put every action on the PiP's side (FAIL otherwise). The anatomical copy
 * shows the asset's own convention: a morph on the wrong side of the avatar is ASSET (reported,
 * not gating — the runtime must not special-case assets).
 */
export function evaluateLrChain(report) {
  const rows = [];
  const failures = [];
  const assetSide = [];
  const app = report.appMirrorsAvatar ? 'mirrored' : 'anatomical';
  const other = app === 'mirrored' ? 'anatomical' : 'mirrored';
  for (const [avatarId, entry] of Object.entries(report.avatars)) {
    for (const action of LR_ACTIONS) {
      const chain = entry.lrChain?.[action.id];
      if (!chain) continue;
      const where = `${avatarId}/${action.id}`;
      const res = chain[app];
      const anatomicalSide = chain.anatomical.avatarSide;
      const assetSideWrong = Boolean(action.side && anatomicalSide && anatomicalSide !== action.side);
      let status = res.screen === null ? 'SKIP' : res.screen === action.pip ? 'OK' : 'FAIL';
      if (assetSideWrong) status = 'ASSET';
      const text = [
        `RAW ${describeRaw(action.raw)}`,
        `MAPPED ${describeMapped(action, res)}`,
        res.applied.length ? `APPLIED ${res.applied.join('+')}` : null,
        res.morphs.length ? `Morph ${res.morphs.join(', ')}` : null,
        `→ Bildschirm ${res.screen ?? '—'} (PiP ${action.pip})`,
        action.side ? `anatomische Kopie: ${anatomicalSide ?? '—'} (soll ${action.side})` : null,
        `${other}: Bildschirm ${chain[other].screen ?? '—'}`,
        assetSideWrong ? 'ASSET-SEITE FALSCH' : null,
      ]
        .filter(Boolean)
        .join(' · ');
      rows.push(line(status, where, text));
      if (status === 'FAIL') failures.push(`${where}: ${text}`);
      if (status === 'ASSET') assetSide.push(`${where}: ${text}`);
    }
  }
  return { rows, failures, assetSide };
}

const CLASS_LABEL = {
  good: 'gut',
  weakDetect: 'schwach erkannt',
  notDetected: 'nicht erkannt',
  morphWeak: 'Morph schwach',
  noMorph: 'kein Morph',
  lookAt: 'via LookAt',
  na: 'n/a',
};
const TRACKABLE = new Set(['good', 'weakDetect', 'notDetected']);

function classifyChannel(entry) {
  if (!entry) return 'na';
  if (entry.viaLookAt) return 'lookAt';
  if (!entry.expressions.length) return 'noMorph';
  if (entry.maxDeltaMm < MORPH_VISIBLE_MM) return 'morphWeak';
  if (!entry.tracked?.detected) return 'na';
  if (entry.tracked.delta >= TRACK_GOOD) return 'good';
  if (entry.tracked.delta >= TRACK_WEAK) return 'weakDetect';
  return 'notDetected';
}

/**
 * Hypothesis for one channel (render proxy; the webcam test confirms). Only avatars on which the
 * tracker reads blink or jawOpen at all count as tracking proxies.
 */
function channelHint(per, candidateId) {
  const cand = per[candidateId];
  if (cand?.flags.length) return `Flags: ${cand.flags.join(', ')}`;
  if (cand && (cand.cls === 'noMorph' || cand.cls === 'morphWeak')) return 'Kandidat: Morph fehlt/schwach';
  const trackable = Object.values(per).filter((p) => p.proxy && TRACKABLE.has(p.cls));
  if (!trackable.length) return '';
  if (trackable.every((p) => p.cls === 'notDetected')) return 'Tracker sieht den Morph auf keinem Proxy → Tracking schwach?';
  if (cand?.proxy && cand.cls !== 'good' && trackable.some((p) => p.cls === 'good')) return 'Kandidat liest sich schwächer';
  if (cand?.cls === 'good') return 'Morph + Proxy gut → Webcam-Kette prüfen';
  return '';
}

/** Avatars whose renders the tracker reads at all (blink or jawOpen clearly detected). */
function trackingProxies(report) {
  return new Set(
    Object.entries(report.avatars)
      .filter(([, entry]) =>
        ['eyeBlinkLeft', 'jawOpen'].some((ch) => classifyChannel(entry.channelAudit?.channels?.[ch]) === 'good'),
      )
      .map(([id]) => id),
  );
}

/** Per-channel class per avatar (tracker Δ on the render / morph displacement). */
export function summarizeChannelAudit(report, candidateId) {
  const avatarIds = Object.keys(report.avatars);
  const proxies = trackingProxies(report);
  const first = report.avatars[avatarIds[0]]?.channelAudit?.channels ?? {};
  const header = `  ${'Kanal'.padEnd(20)} ${avatarIds
    .map((id) => `${id}${proxies.has(id) ? '' : ' (kein Proxy)'}`.padEnd(30))
    .join(' ')} Hinweis`;
  const rows = [];
  const classes = {};
  for (const channel of Object.keys(first)) {
    const per = {};
    for (const id of avatarIds) {
      const entry = report.avatars[id].channelAudit?.channels?.[channel];
      per[id] = {
        cls: classifyChannel(entry),
        delta: entry?.tracked?.delta ?? null,
        mm: entry?.maxDeltaMm ?? 0,
        flags: entry?.flags ?? [],
        proxy: proxies.has(id),
      };
    }
    const hint = channelHint(per, candidateId);
    classes[channel] = { ...per, hint };
    const cells = avatarIds.map((id) => {
      const p = per[id];
      const numbers = TRACKABLE.has(p.cls) ? ` Δ${fmt(p.delta)} ${p.mm}mm` : p.cls === 'morphWeak' ? ` ${p.mm}mm` : '';
      return `${CLASS_LABEL[p.cls]}${numbers}`.padEnd(30);
    });
    rows.push(`${LIP_FOCUS.includes(channel) ? '*' : ' '} ${channel.padEnd(20)} ${cells.join(' ')} ${hint}`);
  }
  return { header, rows, classes };
}

export function summarizeStageTransfer(report) {
  const s = report.stageTransfer;
  if (!s) return [];
  const amplitudes = Object.entries(s.sineAmplitudeRatio)
    .map(([hz, ratio]) => `${hz} ${Math.round(ratio * 100)} %`)
    .join(', ');
  return [`Glättung α ${s.smoothAlpha} @ ${s.fps} fps: Amplitude ${amplitudes} · 90 %-Sprungantwort ${s.step90Ms} ms`];
}
