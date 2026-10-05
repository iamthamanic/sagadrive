/**
 * look-preview-version — Ephemeral LookProfileVersion from editor draft (#345).
 * Location: src/app/look/editor/look-preview-version.ts
 */
import type { LookProfileVersion } from '../../../domains/look/types';
import { toLookProfileWriteDraft, type LookEditorUiDraft } from './look-editor-draft';

export function ephemeralLookVersionFromDraft(
  draft: LookEditorUiDraft,
  profileId = 'look-preview',
): LookProfileVersion {
  const write = toLookProfileWriteDraft(draft);
  return {
    profileId,
    version: 0,
    source: write.source,
    displayName: write.displayName,
    references: write.references,
    capabilities: write.capabilities,
    executionModes: write.executionModes,
    createdAtIso: new Date().toISOString(),
  };
}
