/**
 * face-mapping-guide-geometry — visual-only Face Rig guide silhouettes (#visual-guides).
 * Location: src/domains/character/avatar/face-mapping-guide-geometry.ts
 *
 * Builds smooth eye/mouth closed contours and brow curves from draft screen points.
 * Pure math — no React / Three.js. Guides are metadata only (no new runtime anchors).
 */

import type { SagaDriveFaceAnchorId } from './face-anchor-contract';

export interface FaceMappingGuidePoint2 {
  readonly x: number;
  readonly y: number;
}

export const FACE_MAPPING_GUIDE_KINDS = [
  'eyeLeft',
  'eyeRight',
  'mouth',
  'browLeft',
  'browRight',
] as const;

export type FaceMappingGuideKind = (typeof FACE_MAPPING_GUIDE_KINDS)[number];

export interface FaceMappingGuidePathV1 {
  readonly kind: FaceMappingGuideKind;
  /** Closed contour (eyes / mouth) vs open curve (brows). */
  readonly closed: boolean;
  /** Densely sampled screen-space polyline for canvas stroke. */
  readonly points: readonly FaceMappingGuidePoint2[];
}

const DEFAULT_SAMPLES_PER_SEGMENT = 8;

function pick(
  screen: Partial<Record<SagaDriveFaceAnchorId, FaceMappingGuidePoint2>>,
  id: SagaDriveFaceAnchorId,
): FaceMappingGuidePoint2 | null {
  return screen[id] ?? null;
}

