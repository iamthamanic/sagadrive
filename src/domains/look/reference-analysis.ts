/**
 * reference-analysis — Provider-neutral Basic Look reference analysis (#352).
 * Location: src/domains/look/reference-analysis.ts
 *
 * Vision providers live in infrastructure/edge only. Domain validates and
 * normalizes structured drafts; invalid analysis must never become a write draft.
 */
import type {
  LookProfileWriteDraft,
  LookReference,
  LookReferenceKind,
} from './types';
import { isLookReferenceKind } from './parse';
import { assertLookReferenceKindSemantics } from './invariants';

export const LOOK_REFERENCE_ANALYSIS_VERSION = 'look-ref-analysis-v1' as const;

export const LOOK_REFERENCE_ANALYSIS_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type LookReferenceAnalysisMime =
  (typeof LOOK_REFERENCE_ANALYSIS_MIME_TYPES)[number];

export const LOOK_REFERENCE_ANALYSIS_MIN_IMAGES = 1;
export const LOOK_REFERENCE_ANALYSIS_MAX_IMAGES = 10;

const KNOBS_REF_ID = 'ref.sagadrive-knobs-v1';
const KNOBS_URI_PREFIX = 'sagadrive:look-knobs-v1:';
const PALETTE_REF_ID = 'ref.sagadrive-palette-v1';
const PALETTE_URI_PREFIX = 'sagadrive:look-palette-v1:';
const META_REF_ID = 'ref.sagadrive-analysis-meta-v1';
const META_URI_PREFIX = 'sagadrive:look-analysis-meta-v1:';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export type LookReferenceAnalysisImageInput = {
  readonly id: string;
  readonly kind: LookReferenceKind;
  readonly mime: LookReferenceAnalysisMime;
  /** Opaque URI or storage key — domain does not fetch. */
  readonly uri: string;
  /** Optional blend weight in [0, 1]. */
  readonly weight?: number;
  readonly label?: string;
};

export type LookAnalysisPalette = {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly background: string;
};

export type LookAnalysisKnobs = {
  readonly characterStylization: number;
  readonly characterOutline: number;
  readonly lightingWarmth: number;
  readonly lightingKey: number;
  readonly postFxContrast: number;
  readonly postFxSaturation: number;
};

export type LookReferenceAnalysisProvenance = {
  readonly analysisVersion: typeof LOOK_REFERENCE_ANALYSIS_VERSION;
  readonly analyzedAtIso: string;
  readonly referenceIds: readonly string[];
  readonly styleReferenceCount: number;
  readonly contentReferenceCount: number;
};

export type LookReferenceAnalysisDraft = {
  readonly displayName: string;
  readonly palette: LookAnalysisPalette;
  readonly knobs: LookAnalysisKnobs;
  /** Motif notes from content refs — never treated as a style source. */
  readonly contentNotes: string;
  readonly provenance: LookReferenceAnalysisProvenance;
  readonly references: readonly LookReference[];
};

export type LookReferenceAnalysisFailure = {
  readonly ok: false;
  readonly code: string;
  readonly messageDe: string;
};

export type LookReferenceAnalysisSuccess = {
  readonly ok: true;
  readonly draft: LookReferenceAnalysisDraft;
  readonly writeDraft: LookProfileWriteDraft;
};

export type LookReferenceAnalysisOutcome =
  | LookReferenceAnalysisSuccess
  | LookReferenceAnalysisFailure;

/**
 * Provider-neutral analyzer contract. Adapters live in infrastructure;
 * implementations must not leak provider types into domain results.
 */
export type LookReferenceAnalyzer = {
  analyze(input: {
    readonly references: readonly LookReferenceAnalysisImageInput[];
    readonly displayNameHint?: string;
  }): Promise<LookReferenceAnalysisOutcome>;
};

export function isLookReferenceAnalysisMime(
  value: string,
): value is LookReferenceAnalysisMime {
  return (LOOK_REFERENCE_ANALYSIS_MIME_TYPES as readonly string[]).includes(
    value,
  );
}

function clamp01to100(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clampWeight(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value)) return undefined;
  return Math.min(1, Math.max(0, value));
}

function defaultPalette(): LookAnalysisPalette {
  return {
    primary: '#4a5568',
    secondary: '#718096',
    accent: '#ed8936',
    background: '#1a202c',
  };
}

