/**
 * liveact-hybrid-face-solve — frame-local hybrid mouth/cheek/nose solver (#447).
 * Location: src/domains/character/liveact/liveact-hybrid-face-solve.ts
 *
 * Fuses semantic ARKit-style channels with #445 dense features.
 * No temporal state. No actor calibration. No gaze. No Gain-4.
 */

import type { LiveActDenseFaceFeaturesV1 } from './liveact-dense-face-features-contract';
import type { LiveActFaceChannelPartial } from './liveact-face-contract';
import {
  LIVEACT_HYBRID_FACE_CONTRACT,
  LIVEACT_HYBRID_FACE_CONTROL_IDS,
  createEmptyHybridFace,
  type LiveActHybridControlResultV1,
  type LiveActHybridControlsV1,
  type LiveActHybridFaceControlId,
  type LiveActHybridFaceV1,
} from './liveact-hybrid-face-contract';
import {
  clamp01,
  combineDenseEvidence,
  denseActivationFromSigned,
  denseScalar,
  fuseSemanticDense,
  readSemantic,
} from './liveact-hybrid-face-fusion';

export interface SolveHybridFaceInput {
  readonly semanticFace: LiveActFaceChannelPartial;
  readonly dense: LiveActDenseFaceFeaturesV1 | null;
  readonly sequence: number;
  readonly timestampMs: number;
  /** Dense frame sequence that must match `sequence` when present. */
  readonly denseSequence?: number | null;
}

function ctrl(
  map: Record<LiveActHybridFaceControlId, LiveActHybridControlResultV1>,
  id: LiveActHybridFaceControlId,
  result: LiveActHybridControlResultV1,
): void {
  map[id] = result;
}

/**
 * Solve hybrid face controls for one frame.
 * When dense is missing / not ok / sequence mismatch → exact semantic passthrough.
 */
