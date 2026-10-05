/**
 * look-editor-draft — UI draft ↔ LookProfileWriteDraft for #344.
 * Location: src/app/look/editor/look-editor-draft.ts
 *
 * SagaDrive knobs only — no ToonLab raw blobs on the write path.
 * Knobs round-trip via a structured style reference URI (not provider JSON).
 */
import type {
  LookProfileRecord,
  LookProfileVersion,
  LookProfileWriteDraft,
  LookReference,
} from '../../../domains/look/types';

export type LookEditorUiDraft = {
  displayName: string;
  /** Character: stylization 0–100 (SagaDrive term). */
  characterStylization: number;
  /** Character: outline emphasis 0–100. */
  characterOutline: number;
  /** Lighting: warmth 0–100. */
  lightingWarmth: number;
  /** Lighting: key intensity 0–100. */
  lightingKey: number;
  /** PostFX: contrast 0–100. */
  postFxContrast: number;
  /** PostFX: saturation 0–100. */
  postFxSaturation: number;
  /** Advanced (collapsed): opaque note — never a provider blob. */
  advancedNote: string;
};

const KNOBS_REF_ID = 'ref.sagadrive-knobs-v1';
const KNOBS_URI_PREFIX = 'sagadrive:look-knobs-v1:';
const NOTE_REF_ID = 'ref.advanced-note';
const NOTE_URI_PREFIX = 'sagadrive:look-note:';

function clamp01to100(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function defaultLookEditorUiDraft(displayName = 'Neuer Look'): LookEditorUiDraft {
  return {
    displayName,
    characterStylization: 55,
    characterOutline: 40,
    lightingWarmth: 50,
    lightingKey: 60,
    postFxContrast: 50,
    postFxSaturation: 50,
    advancedNote: '',
  };
}

function knobsFromReferences(references: readonly LookReference[]): Partial<LookEditorUiDraft> {
  const knobsRef = references.find((r) => r.id === KNOBS_REF_ID);
  if (!knobsRef?.uri.startsWith(KNOBS_URI_PREFIX)) return {};
  try {
    const raw = JSON.parse(
      decodeURIComponent(knobsRef.uri.slice(KNOBS_URI_PREFIX.length)),
    ) as Record<string, unknown>;
    return {
      characterStylization: clamp01to100(Number(raw.characterStylization), 55),
      characterOutline: clamp01to100(Number(raw.characterOutline), 40),
      lightingWarmth: clamp01to100(Number(raw.lightingWarmth), 50),
      lightingKey: clamp01to100(Number(raw.lightingKey), 60),
      postFxContrast: clamp01to100(Number(raw.postFxContrast), 50),
      postFxSaturation: clamp01to100(Number(raw.postFxSaturation), 50),
    };
  } catch {
    return {};
  }
}

function noteFromReferences(references: readonly LookReference[]): string {
  const noteRef = references.find((r) => r.id === NOTE_REF_ID);
  if (!noteRef?.uri.startsWith(NOTE_URI_PREFIX)) return '';
  try {
    return decodeURIComponent(noteRef.uri.slice(NOTE_URI_PREFIX.length));
  } catch {
    return '';
  }
}

export function uiDraftFromVersion(version: LookProfileVersion): LookEditorUiDraft {
  const base = defaultLookEditorUiDraft(version.displayName);
  return {
    ...base,
    displayName: version.displayName,
    ...knobsFromReferences(version.references),
    advancedNote: noteFromReferences(version.references),
  };
}

export function uiDraftFromRecord(record: LookProfileRecord): LookEditorUiDraft {
  return uiDraftFromVersion(record.current);
}

export function toLookProfileWriteDraft(ui: LookEditorUiDraft): LookProfileWriteDraft {
  const knobsPayload = {
    characterStylization: clamp01to100(ui.characterStylization, 55),
    characterOutline: clamp01to100(ui.characterOutline, 40),
    lightingWarmth: clamp01to100(ui.lightingWarmth, 50),
    lightingKey: clamp01to100(ui.lightingKey, 60),
    postFxContrast: clamp01to100(ui.postFxContrast, 50),
    postFxSaturation: clamp01to100(ui.postFxSaturation, 50),
  };
  const references: LookReference[] = [
    {
      id: KNOBS_REF_ID,
      kind: 'style',
      uri: `${KNOBS_URI_PREFIX}${encodeURIComponent(JSON.stringify(knobsPayload))}`,
      label: 'SagaDrive Look-Regler',
    },
  ];
  const note = ui.advancedNote.trim();
  if (note) {
    references.push({
      id: NOTE_REF_ID,
      kind: 'style',
      uri: `${NOTE_URI_PREFIX}${encodeURIComponent(note.slice(0, 200))}`,
      label: 'Erweiterte Notiz',
    });
  }
  return {
    displayName: ui.displayName.trim() || 'Unbenannter Look',
    source: 'manual',
    references,
    capabilities: ['character', 'lighting', 'postFx'],
    executionModes: ['realtime', 'rendered'],
    ownerScope: 'system',
  };
}

export function isLookEditorDirty(a: LookEditorUiDraft, b: LookEditorUiDraft): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}
