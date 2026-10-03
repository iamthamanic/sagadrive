/**
 * liveact-dense-face-features-contour-metric — feature-level lip contour error (#445 / #444).
 * Location: src/domains/character/liveact/liveact-dense-face-features-contour-metric.ts
 *
 * Enables contour metrics from Dense Features (NOT end-to-end avatar lip contour fidelity).
 * Reuses #444 Perfect Fidelity evaluators; does not invent new targets.
 */

import type { LiveActDenseFaceFeaturesV1 } from './liveact-dense-face-features-contract';
import type { LiveActFidelityMetricResultV1 } from './liveact-perfect-fidelity-contract';
import { evaluateFidelityContour } from './liveact-perfect-fidelity-evaluate';

/**
 * Compare two dense frames' lip contour stations (feature-level).
 * Returns #444-compatible metric results when both contours available.
 */
export function evaluateDenseFeatureLipContour(input: {
  reference: LiveActDenseFaceFeaturesV1;
  measured: LiveActDenseFaceFeaturesV1;
}): {
  measurable: boolean;
  median: LiveActFidelityMetricResultV1 | null;
  p95: LiveActFidelityMetricResultV1 | null;
  mouthWidth: number | null;
} {
  const ref = input.reference.lips.upperContour;
  const meas = input.measured.lips.upperContour;
  const width =
    input.reference.lips.width.available && input.reference.lips.width.value !== null
      ? input.reference.lips.width.value
      : input.measured.lips.width.available && input.measured.lips.width.value !== null
        ? input.measured.lips.width.value
        : null;

  if (
    !ref.available ||
    !meas.available ||
    !ref.stations ||
    !meas.stations ||
    width === null ||
    width <= 1e-9
  ) {
    return {
      measurable: false,
      median: null,
      p95: null,
      mouthWidth: width,
    };
  }

  const errors: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    const a = ref.stations[i];
    const b = meas.stations[i];
    if (!a?.available || !b?.available || a.value === null || b.value === null) continue;
    errors.push(Math.abs(a.value - b.value));
  }

  const refL = input.reference.lips.lowerContour;
  const measL = input.measured.lips.lowerContour;
  if (refL.available && measL.available && refL.stations && measL.stations) {
    for (let i = 0; i < 5; i += 1) {
      const a = refL.stations[i];
      const b = measL.stations[i];
      if (!a?.available || !b?.available || a.value === null || b.value === null) continue;
      errors.push(Math.abs(a.value - b.value));
    }
  }

  if (errors.length === 0) {
    return { measurable: false, median: null, p95: null, mouthWidth: width };
  }

  const [median, p95] = evaluateFidelityContour(errors, width);
  return {
    measurable: median !== undefined && median.status !== 'NOT_MEASURED',
    median: median ?? null,
    p95: p95 ?? null,
    mouthWidth: width,
  };
}
