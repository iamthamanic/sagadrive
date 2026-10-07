/**
 * look-editor-sections — Left-nav sections for Look Editor workspace (#344).
 * Location: src/app/look/editor/look-editor-sections.ts
 */
import {
  listLookCapabilityMetadata,
  type LookCapabilityMeta,
} from '../../../domains/look/capability-metadata';

export type LookEditorSectionId =
  | 'overview'
  | 'character'
  | 'lighting'
  | 'postFx'
  | 'advanced'
  | 'world';

export type LookEditorNavItem = {
  readonly id: LookEditorSectionId;
  readonly labelDe: string;
  readonly reserved?: boolean;
};

export const LOOK_EDITOR_NAV: readonly LookEditorNavItem[] = [
  { id: 'overview', labelDe: 'Gesamt' },
  { id: 'character', labelDe: 'Charakter' },
  { id: 'lighting', labelDe: 'Licht' },
  { id: 'postFx', labelDe: 'Effekte' },
  { id: 'advanced', labelDe: 'Advanced' },
  { id: 'world', labelDe: 'Welt', reserved: true },
];

export function worldCapabilityRows(): readonly LookCapabilityMeta[] {
  return listLookCapabilityMetadata().filter((row) => row.availability === 'reserved');
}
