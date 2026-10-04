/**
 * liveact-hybrid-face-fusion — reusable fusion primitives for #447.
 * Location: src/domains/character/liveact/liveact-hybrid-face-fusion.ts
 *
 * Dense confirms / corrects / asymmetrically refines semantic evidence.
 * No Gain-4. No opaque 0.5/0.5. No temporal state. No actor profiles.
 *
 * Decision order (authoritative):
 * 1. missing/unavailable
 * 2. semantic-only fallback
 * 3. dense-only (explicit allow)
 * 4. strong high-confidence disagreement → semantic authority
 * 5. under-response correction
 * 6. over-response correction
 * 7. agreement refinement / soft disagree
 */

import {
  LIVEACT_HYBRID_DENSE_MIN_CONFIDENCE,
  LIVEACT_HYBRID_DISAGREE_ABS,
  semanticPassthroughControl,
  unavailableHybridControl,
  type LiveActHybridControlResultV1,
} from './liveact-hybrid-face-contract';
import type { DenseScalarFeatureV1 } from './liveact-dense-face-features-contract';

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

export function readSemantic(
  face: Readonly<Partial<Record<string, number>>>,
  id: string,
): number | null {
  const v = face[id];
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return clamp01(v);
}

export function denseScalar(f: DenseScalarFeatureV1 | undefined): {
  available: boolean;
  value: number | null;
  confidence: number;
} {
  if (!f || !f.available || f.value === null || !Number.isFinite(f.value)) {
    return { available: false, value: null, confidence: f?.confidence ?? 0 };
  }
  return {
    available: true,
    value: f.value,
    confidence: clamp01(f.confidence),
  };
}

/** Map a signed dense smile-like signal (e.g. corner Y) into [0,1] activation. */
export function denseActivationFromSigned(
  value: number | null,
  available: boolean,
  /** Positive values indicate activation direction. */
  positiveMeansActive = true,
): number | null {
  if (!available || value === null || !Number.isFinite(value)) return null;
  const signed = positiveMeansActive ? value : -value;
  return clamp01(signed * 2.2);
}

/**
 * Core fusion: semantic channel + optional dense evidence in [0,1].
 */
export function fuseSemanticDense(input: {
  semantic: number | null;
  denseEvidence: number | null;
  denseConfidence: number;
  /** Optional external semantic confidence [0,1]; default from presence. */
  semanticConfidence?: number;
  allowDenseOnly?: boolean;
}): LiveActHybridControlResultV1 {
  const sem = input.semantic;
  const dense = input.denseEvidence;
  const dConf = clamp01(input.denseConfidence);
  const sConf =
    input.semanticConfidence !== undefined
      ? clamp01(input.semanticConfidence)
      : sem === null
        ? 0
        : 0.85;

  // 1. both missing
  if (sem === null && (dense === null || dConf < LIVEACT_HYBRID_DENSE_MIN_CONFIDENCE)) {
    return unavailableHybridControl(null);
  }

  // 2. semantic-only fallback (dense missing / low conf)
  if (dense === null || dConf < LIVEACT_HYBRID_DENSE_MIN_CONFIDENCE) {
    return semanticPassthroughControl(sem, sConf);
  }

  // 3. dense-only when explicitly allowed and semantic absent
  if (sem === null) {
    if (input.allowDenseOnly && dConf >= LIVEACT_HYBRID_DENSE_MIN_CONFIDENCE) {
      return {
        value: clamp01(dense),
        confidence: dConf * 0.85,
        source: 'dense',
        semanticInput: null,
        denseEvidence: clamp01(dense),
      };
    }
    return unavailableHybridControl(null);
  }

  const s = clamp01(sem);
  const d = clamp01(dense);
  const diff = Math.abs(s - d);
  const agree = diff <= LIVEACT_HYBRID_DISAGREE_ABS;

  // 4. Strong high-confidence disagreement → semantic authority BEFORE corrections
  // Requires strong semantic amplitude so weak under-response can still be corrected (step 5).
  if (!agree && s >= 0.45 && sConf >= 0.7 && dConf >= 0.7) {
    return {
      value: s,
      confidence: clamp01(Math.min(sConf, dConf) * 0.55),
      source: 'semantic',
      semanticInput: s,
      denseEvidence: d,
    };
  }

  // 5. Under-response: weak semantic below strong dense → hybrid correction
  if (s < d - 0.12 && dConf >= LIVEACT_HYBRID_DENSE_MIN_CONFIDENCE) {
    const w = clamp01(dConf * 0.75);
    const value = clamp01(s * (1 - w * 0.7) + d * (w * 0.7));
    return {
      value,
      confidence: clamp01(0.4 * sConf + 0.6 * dConf),
      source: 'hybrid',
      semanticInput: s,
      denseEvidence: d,
    };
  }

  // 6. Over-response: semantic well above dense
  if (s > d + 0.15 && dConf >= LIVEACT_HYBRID_DENSE_MIN_CONFIDENCE) {
    const w = clamp01(dConf * 0.55);
    const value = clamp01(s * (1 - w) + d * w);
    return {
      value,
      confidence: clamp01(0.55 * sConf + 0.45 * dConf),
      source: 'hybrid',
      semanticInput: s,
      denseEvidence: d,
    };
  }

  // 7a. Agree / modest refine
  if (agree) {
    const nudge = (d - s) * 0.12 * dConf;
    const value = clamp01(s + nudge);
    return {
      value,
      confidence: clamp01(Math.max(sConf, 0.4 * sConf + 0.6 * dConf)),
      source: Math.abs(nudge) > 1e-4 ? 'hybrid' : 'semantic',
      semanticInput: s,
      denseEvidence: d,
    };
  }

  // 7b. Soft disagreement — confidence-weighted, semantic-leaning
  const w = clamp01(dConf / (sConf + dConf + 1e-6)) * 0.4;
  const value = clamp01(s * (1 - w) + d * w);
  return {
    value,
    confidence: clamp01(0.45 * sConf + 0.45 * dConf),
    source: 'hybrid',
    semanticInput: s,
    denseEvidence: d,
  };
}

/** Combine multiple dense activations with max (OR) or mean. */
export function combineDenseEvidence(
  parts: readonly { value: number | null; confidence: number; available: boolean }[],
  mode: 'max' | 'mean' = 'max',
): { value: number | null; confidence: number } {
  const ok = parts.filter((p) => p.available && p.value !== null);
  if (ok.length === 0) return { value: null, confidence: 0 };
  if (mode === 'max') {
    let best = ok[0]!;
    for (const p of ok) {
      if ((p.value ?? 0) > (best.value ?? 0)) best = p;
    }
    return { value: clamp01(best.value!), confidence: clamp01(best.confidence) };
  }
  let sum = 0;
  let cSum = 0;
  for (const p of ok) {
    sum += p.value!;
    cSum += p.confidence;
  }
  return {
    value: clamp01(sum / ok.length),
    confidence: clamp01(cSum / ok.length),
  };
}
