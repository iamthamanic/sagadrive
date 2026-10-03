/**
 * liveact-dense-face-features-fixtures — deterministic synthetic semantic geometry (#445).
 * Location: src/domains/character/liveact/liveact-dense-face-features-fixtures.ts
 *
 * Named semantic points only — not raw provider landmark arrays. No biometric capture.
 */

import {
  DENSE_SEMANTIC_POINT_IDS,
  LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
  type DenseSemanticGeometryV1,
  type DenseSemanticPoint3,
  type DenseSemanticPointId,
} from './liveact-dense-face-features-contract';

export const LIVEACT_DENSE_FIXTURE_IDS = [
  'canonical-neutral',
  'mouth-open',
  'smile-left',
  'smile-right',
  'pucker-compression',
  'eye-close-left',
  'eye-close-right',
  'eyes-both-closed',
  'brow-inner-raise',
  'brow-outer-left',
  'cheek-raise-left',
  'nose-nasolabial',
  'chin-drop',
  'rigid-translated',
  'rigid-scaled',
  'rigid-yaw',
  'rigid-pitch',
  'rigid-roll',
  'partial-missing-mouth',
  'degenerate-scale',
] as const;

export type LiveActDenseFixtureId = (typeof LIVEACT_DENSE_FIXTURE_IDS)[number];

function pt(x: number, y: number, z: number): DenseSemanticPoint3 {
  return { available: true, x, y, z };
}

function missing(): DenseSemanticPoint3 {
  return { available: false, x: Number.NaN, y: Number.NaN, z: Number.NaN };
}

/** Canonical upright face in a simple local metre-ish space (synthetic). */
export function buildCanonicalNeutralGeometry(
  faceConfidence = 1,
): DenseSemanticGeometryV1 {
  const points = {
    // Eyes: anatomical left at +X in this synthetic (matches domain +X = anatomical left)
    eyeOuterLeft: pt(0.55, 0.2, 0.05),
    eyeInnerLeft: pt(0.25, 0.2, 0.08),
    eyeUpperLeft: pt(0.4, 0.28, 0.06),
    eyeLowerLeft: pt(0.4, 0.12, 0.06),
    eyeOuterRight: pt(-0.55, 0.2, 0.05),
    eyeInnerRight: pt(-0.25, 0.2, 0.08),
    eyeUpperRight: pt(-0.4, 0.28, 0.06),
    eyeLowerRight: pt(-0.4, 0.12, 0.06),
    browInnerLeft: pt(0.22, 0.42, 0.04),
    browMidLeft: pt(0.4, 0.44, 0.03),
    browOuterLeft: pt(0.58, 0.4, 0.02),
    browInnerRight: pt(-0.22, 0.42, 0.04),
    browMidRight: pt(-0.4, 0.44, 0.03),
    browOuterRight: pt(-0.58, 0.4, 0.02),
    mouthCornerLeft: pt(0.32, -0.35, 0.12),
    mouthCornerRight: pt(-0.32, -0.35, 0.12),
    lipUpperOuterLeft: pt(0.28, -0.28, 0.14),
    lipUpperInnerLeft: pt(0.14, -0.26, 0.15),
    lipUpperCenter: pt(0, -0.25, 0.16),
    lipUpperInnerRight: pt(-0.14, -0.26, 0.15),
    lipUpperOuterRight: pt(-0.28, -0.28, 0.14),
    lipLowerOuterLeft: pt(0.28, -0.42, 0.13),
    lipLowerInnerLeft: pt(0.14, -0.44, 0.14),
    lipLowerCenter: pt(0, -0.45, 0.15),
    lipLowerInnerRight: pt(-0.14, -0.44, 0.14),
    lipLowerOuterRight: pt(-0.28, -0.42, 0.13),
    noseTip: pt(0, -0.05, 0.28),
    noseBridge: pt(0, 0.1, 0.18),
    noseAlarLeft: pt(0.12, -0.08, 0.2),
    noseAlarRight: pt(-0.12, -0.08, 0.2),
    cheekLeft: pt(0.45, -0.05, 0.1),
    cheekRight: pt(-0.45, -0.05, 0.1),
    nasolabialLeft: pt(0.18, -0.18, 0.14),
    nasolabialRight: pt(-0.18, -0.18, 0.14),
    chin: pt(0, -0.7, 0.1),
    jawLeft: pt(0.5, -0.55, 0.05),
    jawRight: pt(-0.5, -0.55, 0.05),
    forehead: pt(0, 0.65, 0.02),
  } as const satisfies Record<DenseSemanticPointId, DenseSemanticPoint3>;

  return {
    contractVersion: LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
    points,
    faceConfidence,
  };
}

function clonePoints(
  geometry: DenseSemanticGeometryV1,
): Record<DenseSemanticPointId, DenseSemanticPoint3> {
  const out = {} as Record<DenseSemanticPointId, DenseSemanticPoint3>;
  for (const id of DENSE_SEMANTIC_POINT_IDS) {
    const p = geometry.points[id];
    out[id] = { available: p.available, x: p.x, y: p.y, z: p.z };
  }
  return out;
}

function withMutations(
  mutate: (p: Record<DenseSemanticPointId, DenseSemanticPoint3>) => void,
  faceConfidence = 1,
): DenseSemanticGeometryV1 {
  const base = buildCanonicalNeutralGeometry(faceConfidence);
  const points = clonePoints(base);
  mutate(points);
  return {
    contractVersion: LIVEACT_DENSE_SEMANTIC_GEOMETRY_CONTRACT,
    points,
    faceConfidence,
  };
}