export function solveHybridFace(input: SolveHybridFaceInput): LiveActHybridFaceV1 {
  const empty = createEmptyHybridFace({
    sequence: input.sequence,
    timestampMs: input.timestampMs,
  });

  const dense = input.dense;
  const denseSeq =
    typeof input.denseSequence === 'number' ? input.denseSequence : dense?.sequence;
  const aligned =
    dense !== null &&
    dense.presence &&
    dense.normalizationStatus === 'ok' &&
    denseSeq === input.sequence;

  const controls = {} as Record<LiveActHybridFaceControlId, LiveActHybridControlResultV1>;

  // Exact semantic fallback for all hybrid ids when dense unusable
  if (!aligned || !dense) {
    for (const id of LIVEACT_HYBRID_FACE_CONTROL_IDS) {
      ctrl(controls, id, fuseSemanticDense({
        semantic: readSemantic(input.semanticFace, id),
        denseEvidence: null,
        denseConfidence: 0,
      }));
    }
    return {
      contractVersion: LIVEACT_HYBRID_FACE_CONTRACT,
      sequence: input.sequence,
      timestampMs: input.timestampMs,
      presence: Object.values(controls).some((c) => c.value !== null),
      denseSequenceAligned: false,
      controls: controls as LiveActHybridControlsV1,
    };
  }

  const lips = dense.lips;
  const cheeks = dense.cheeks;
  const nose = dense.nose;
  const jaw = dense.jaw;

  // --- Smile L/R ---
  const cornerL = denseScalar(lips.cornerLeft);
  const cornerR = denseScalar(lips.cornerRight);
  const curv = denseScalar(lips.curvature);
  const raiseL = denseScalar(cheeks.raiseLeft);
  const raiseR = denseScalar(cheeks.raiseRight);

  // Curvature is bilateral — only reinforce a side when that side's corner/raise is active
  // (prevents unilateral smile from leaking into the opposite smile channel).
  const cornerActL = denseActivationFromSigned(cornerL.value, cornerL.available);
  const cornerActR = denseActivationFromSigned(cornerR.value, cornerR.available);
  const sideActive = (cornerAct: number | null, raise: typeof raiseL) =>
    (cornerAct !== null && cornerAct > 0.08) ||
    (raise.available && (raise.value ?? 0) > 0.08);
  const smileDenseL = combineDenseEvidence(
    [
      {
        available: cornerL.available,
        value: cornerActL,
        confidence: cornerL.confidence,
      },
      {
        available: raiseL.available,
        value: raiseL.available && raiseL.value !== null ? clamp01(raiseL.value) : null,
        confidence: raiseL.confidence,
      },
      {
        available: curv.available && sideActive(cornerActL, raiseL),
        value: denseActivationFromSigned(curv.value, curv.available),
        confidence: curv.confidence * 0.55,
      },
    ],
    'mean',
  );
  const smileDenseR = combineDenseEvidence(
    [
      {
        available: cornerR.available,
        value: cornerActR,
        confidence: cornerR.confidence,
      },
      {
        available: raiseR.available,
        value: raiseR.available && raiseR.value !== null ? clamp01(raiseR.value) : null,
        confidence: raiseR.confidence,
      },
      {
        available: curv.available && sideActive(cornerActR, raiseR),
        value: denseActivationFromSigned(curv.value, curv.available),
        confidence: curv.confidence * 0.55,
      },
    ],
    'mean',
  );

  ctrl(
    controls,
    'mouthSmileLeft',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthSmileLeft'),
      denseEvidence: smileDenseL.value,
      denseConfidence: smileDenseL.confidence,
      allowDenseOnly: true,
    }),
  );
  ctrl(
    controls,
    'mouthSmileRight',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthSmileRight'),
      denseEvidence: smileDenseR.value,
      denseConfidence: smileDenseR.confidence,
      allowDenseOnly: true,
    }),
  );

  // --- Pucker / Funnel (keep distinct) ---
  const width = denseScalar(lips.width);
  const protrude = denseScalar(lips.protrusion);
  const compress = denseScalar(lips.compression);
  // Pucker: narrow + protrusive + compression (width is differential via compression/protrusion)
  // Do NOT map absolute lipWidth alone (needs #449). Use compression+protrusion + inverse gap.
  const gapC = denseScalar(lips.gapCenter);
  // Pucker: protrusion + compression are primary. Inverse-gap alone is NOT pucker
  // (closed mouth would false-trigger). Gate inverse-gap on protrusive evidence.
  const puckerGate =
    (protrude.available && (protrude.value ?? 0) > 0.12) ||
    (compress.available && (compress.value ?? 0) > 0.12);
  const puckerDense = combineDenseEvidence(
    [
      {
        available: protrude.available,
        value: protrude.value !== null ? clamp01(protrude.value) : null,
        confidence: protrude.confidence,
      },
      {
        available: compress.available,
        value: compress.value !== null ? clamp01(compress.value) : null,
        confidence: compress.confidence,
      },
      {
        available: puckerGate && gapC.available && gapC.value !== null,
        value: gapC.value !== null ? clamp01(1 - gapC.value) : null,
        confidence: gapC.confidence * 0.45,
      },
    ],
    'mean',
  );
  // Funnel: opening + forward — requires gap and/or protrusion; not inverse-compression alone
  const funnelGate =
    (gapC.available && (gapC.value ?? 0) > 0.08) ||
    (protrude.available && (protrude.value ?? 0) > 0.12);
  const funnelDense = combineDenseEvidence(
    [
      {
        available: funnelGate && protrude.available,
        value: protrude.value !== null ? clamp01(protrude.value * 0.9) : null,
        confidence: protrude.confidence,
      },
      {
        available: funnelGate && gapC.available,
        value: gapC.value !== null ? clamp01(gapC.value) : null,
        confidence: gapC.confidence,
      },
    ],
    'mean',
  );

  ctrl(
    controls,
    'mouthPucker',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthPucker'),
      denseEvidence: puckerDense.value,
      denseConfidence: puckerDense.confidence,
    }),
  );
  ctrl(
    controls,
    'mouthFunnel',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthFunnel'),
      denseEvidence: funnelDense.value,
      denseConfidence: funnelDense.confidence,
    }),
  );

  // --- Press L/R: side gap when available; compression is global → semantic L/R authority ---
  const gapL = denseScalar(lips.gapLeft);
  const gapR = denseScalar(lips.gapRight);
  const pressDenseL = combineDenseEvidence(
    [
      {
        available: compress.available,
        value: compress.value,
        confidence: compress.confidence * 0.55,
      },
      {
        available: gapL.available && gapL.value !== null,
        value: gapL.value !== null ? clamp01(1 - gapL.value) : null,
        confidence: gapL.confidence,
      },
    ],
    'mean',
  );
  const pressDenseR = combineDenseEvidence(
    [
      {
        available: compress.available,
        value: compress.value,
        confidence: compress.confidence * 0.55,
      },
      {
        available: gapR.available && gapR.value !== null,
        value: gapR.value !== null ? clamp01(1 - gapR.value) : null,
        confidence: gapR.confidence,
      },
    ],
    'mean',
  );
  ctrl(
    controls,
    'mouthPressLeft',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthPressLeft'),
      denseEvidence: pressDenseL.value,
      denseConfidence: pressDenseL.confidence,
    }),
  );
  ctrl(
    controls,
    'mouthPressRight',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthPressRight'),
      denseEvidence: pressDenseR.value,
      denseConfidence: pressDenseR.confidence,
    }),
  );

  // --- Roll upper/lower: contour + gap; semantic-first if contour weak ---
  const upperConf = lips.upperContour.available ? lips.upperContour.confidence : 0;
  const lowerConf = lips.lowerContour.available ? lips.lowerContour.confidence : 0;
  const rollUpperDense =
    lips.upperContour.available && compress.available
      ? {
          value: clamp01(((compress.value ?? 0) + (gapC.available ? 1 - (gapC.value ?? 0) : 0)) / 2),
          confidence: clamp01(0.5 * upperConf + 0.5 * compress.confidence),
        }
      : { value: null as number | null, confidence: 0 };
  const rollLowerDense =
    lips.lowerContour.available && compress.available
      ? {
          value: clamp01(((compress.value ?? 0) + (gapC.available ? 1 - (gapC.value ?? 0) : 0)) / 2),
          confidence: clamp01(0.5 * lowerConf + 0.5 * compress.confidence),
        }
      : { value: null as number | null, confidence: 0 };

  ctrl(
    controls,
    'mouthRollUpper',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthRollUpper'),
      denseEvidence: rollUpperDense.value,
      denseConfidence: rollUpperDense.confidence,
    }),
  );
  ctrl(
    controls,
    'mouthRollLower',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthRollLower'),
      denseEvidence: rollLowerDense.value,
      denseConfidence: rollLowerDense.confidence,
    }),
  );

  // --- Upper / Lower lip L/R from contour stations + gaps ---
  const upperStations = lips.upperContour.stations;
  const lowerStations = lips.lowerContour.stations;
  const stationAct = (
    stations: typeof upperStations,
    index: number,
    conf: number,
  ): { value: number | null; confidence: number } => {
    if (!stations) return { value: null, confidence: 0 };
    const s = stations[index];
    if (!s || !s.available || s.value === null) return { value: null, confidence: 0 };
    // Positive station Y → raise; use abs soft activation
    return {
      value: clamp01(Math.abs(s.value) * 2),
      confidence: clamp01(Math.min(conf, s.confidence)),
    };
  };
  const upL = stationAct(upperStations, 1, upperConf);
  const upR = stationAct(upperStations, 3, upperConf);
  const lowL = stationAct(lowerStations, 1, lowerConf);
  const lowR = stationAct(lowerStations, 3, lowerConf);

  ctrl(
    controls,
    'mouthUpperUpLeft',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthUpperUpLeft'),
      denseEvidence: upL.value,
      denseConfidence: upL.confidence,
    }),
  );
  ctrl(
    controls,
    'mouthUpperUpRight',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthUpperUpRight'),
      denseEvidence: upR.value,
      denseConfidence: upR.confidence,
    }),
  );
  ctrl(
    controls,
    'mouthLowerDownLeft',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthLowerDownLeft'),
      denseEvidence: lowL.value,
      denseConfidence: lowL.confidence,
    }),
  );
  ctrl(
    controls,
    'mouthLowerDownRight',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'mouthLowerDownRight'),
      denseEvidence: lowR.value,
      denseConfidence: lowR.confidence,
    }),
  );

  // --- Cheeks ---
  const compL = denseScalar(cheeks.compressionLeft);
  const compR = denseScalar(cheeks.compressionRight);
  const volL = denseScalar(cheeks.volumeProxyLeft);
  const volR = denseScalar(cheeks.volumeProxyRight);

  ctrl(
    controls,
    'cheekSquintLeft',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'cheekSquintLeft'),
      denseEvidence: combineDenseEvidence(
        [
          {
            available: raiseL.available,
            value: raiseL.value !== null ? clamp01(raiseL.value) : null,
            confidence: raiseL.confidence,
          },
          {
            available: compL.available,
            value: compL.value !== null ? clamp01(compL.value) : null,
            confidence: compL.confidence * 0.7,
          },
        ],
        'mean',
      ).value,
      denseConfidence: Math.max(raiseL.confidence, compL.confidence * 0.7),
    }),
  );
  ctrl(
    controls,
    'cheekSquintRight',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'cheekSquintRight'),
      denseEvidence: combineDenseEvidence(
        [
          {
            available: raiseR.available,
            value: raiseR.value !== null ? clamp01(raiseR.value) : null,
            confidence: raiseR.confidence,
          },
          {
            available: compR.available,
            value: compR.value !== null ? clamp01(compR.value) : null,
            confidence: compR.confidence * 0.7,
          },
        ],
        'mean',
      ).value,
      denseConfidence: Math.max(raiseR.confidence, compR.confidence * 0.7),
    }),
  );

  const puffDense = combineDenseEvidence(
    [
      {
        available: volL.available || volR.available,
        value: clamp01(((volL.value ?? 0) + (volR.value ?? 0)) / 2),
        confidence: clamp01((volL.confidence + volR.confidence) / 2),
      },
      {
        available: compL.available || compR.available,
        value: clamp01(((compL.value ?? 0) + (compR.value ?? 0)) / 2),
        confidence: clamp01((compL.confidence + compR.confidence) / 2) * 0.6,
      },
    ],
    'mean',
  );
  ctrl(
    controls,
    'cheekPuff',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'cheekPuff'),
      denseEvidence: puffDense.value,
      denseConfidence: puffDense.confidence,
    }),
  );

  // --- Nose sneer L/R (nasolabial fold intensity → #450; only refine sneer) ---
  const alarL = denseScalar(nose.alarLeft);
  const alarR = denseScalar(nose.alarRight);
  const nlL = denseScalar(nose.nasolabialLeft);
  const nlR = denseScalar(nose.nasolabialRight);

  ctrl(
    controls,
    'noseSneerLeft',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'noseSneerLeft'),
      denseEvidence: combineDenseEvidence(
        [
          {
            available: alarL.available,
            value: alarL.value !== null ? clamp01(alarL.value) : null,
            confidence: alarL.confidence,
          },
          {
            available: nlL.available,
            value: nlL.value !== null ? clamp01(nlL.value) : null,
            confidence: nlL.confidence * 0.8,
          },
        ],
        'mean',
      ).value,
      denseConfidence: Math.max(alarL.confidence, nlL.confidence * 0.8),
    }),
  );
  ctrl(
    controls,
    'noseSneerRight',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'noseSneerRight'),
      denseEvidence: combineDenseEvidence(
        [
          {
            available: alarR.available,
            value: alarR.value !== null ? clamp01(alarR.value) : null,
            confidence: alarR.confidence,
          },
          {
            available: nlR.available,
            value: nlR.value !== null ? clamp01(nlR.value) : null,
            confidence: nlR.confidence * 0.8,
          },
        ],
        'mean',
      ).value,
      denseConfidence: Math.max(alarR.confidence, nlR.confidence * 0.8),
    }),
  );

  // --- Jaw ---
  const chinDrop = denseScalar(jaw.chinDrop);
  const chinFwd = denseScalar(jaw.chinForward);
  const jawOpenDense = combineDenseEvidence(
    [
      {
        available: chinDrop.available,
        value: chinDrop.value !== null ? clamp01(chinDrop.value) : null,
        confidence: chinDrop.confidence,
      },
      {
        available: gapC.available,
        value: gapC.value !== null ? clamp01(gapC.value) : null,
        confidence: gapC.confidence,
      },
    ],
    'mean',
  );
  ctrl(
    controls,
    'jawOpen',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'jawOpen'),
      denseEvidence: jawOpenDense.value,
      denseConfidence: jawOpenDense.confidence,
    }),
  );
  ctrl(
    controls,
    'jawForward',
    fuseSemanticDense({
      semantic: readSemantic(input.semanticFace, 'jawForward'),
      denseEvidence:
        chinFwd.available && chinFwd.value !== null ? clamp01(chinFwd.value) : null,
      denseConfidence: chinFwd.confidence,
    }),
  );

  void width;
  void empty;

  return {
    contractVersion: LIVEACT_HYBRID_FACE_CONTRACT,
    sequence: input.sequence,
    timestampMs: input.timestampMs,
    presence: true,
    denseSequenceAligned: true,
    controls: controls as LiveActHybridControlsV1,
  };
}

/**
 * Apply hybrid face values onto a semantic face partial.
 * Non-hybrid channels unchanged. Hybrid null → keep semantic.
 */
export function applyHybridFaceToSemantic(
  semanticFace: LiveActFaceChannelPartial,
  hybrid: LiveActHybridFaceV1,
): LiveActFaceChannelPartial {
  const out: Record<string, number> = { ...semanticFace };
  for (const id of LIVEACT_HYBRID_FACE_CONTROL_IDS) {
    const c = hybrid.controls[id];
    if (c.value !== null && Number.isFinite(c.value)) {
      out[id] = c.value;
    }
  }
  return out;
}
