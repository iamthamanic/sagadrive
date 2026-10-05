/**
 * look-preview-modes — Comparison modes + camera presets for Look Preview (#345).
 * Location: src/app/look/editor/look-preview-modes.ts
 */
import type { AvatarCameraFrameId } from '../../../infrastructure/character/avatar/character-studio-runtime';

export const LOOK_PREVIEW_MODES = [
  'normal',
  'pbrNeutral',
  'beforeAfter',
  'variantGrid',
] as const;

export type LookPreviewMode = (typeof LOOK_PREVIEW_MODES)[number];

export const LOOK_PREVIEW_MODE_LABELS: Record<LookPreviewMode, string> = {
  normal: 'Normal',
  pbrNeutral: 'PBR Neutral',
  beforeAfter: 'Vorher/Nachher',
  variantGrid: 'Varianten',
};

export const LOOK_PREVIEW_CAMERAS = [
  'fullBody',
  'portrait',
  'threeQuarter',
  'environment',
  'itemProp',
] as const;

export type LookPreviewCameraId = (typeof LOOK_PREVIEW_CAMERAS)[number];

export const LOOK_PREVIEW_CAMERA_LABELS: Record<LookPreviewCameraId, string> = {
  fullBody: 'Ganzkörper',
  portrait: 'Portrait',
  threeQuarter: '3/4',
  environment: 'Umgebung',
  itemProp: 'Item/Prop',
};

/** Map Look Preview cameras onto CharacterStudio frames (shared camera between compares). */
export function lookPreviewCameraToAvatarFrame(
  camera: LookPreviewCameraId,
): { frame: AvatarCameraFrameId; noticeDe: string | null } {
  switch (camera) {
    case 'fullBody':
      return { frame: 'full', noticeDe: null };
    case 'portrait':
      return { frame: 'portrait', noticeDe: null };
    case 'threeQuarter':
      return {
        frame: 'full',
        noticeDe: '3/4 nutzt Ganzkörper-Rahmen mit gleichem Kamerapreset (identisch zwischen Vergleichen).',
      };
    case 'environment':
      return {
        frame: 'full',
        noticeDe: 'Umgebung ist vorbereitet — World-Capabilities noch nicht gerendert.',
      };
    case 'itemProp':
      return {
        frame: 'feet',
        noticeDe: 'Item/Prop-Rahmen; fehlende Item-Fixtures degradieren sichtbar.',
      };
    default:
      return { frame: 'full', noticeDe: null };
  }
}