export function fixtureMouthOpen(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.lipUpperCenter = pt(0, -0.18, 0.16);
    p.lipUpperInnerLeft = pt(0.14, -0.2, 0.15);
    p.lipUpperInnerRight = pt(-0.14, -0.2, 0.15);
    p.lipLowerCenter = pt(0, -0.62, 0.15);
    p.lipLowerInnerLeft = pt(0.14, -0.58, 0.14);
    p.lipLowerInnerRight = pt(-0.14, -0.58, 0.14);
    p.chin = pt(0, -0.85, 0.1);
  });
}

export function fixtureSmileLeft(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.mouthCornerLeft = pt(0.38, -0.22, 0.12);
    p.lipUpperOuterLeft = pt(0.32, -0.2, 0.14);
    p.lipLowerOuterLeft = pt(0.32, -0.36, 0.13);
  });
}

export function fixtureSmileRight(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.mouthCornerRight = pt(-0.38, -0.22, 0.12);
    p.lipUpperOuterRight = pt(-0.32, -0.2, 0.14);
    p.lipLowerOuterRight = pt(-0.32, -0.36, 0.13);
  });
}

export function fixturePuckerCompression(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.mouthCornerLeft = pt(0.18, -0.35, 0.18);
    p.mouthCornerRight = pt(-0.18, -0.35, 0.18);
    p.lipUpperCenter = pt(0, -0.32, 0.22);
    p.lipLowerCenter = pt(0, -0.38, 0.22);
    p.lipUpperInnerLeft = pt(0.08, -0.33, 0.2);
    p.lipUpperInnerRight = pt(-0.08, -0.33, 0.2);
    p.lipLowerInnerLeft = pt(0.08, -0.37, 0.2);
    p.lipLowerInnerRight = pt(-0.08, -0.37, 0.2);
  });
}

export function fixtureEyeCloseLeft(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.eyeUpperLeft = pt(0.4, 0.2, 0.06);
    p.eyeLowerLeft = pt(0.4, 0.2, 0.06);
  });
}

export function fixtureEyeCloseRight(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.eyeUpperRight = pt(-0.4, 0.2, 0.06);
    p.eyeLowerRight = pt(-0.4, 0.2, 0.06);
  });
}

export function fixtureEyesBothClosed(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.eyeUpperLeft = pt(0.4, 0.2, 0.06);
    p.eyeLowerLeft = pt(0.4, 0.2, 0.06);
    p.eyeUpperRight = pt(-0.4, 0.2, 0.06);
    p.eyeLowerRight = pt(-0.4, 0.2, 0.06);
  });
}

export function fixtureBrowInnerRaise(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.browInnerLeft = pt(0.22, 0.55, 0.04);
    p.browInnerRight = pt(-0.22, 0.55, 0.04);
  });
}

export function fixtureBrowOuterLeft(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.browOuterLeft = pt(0.58, 0.55, 0.02);
    p.browMidLeft = pt(0.4, 0.52, 0.03);
  });
}

export function fixtureCheekRaiseLeft(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.cheekLeft = pt(0.45, 0.08, 0.14);
  });
}

export function fixtureNoseNasolabial(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.noseAlarLeft = pt(0.16, -0.1, 0.22);
    p.noseAlarRight = pt(-0.16, -0.1, 0.22);
    p.nasolabialLeft = pt(0.24, -0.22, 0.16);
    p.nasolabialRight = pt(-0.24, -0.22, 0.16);
  });
}

export function fixtureChinDrop(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.chin = pt(0, -0.95, 0.12);
    p.jawLeft = pt(0.52, -0.7, 0.05);
    p.jawRight = pt(-0.52, -0.7, 0.05);
  });
}

export function fixturePartialMissingMouth(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    p.mouthCornerLeft = missing();
    p.mouthCornerRight = missing();
    p.lipUpperCenter = missing();
    p.lipLowerCenter = missing();
  });
}

export function fixtureDegenerateScale(): DenseSemanticGeometryV1 {
  return withMutations((p) => {
    // Collapse eyes → zero interocular scale
    p.eyeOuterLeft = pt(0, 0.2, 0.05);
    p.eyeInnerLeft = pt(0, 0.2, 0.05);
    p.eyeOuterRight = pt(0, 0.2, 0.05);
    p.eyeInnerRight = pt(0, 0.2, 0.05);
  });
}

export function buildDenseFixtureGeometry(
  id: LiveActDenseFixtureId,
): DenseSemanticGeometryV1 {
  switch (id) {
    case 'canonical-neutral':
      return buildCanonicalNeutralGeometry();
    case 'mouth-open':
      return fixtureMouthOpen();
    case 'smile-left':
      return fixtureSmileLeft();
    case 'smile-right':
      return fixtureSmileRight();
    case 'pucker-compression':
      return fixturePuckerCompression();
    case 'eye-close-left':
      return fixtureEyeCloseLeft();
    case 'eye-close-right':
      return fixtureEyeCloseRight();
    case 'eyes-both-closed':
      return fixtureEyesBothClosed();
    case 'brow-inner-raise':
      return fixtureBrowInnerRaise();
    case 'brow-outer-left':
      return fixtureBrowOuterLeft();
    case 'cheek-raise-left':
      return fixtureCheekRaiseLeft();
    case 'nose-nasolabial':
      return fixtureNoseNasolabial();
    case 'chin-drop':
      return fixtureChinDrop();
    case 'rigid-translated':
    case 'rigid-scaled':
    case 'rigid-yaw':
    case 'rigid-pitch':
    case 'rigid-roll':
      return buildCanonicalNeutralGeometry();
    case 'partial-missing-mouth':
      return fixturePartialMissingMouth();
    case 'degenerate-scale':
      return fixtureDegenerateScale();
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
