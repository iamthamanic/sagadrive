/**
 * look-reference-adaption — Client helpers for Basic Look Adaption UX (#353).
 * Location: src/app/look/create/look-reference-adaption.ts
 */
import {
  LOOK_REFERENCE_ANALYSIS_MAX_IMAGES,
  LOOK_REFERENCE_ANALYSIS_MIME_TYPES,
  isLookReferenceAnalysisMime,
  type LookReferenceAnalysisMime,
  type LookReferenceKind,
} from '../../../domains/look';

export const LOOK_ADAPTION_MAX_BYTES = 8 * 1024 * 1024;

export type LookAdaptionReference = {
  readonly id: string;
  kind: LookReferenceKind;
  mime: LookReferenceAnalysisMime;
  weight: number;
  label: string;
  previewUrl: string;
  contentBase64: string;
  fileName: string;
};

export function mimeFromFile(file: File): LookReferenceAnalysisMime | null {
  const raw = (file.type || '').toLowerCase();
  if (isLookReferenceAnalysisMime(raw)) return raw;
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  return null;
}

export function validateAdaptionFile(file: File): string | null {
  if (file.size <= 0 || file.size > LOOK_ADAPTION_MAX_BYTES) {
    return 'Bildgröße muss zwischen 1 Byte und 8 MB liegen.';
  }
  if (!mimeFromFile(file)) {
    return `Nur ${LOOK_REFERENCE_ANALYSIS_MIME_TYPES.join(', ')} sind erlaubt.`;
  }
  return null;
}

export function canAddMoreReferences(count: number): boolean {
  return count < LOOK_REFERENCE_ANALYSIS_MAX_IMAGES;
}

export async function fileToContentBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function createAdaptionReferenceId(): string {
  return `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