/** Catmull-Rom interpolate between p1→p2 with neighbors p0/p3. */
function catmullRom(
  p0: FaceMappingGuidePoint2,
  p1: FaceMappingGuidePoint2,
  p2: FaceMappingGuidePoint2,
  p3: FaceMappingGuidePoint2,
  t: number,
): FaceMappingGuidePoint2 {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/**
 * Sample a Catmull-Rom spline through control points.
 * When `closed`, wraps indices so the contour loops smoothly.
 */
export function sampleCatmullRomSpline(
  controls: readonly FaceMappingGuidePoint2[],
  options: { closed: boolean; samplesPerSegment?: number },
): FaceMappingGuidePoint2[] {
  if (controls.length < 2) return [];
  const samplesPerSegment = options.samplesPerSegment ?? DEFAULT_SAMPLES_PER_SEGMENT;
  const closed = options.closed;
  const n = controls.length;
  const out: FaceMappingGuidePoint2[] = [];

  const segmentCount = closed ? n : n - 1;
  for (let seg = 0; seg < segmentCount; seg += 1) {
    const i1 = seg;
    const i2 = (seg + 1) % n;
    const i0 = closed ? (seg - 1 + n) % n : Math.max(0, seg - 1);
    const i3 = closed ? (seg + 2) % n : Math.min(n - 1, seg + 2);
    const p0 = controls[i0];
    const p1 = controls[i1];
    const p2 = controls[i2];
    const p3 = controls[i3];
    const steps = seg === segmentCount - 1 && !closed ? samplesPerSegment : samplesPerSegment;
    for (let s = 0; s < steps; s += 1) {
      const t = s / samplesPerSegment;
      out.push(catmullRom(p0, p1, p2, p3, t));
    }
  }
  if (!closed) {
    out.push(controls[n - 1]);
  }
  return out;
}

/** Eye / mouth: four landmarks → smooth closed silhouette. */
export function buildClosedQuadGuide(
  a: FaceMappingGuidePoint2,
  b: FaceMappingGuidePoint2,
  c: FaceMappingGuidePoint2,
  d: FaceMappingGuidePoint2,
  samplesPerSegment = DEFAULT_SAMPLES_PER_SEGMENT,
): FaceMappingGuidePoint2[] {
  return sampleCatmullRomSpline([a, b, c, d], { closed: true, samplesPerSegment });
}

/** Brow: inner + center + outer → smooth open curve. */
export function buildOpenTripleGuide(
  a: FaceMappingGuidePoint2,
  b: FaceMappingGuidePoint2,
  c: FaceMappingGuidePoint2,
  samplesPerSegment = DEFAULT_SAMPLES_PER_SEGMENT,
): FaceMappingGuidePoint2[] {
  return sampleCatmullRomSpline([a, b, c], { closed: false, samplesPerSegment });
}

/**
 * Derive all available visual guide paths from projected draft anchors.
 * Nose / chin / forehead intentionally omitted (markers only).
 */
export function buildFaceMappingGuidePaths(
  screen: Partial<Record<SagaDriveFaceAnchorId, FaceMappingGuidePoint2>>,
  samplesPerSegment = DEFAULT_SAMPLES_PER_SEGMENT,
): readonly FaceMappingGuidePathV1[] {
  const paths: FaceMappingGuidePathV1[] = [];

  const eyeLeft = [
    pick(screen, 'eyeLeftInner'),
    pick(screen, 'eyeLeftUpper'),
    pick(screen, 'eyeLeftOuter'),
    pick(screen, 'eyeLeftLower'),
  ] as const;
  if (eyeLeft.every((p): p is FaceMappingGuidePoint2 => p !== null)) {
    paths.push({
      kind: 'eyeLeft',
      closed: true,
      points: buildClosedQuadGuide(
        eyeLeft[0],
        eyeLeft[1],
        eyeLeft[2],
        eyeLeft[3],
        samplesPerSegment,
      ),
    });
  }

  const eyeRight = [
    pick(screen, 'eyeRightInner'),
    pick(screen, 'eyeRightUpper'),
    pick(screen, 'eyeRightOuter'),
    pick(screen, 'eyeRightLower'),
  ] as const;
  if (eyeRight.every((p): p is FaceMappingGuidePoint2 => p !== null)) {
    paths.push({
      kind: 'eyeRight',
      closed: true,
      points: buildClosedQuadGuide(
        eyeRight[0],
        eyeRight[1],
        eyeRight[2],
        eyeRight[3],
        samplesPerSegment,
      ),
    });
  }

  const mouth = [
    pick(screen, 'mouthCornerLeft'),
    pick(screen, 'mouthUpper'),
    pick(screen, 'mouthCornerRight'),
    pick(screen, 'mouthLower'),
  ] as const;
  if (mouth.every((p): p is FaceMappingGuidePoint2 => p !== null)) {
    paths.push({
      kind: 'mouth',
      closed: true,
      points: buildClosedQuadGuide(mouth[0], mouth[1], mouth[2], mouth[3], samplesPerSegment),
    });
  }

  const browLeft = [
    pick(screen, 'browLeftInner'),
    pick(screen, 'browLeftCenter'),
    pick(screen, 'browLeftOuter'),
  ] as const;
  if (browLeft.every((p): p is FaceMappingGuidePoint2 => p !== null)) {
    paths.push({
      kind: 'browLeft',
      closed: false,
      points: buildOpenTripleGuide(browLeft[0], browLeft[1], browLeft[2], samplesPerSegment),
    });
  }

  const browRight = [
    pick(screen, 'browRightInner'),
    pick(screen, 'browRightCenter'),
    pick(screen, 'browRightOuter'),
  ] as const;
  if (browRight.every((p): p is FaceMappingGuidePoint2 => p !== null)) {
    paths.push({
      kind: 'browRight',
      closed: false,
      points: buildOpenTripleGuide(browRight[0], browRight[1], browRight[2], samplesPerSegment),
    });
  }

  return paths;
}

/** Feature / body-part group for detail card (PDF: which Körperteil). */
export function resolveFaceMappingFeatureGroupDe(anchorId: SagaDriveFaceAnchorId): string {
  if (anchorId.startsWith('eyeLeft')) return 'Linkes Auge';
  if (anchorId.startsWith('eyeRight')) return 'Rechtes Auge';
  if (anchorId.startsWith('browLeft')) return 'Linke Braue';
  if (anchorId.startsWith('browRight')) return 'Rechte Braue';
  if (anchorId.startsWith('mouth')) return 'Mund';
  return 'Gesicht';
}
