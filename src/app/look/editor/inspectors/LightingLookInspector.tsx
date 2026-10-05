/**
 * LightingLookInspector — Lighting knobs in SagaDrive terms (#344).
 * Location: src/app/look/editor/inspectors/LightingLookInspector.tsx
 */
import { Label } from '../../../../shared/ui/label';
import type { LookEditorUiDraft } from '../look-editor-draft';

type Props = {
  draft: LookEditorUiDraft;
  disabled?: boolean;
  onChange: (patch: Partial<LookEditorUiDraft>) => void;
};

export function LightingLookInspector({ draft, disabled, onChange }: Props) {
  return (
    <div className="space-y-4" data-look-inspector="lighting">
      <p className="text-xs text-muted-foreground">Lichtstimmung für den Look.</p>
      <div className="space-y-2">
        <Label htmlFor="look-light-warmth">Wärme</Label>
        <input
          id="look-light-warmth"
          type="range"
          min={0}
          max={100}
          className="range range-primary w-full"
          disabled={disabled}
          value={draft.lightingWarmth}
          onChange={(e) => onChange({ lightingWarmth: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="look-light-key">Hauptlicht</Label>
        <input
          id="look-light-key"
          type="range"
          min={0}
          max={100}
          className="range range-primary w-full"
          disabled={disabled}
          value={draft.lightingKey}
          onChange={(e) => onChange({ lightingKey: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
