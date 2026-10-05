/**
 * PostFxLookInspector — Post-FX knobs in SagaDrive terms (#344).
 * Location: src/app/look/editor/inspectors/PostFxLookInspector.tsx
 */
import { Label } from '../../../../shared/ui/label';
import type { LookEditorUiDraft } from '../look-editor-draft';

type Props = {
  draft: LookEditorUiDraft;
  disabled?: boolean;
  onChange: (patch: Partial<LookEditorUiDraft>) => void;
};

export function PostFxLookInspector({ draft, disabled, onChange }: Props) {
  return (
    <div className="space-y-4" data-look-inspector="postFx">
      <p className="text-xs text-muted-foreground">Nachbearbeitung ohne World-Renderer.</p>
      <div className="space-y-2">
        <Label htmlFor="look-fx-contrast">Kontrast</Label>
        <input
          id="look-fx-contrast"
          type="range"
          min={0}
          max={100}
          className="range range-primary w-full"
          disabled={disabled}
          value={draft.postFxContrast}
          onChange={(e) => onChange({ postFxContrast: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="look-fx-sat">Sättigung</Label>
        <input
          id="look-fx-sat"
          type="range"
          min={0}
          max={100}
          className="range range-primary w-full"
          disabled={disabled}
          value={draft.postFxSaturation}
          onChange={(e) => onChange({ postFxSaturation: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
