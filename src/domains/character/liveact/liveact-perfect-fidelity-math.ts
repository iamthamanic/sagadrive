/**
 * liveact-perfect-fidelity-math — pure stats for Perfect Fidelity benchmarks (#444).
 * Location: src/domains/character/liveact/liveact-perfect-fidelity-math.ts
 *
 * No external analytics deps. Deterministic float math for CI golden tests.
 */

export function fidelitySortedCopy(values: readonly number[]): number[] {
  return values.slice().sort((a, b) => a - b);
}

/** Inclusive percentile (0–100). Empty → null. */
export function fidelityPercentile(
  values: readonly number[],
  pct: number,
): number | null {
  if (values.length === 0) return null;
  const sorted = fidelitySortedCopy(values);
  if (sorted.length === 1) return sorted[0]!;
  const clamped = Math.min(100, Math.max(0, pct));
  const rank = (clamped / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo]!;
  const w = rank - lo;
  return sorted[lo]! * (1 - w) + sorted[hi]! * w;
}

export function fidelityMedian(values: readonly number[]): number | null {
  return fidelityPercentile(values, 50);
}

export function fidelityMean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Median absolute deviation from median. */
export function fidelityMad(values: readonly number[]): number | null {
  const med = fidelityMedian(values);
  if (med === null) return null;
  const abs = values.map((v) => Math.abs(v - med));
  return fidelityMedian(abs);
}

export function fidelityP95AbsDev(values: readonly number[]): number | null {
  const med = fidelityMedian(values);
  if (med === null) return null;
  const abs = values.map((v) => Math.abs(v - med));
  return fidelityPercentile(abs, 95);
}

/** Pearson r; null if degenerate (n<2 or zero variance). */
export function fidelityPearson(
  xs: readonly number[],
  ys: readonly number[],
): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += xs[i]!;
    sumY += ys[i]!;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i]! - meanX;
    const dy = ys[i]! - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX <= 0 || denY <= 0) return null;
  return num / Math.sqrt(denX * denY);
}

export interface FidelityBestLagCorrelationV1 {
  readonly correlationZeroLag: number | null;
  readonly correlationAligned: number | null;
  readonly bestLagMs: number | null;
}

/**
 * Zero-lag + best-lag Pearson within ±lagWindowMs.
 * Positive bestLagMs means output lags input (output shifted later).
 */
export function fidelityBestLagCorrelation(
  input: readonly number[],
  output: readonly number[],
  sampleRateHz: number,
  lagWindowMs: number,
): FidelityBestLagCorrelationV1 {
  const zero = fidelityPearson(input, output);
  if (sampleRateHz <= 0 || input.length < 2 || output.length < 2) {
    return { correlationZeroLag: zero, correlationAligned: zero, bestLagMs: 0 };
  }
  const maxLagSamples = Math.max(0, Math.floor((lagWindowMs / 1000) * sampleRateHz));
  let bestR = zero;
  let bestLag = 0;
  for (let lag = -maxLagSamples; lag <= maxLagSamples; lag += 1) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < input.length; i += 1) {
      const j = i + lag;
      if (j < 0 || j >= output.length) continue;
      xs.push(input[i]!);
      ys.push(output[j]!);
    }
    const r = fidelityPearson(xs, ys);
    if (r === null) continue;
    if (bestR === null || Math.abs(r) > Math.abs(bestR) || (r === bestR && Math.abs(lag) < Math.abs(bestLag))) {
      bestR = r;
      bestLag = lag;
    }
  }
  return {
    correlationZeroLag: zero,
    correlationAligned: bestR,
    bestLagMs: bestLag === null ? null : (bestLag / sampleRateHz) * 1000,
  };
}

