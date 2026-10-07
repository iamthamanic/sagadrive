/**
 * LookEditorInspector — Right inspector host switched by section (#344).
 * Location: src/app/look/editor/LookEditorInspector.tsx
 */
import type { LookProfileVersion } from '../../../domains/look/types';
import { Button } from '../../../shared/ui/button';
import { Label } from '../../../shared/ui/label';
import { Input } from '../../../shared/ui/input';
import type { LookEditorUiDraft } from './look-editor-draft';
import type { LookEditorSectionId } from './look-editor-sections';
import { CharacterLookInspector } from './inspectors/CharacterLookInspector';
import { LightingLookInspector } from './inspectors/LightingLookInspector';
import { PostFxLookInspector } from './inspectors/PostFxLookInspector';
import { WorldLookReservedPanel } from './inspectors/WorldLookReservedPanel';
import { AdvancedLookAdaptionPanel } from './inspectors/AdvancedLookAdaptionPanel';

type Props = {
  section: LookEditorSectionId;
  draft: LookEditorUiDraft;
  disabled?: boolean;
  versions?: readonly LookProfileVersion[];
  currentVersion?: number | null;
  onChange: (patch: Partial<LookEditorUiDraft>) => void;
  onRestoreVersion?: (version: LookProfileVersion) => void;
};

export function LookEditorInspector({
  section,
  draft,
  disabled,
  versions = [],
  currentVersion = null,
  onChange,
  onRestoreVersion,
}: Props) {
  return (
    <div className="space-y-4 p-3" data-look-editor-inspector={section}>
      {section === 'overview' ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="look-name">Name</Label>
            <Input
              id="look-name"
              className="min-h-11"
              disabled={disabled}
              value={draft.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
            />
          </div>
          <details className="rounded-md border border-border p-2">
            <summary className="cursor-pointer text-sm font-medium">Erweitert</summary>
            <div className="mt-2 space-y-2">
              <Label htmlFor="look-advanced-note">Notiz (keine Provider-Rohdaten)</Label>
              <Input
                id="look-advanced-note"
                disabled={disabled}
                value={draft.advancedNote}
                onChange={(e) => onChange({ advancedNote: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </details>
          {versions.length > 0 ? (
            <div className="space-y-2" data-look-editor-versions>
              <p className="text-sm font-medium">Gespeicherte Versionen</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {[...versions]
                  .slice()
                  .sort((a, b) => b.version - a.version)
                  .map((version) => (
                    <li
                      key={version.version}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          Version {version.version}
                          {currentVersion === version.version ? ' · aktuell' : ''}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {version.displayName}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 shrink-0"
                        disabled={disabled || currentVersion === version.version}
                        onClick={() => onRestoreVersion?.(version)}
                      >
                        Laden
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
      {section === 'character' ? (
        <CharacterLookInspector draft={draft} disabled={disabled} onChange={onChange} />
      ) : null}
      {section === 'lighting' ? (
        <LightingLookInspector draft={draft} disabled={disabled} onChange={onChange} />
      ) : null}
      {section === 'postFx' ? (
        <PostFxLookInspector draft={draft} disabled={disabled} onChange={onChange} />
      ) : null}
      {section === 'advanced' ? <AdvancedLookAdaptionPanel /> : null}
      {section === 'world' ? <WorldLookReservedPanel /> : null}
    </div>
  );
}
