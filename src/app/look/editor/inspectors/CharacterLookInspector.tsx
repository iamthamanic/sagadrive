/**
 * CharacterLookInspector — Character knobs in SagaDrive terms (#344).
 * Location: src/app/look/editor/inspectors/CharacterLookInspector.tsx
 */
import { Label } from '../../../../shared/ui/label';
import type { LookEditorUiDraft } from '../look-editor-draft';

type Props = {
  draft: LookEditorUiDraft;
  disabled?: boolean;
  onChange: (patch: Partial<LookEditorUiDraft>) => void;
};

export function CharacterLookInspector({ draft, disabled, onChange }: Props) {
  return (
    <div className="space-y-4" data-look-inspector="character">
      <p className="text-xs text-muted-foreground">
        Charakterstil in SagaDrive-Begriffen — keine Provider-Rohparameter.
      </p>
      <div className="space-y-2">
        <Label htmlFor="look-char-style">Stylisierung</Label>
        <input
          id="look-char-style"
          type="range"
          min={0}
          max={100}
          className="range range-primary w-full"
          disabled={disabled}
          value={draft.characterStylization}
          onChange={(e) => onChange({ characterStylization: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="look-char-outline">Kontur-Betonung</Label>
        <input
          id="look-char-outline"
          type="range"
          min={0}
          max={100}
          className="range range-primary w-full"
          disabled={disabled}
          value={draft.characterOutline}
          onChange={(e) => onChange({ characterOutline: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