/** First difference / dt (per-second units when timestamps are ms). */
export function fidelityFirstDerivative(
  values: readonly number[],
  timestampsMs: readonly number[],
): number[] {
  const out: number[] = [];
  const n = Math.min(values.length, timestampsMs.length);
  for (let i = 1; i < n; i += 1) {
    const dt = (timestampsMs[i]! - timestampsMs[i - 1]!) / 1000;
    if (dt <= 0) continue;
    out.push((values[i]! - values[i - 1]!) / dt);
  }
  return out;
}

export function fidelityRms(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v * v;
  return Math.sqrt(sum / values.length);
}

/**
 * Amplitude retention % using (p95 − p05) spans.
 * Returns null when input span ≈ 0 (caller → NOT_APPLICABLE).
 */
export function fidelityAmplitudeRetentionPct(
  input: readonly number[],
  output: readonly number[],
  eps = 1e-6,
): number | null {
  const inLo = fidelityPercentile(input, 5);
  const inHi = fidelityPercentile(input, 95);
  const outLo = fidelityPercentile(output, 5);
  const outHi = fidelityPercentile(output, 95);
  if (inLo === null || inHi === null || outLo === null || outHi === null) return null;
  const inSpan = inHi - inLo;
  if (Math.abs(inSpan) < eps) return null;
  const outSpan = outHi - outLo;
  return (outSpan / inSpan) * 100;
}

export function fidelityVelocityRetentionPct(
  input: readonly number[],
  output: readonly number[],
  timestampsMs: readonly number[],
  eps = 1e-6,
): number | null {
  const dIn = fidelityFirstDerivative(input, timestampsMs);
  const dOut = fidelityFirstDerivative(output, timestampsMs);
  const rmsIn = fidelityRms(dIn);
  const rmsOut = fidelityRms(dOut);
  if (rmsIn === null || rmsOut === null || rmsIn < eps) return null;
  return (rmsOut / rmsIn) * 100;
}

export function fidelitySaturationFraction(
  values: readonly number[],
  threshold: number,
): number | null {
  if (values.length === 0) return null;
  let hits = 0;
  for (const v of values) {
    if (v >= threshold) hits += 1;
  }
  return hits / values.length;
}

/** Angular error degrees between unit-ish 2D vectors (gaze). */
export function fidelityGazeAngularErrorDeg(
  targetX: number,
  targetY: number,
  outX: number,
  outY: number,
): number {
  const tLen = Math.hypot(targetX, targetY);
  const oLen = Math.hypot(outX, outY);
  if (tLen < 1e-9 && oLen < 1e-9) return 0;
  const tx = tLen < 1e-9 ? 0 : targetX / tLen;
  const ty = tLen < 1e-9 ? 0 : targetY / tLen;
  const ox = oLen < 1e-9 ? 0 : outX / oLen;
  const oy = oLen < 1e-9 ? 0 : outY / oLen;
  const dot = Math.min(1, Math.max(-1, tx * ox + ty * oy));
  return (Math.acos(dot) * 180) / Math.PI;
}

/**
 * Contour error as % of mouth width.
 * points: pairs of (ref, measured) distances along a 1D contour parameter.
 */
export function fidelityContourErrorPctMouthWidth(
  errors: readonly number[],
  mouthWidth: number,
): { medianPct: number | null; p95Pct: number | null } {
  if (mouthWidth <= 1e-9 || errors.length === 0) {
    return { medianPct: null, p95Pct: null };
  }
  const pct = errors.map((e) => (Math.abs(e) / mouthWidth) * 100);
  return {
    medianPct: fidelityMedian(pct),
    p95Pct: fidelityPercentile(pct, 95),
  };
}

/** Count sequence gaps (dropped frames) in increasing integer sequences. */
export function fidelityCountSequenceGaps(sequences: readonly number[]): number {
  if (sequences.length < 2) return 0;
  let drops = 0;
  for (let i = 1; i < sequences.length; i += 1) {
    const gap = sequences[i]! - sequences[i - 1]!;
    if (gap > 1) drops += gap - 1;
  }
  return drops;
}