function defaultKnobs(): LookAnalysisKnobs {
  return {
    characterStylization: 55,
    characterOutline: 40,
    lightingWarmth: 50,
    lightingKey: 60,
    postFxContrast: 50,
    postFxSaturation: 50,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readHex(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : null;
}

function readKnob(
  record: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  return clamp01to100(Number(record[key]), fallback);
}

/**
 * Fail-closed input gate: 1–10 PNG/JPEG/WebP refs with style|content + weight.
 */
export function assertLookReferenceAnalysisInput(
  references: readonly LookReferenceAnalysisImageInput[],
): LookReferenceAnalysisFailure | { readonly ok: true } {
  if (!Array.isArray(references)) {
    return {
      ok: false,
      code: 'invalid-input',
      messageDe: 'Referenzen fehlen oder sind ungültig.',
    };
  }
  if (
    references.length < LOOK_REFERENCE_ANALYSIS_MIN_IMAGES ||
    references.length > LOOK_REFERENCE_ANALYSIS_MAX_IMAGES
  ) {
    return {
      ok: false,
      code: 'reference-count',
      messageDe: 'Bitte 1 bis 10 Referenzbilder angeben.',
    };
  }

  const ids = new Set<string>();
  for (const ref of references) {
    if (!ref || typeof ref.id !== 'string' || !ref.id.trim()) {
      return {
        ok: false,
        code: 'invalid-reference',
        messageDe: 'Jede Referenz braucht eine gültige ID.',
      };
    }
    if (ids.has(ref.id)) {
      return {
        ok: false,
        code: 'duplicate-reference-id',
        messageDe: 'Referenz-IDs müssen eindeutig sein.',
      };
    }
    ids.add(ref.id);
    if (!isLookReferenceKind(ref.kind)) {
      return {
        ok: false,
        code: 'invalid-kind',
        messageDe: 'Referenztyp muss style oder content sein.',
      };
    }
    if (!isLookReferenceAnalysisMime(ref.mime)) {
      return {
        ok: false,
        code: 'invalid-mime',
        messageDe: 'Nur PNG, JPEG oder WebP sind erlaubt.',
      };
    }
    if (typeof ref.uri !== 'string' || !ref.uri.trim()) {
      return {
        ok: false,
        code: 'invalid-uri',
        messageDe: 'Jede Referenz braucht eine URI.',
      };
    }
    if (ref.weight !== undefined) {
      if (!Number.isFinite(ref.weight) || ref.weight < 0 || ref.weight > 1) {
        return {
          ok: false,
          code: 'invalid-weight',
          messageDe: 'Gewichtung muss zwischen 0 und 1 liegen.',
        };
      }
    }
  }

  const kindCheck = assertLookReferenceKindSemantics(
    references.map((r) => ({
      id: r.id,
      kind: r.kind,
      uri: r.uri,
      weight: clampWeight(r.weight),
      label: r.label,
    })),
  );
  if (kindCheck.ok === false) {
    return {
      ok: false,
      code: kindCheck.code,
      messageDe: 'Style- und Content-Referenzen dürfen nicht kollidieren.',
    };
  }

  return { ok: true };
}

/**
 * Normalize untrusted provider/edge payload into a domain analysis draft.
 * Rejects free-text blobs and unknown shapes — never persists invalid analysis.
 */
export function normalizeLookReferenceAnalysisPayload(
  raw: unknown,
  input: {
    readonly references: readonly LookReferenceAnalysisImageInput[];
    readonly displayNameHint?: string;
    readonly analyzedAtIso?: string;
  },
): LookReferenceAnalysisOutcome {
  const inputGate = assertLookReferenceAnalysisInput(input.references);
  if (inputGate.ok === false) return inputGate;

  if (!isRecord(raw)) {
    return {
      ok: false,
      code: 'invalid-payload',
      messageDe: 'Analyse-Antwort war ungültig und wird nicht gespeichert.',
    };
  }

  // Provider-specific keys must not drive domain shape.
  if (
    'apiKey' in raw ||
    'providerSecret' in raw ||
    typeof raw.openai === 'object' ||
    typeof raw.anthropic === 'object'
  ) {
    return {
      ok: false,
      code: 'provider-leak',
      messageDe: 'Analyse enthielt Provider-Daten und wird verworfen.',
    };
  }

  const styleRefs = input.references.filter((r) => r.kind === 'style');
  const contentRefs = input.references.filter((r) => r.kind === 'content');
  const defaults = defaultKnobs();
  const defaultPal = defaultPalette();

  let knobs: LookAnalysisKnobs = defaults;
  let palette: LookAnalysisPalette = defaultPal;

  // Content-only: never invent style from content — keep neutral defaults.
  if (styleRefs.length > 0) {
    const knobsRaw = isRecord(raw.knobs) ? raw.knobs : raw;
    const paletteRaw = isRecord(raw.palette) ? raw.palette : null;

    knobs = {
      characterStylization: readKnob(
        knobsRaw,
        'characterStylization',
        defaults.characterStylization,
      ),
      characterOutline: readKnob(
        knobsRaw,
        'characterOutline',
        defaults.characterOutline,
      ),
      lightingWarmth: readKnob(
        knobsRaw,
        'lightingWarmth',
        defaults.lightingWarmth,
      ),
      lightingKey: readKnob(knobsRaw, 'lightingKey', defaults.lightingKey),
      postFxContrast: readKnob(
        knobsRaw,
        'postFxContrast',
        defaults.postFxContrast,
      ),
      postFxSaturation: readKnob(
        knobsRaw,
        'postFxSaturation',
        defaults.postFxSaturation,
      ),
    };

    if (paletteRaw) {
      const primary = readHex(paletteRaw, 'primary');
      const secondary = readHex(paletteRaw, 'secondary');
      const accent = readHex(paletteRaw, 'accent');
      const background = readHex(paletteRaw, 'background');
      if (!primary || !secondary || !accent || !background) {
        return {
          ok: false,
          code: 'invalid-palette',
          messageDe: 'Farbpalette ungültig — Analyse wird nicht gespeichert.',
        };
      }
      palette = { primary, secondary, accent, background };
    }
  }

  const displayNameRaw =
    typeof raw.displayName === 'string' ? raw.displayName.trim() : '';
  const hint = input.displayNameHint?.trim() || '';
  const displayName =
    (displayNameRaw || hint || 'Look aus Referenzanalyse').slice(0, 80);

  const contentNotes =
    typeof raw.contentNotes === 'string'
      ? raw.contentNotes.trim().slice(0, 400)
      : '';

  const analyzedAtIso =
    typeof input.analyzedAtIso === 'string' && input.analyzedAtIso.trim()
      ? input.analyzedAtIso.trim()
      : new Date().toISOString();

  const echoRefs: LookReference[] = input.references.map((r) => ({
    id: r.id,
    kind: r.kind,
    uri: r.uri,
    label: r.label,
    weight: clampWeight(r.weight),
  }));

  const draft: LookReferenceAnalysisDraft = {
    displayName,
    palette,
    knobs,
    contentNotes,
    provenance: {
      analysisVersion: LOOK_REFERENCE_ANALYSIS_VERSION,
      analyzedAtIso,
      referenceIds: input.references.map((r) => r.id),
      styleReferenceCount: styleRefs.length,
      contentReferenceCount: contentRefs.length,
    },
    references: echoRefs,
  };

  const writeDraft = buildLookProfileWriteDraftFromAnalysis(draft);
  return { ok: true, draft, writeDraft };
}

export function buildLookProfileWriteDraftFromAnalysis(
  draft: LookReferenceAnalysisDraft,
): LookProfileWriteDraft {
  if (draft.provenance.analysisVersion !== LOOK_REFERENCE_ANALYSIS_VERSION) {
    throw new Error('Unsupported look reference analysis version');
  }

  const knobsPayload = {
    characterStylization: draft.knobs.characterStylization,
    characterOutline: draft.knobs.characterOutline,
    lightingWarmth: draft.knobs.lightingWarmth,
    lightingKey: draft.knobs.lightingKey,
    postFxContrast: draft.knobs.postFxContrast,
    postFxSaturation: draft.knobs.postFxSaturation,
  };

  const palettePayload = {
    primary: draft.palette.primary,
    secondary: draft.palette.secondary,
    accent: draft.palette.accent,
    background: draft.palette.background,
  };

  const metaPayload = {
    analysisVersion: draft.provenance.analysisVersion,
    analyzedAtIso: draft.provenance.analyzedAtIso,
    styleReferenceCount: draft.provenance.styleReferenceCount,
    contentReferenceCount: draft.provenance.contentReferenceCount,
    contentNotes: draft.contentNotes,
  };

  const structured: LookReference[] = [
    {
      id: KNOBS_REF_ID,
      kind: 'style',
      uri: `${KNOBS_URI_PREFIX}${encodeURIComponent(JSON.stringify(knobsPayload))}`,
      label: 'SagaDrive Look-Regler',
    },
    {
      id: PALETTE_REF_ID,
      kind: 'style',
      uri: `${PALETTE_URI_PREFIX}${encodeURIComponent(JSON.stringify(palettePayload))}`,
      label: 'SagaDrive Palette',
    },
    {
      id: META_REF_ID,
      kind: 'style',
      uri: `${META_URI_PREFIX}${encodeURIComponent(JSON.stringify(metaPayload))}`,
      label: 'Analyse-Metadaten',
    },
  ];

  // Preserve user references; content stays content (never rewritten as style).
  const userRefs = draft.references.filter(
    (r) =>
      r.id !== KNOBS_REF_ID &&
      r.id !== PALETTE_REF_ID &&
      r.id !== META_REF_ID,
  );

  return {
    displayName: draft.displayName.trim() || 'Look aus Referenzanalyse',
    source: 'reference-analysis',
    references: [...structured, ...userRefs],
    capabilities: ['character', 'lighting', 'postFx'],
    executionModes: ['realtime', 'rendered'],
    ownerScope: 'system',
  };
}
