/**
 * LookReferenceItemRow — One reference image with STYLE/CONTENT + weight (#353).
 * Location: src/app/look/create/LookReferenceItemRow.tsx
 */
import type { LookReferenceKind } from '../../../domains/look';
import { Button } from '../../../shared/ui/button';
import { Label } from '../../../shared/ui/label';
import type { LookAdaptionReference } from './look-reference-adaption';

export type LookReferenceItemRowProps = {
  reference: LookAdaptionReference;
  disabled?: boolean;
  onKindChange: (id: string, kind: LookReferenceKind) => void;
  onWeightChange: (id: string, weight: number) => void;
  onRemove: (id: string) => void;
};

export function LookReferenceItemRow({
  reference,
  disabled,
  onKindChange,
  onWeightChange,
  onRemove,
}: LookReferenceItemRowProps) {
  return (
    <li
      className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center"
      data-look-ref-item={reference.id}
    >
      <img
        src={reference.previewUrl}
        alt={reference.label || reference.fileName}
        className="h-20 w-20 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate text-sm font-medium">{reference.fileName}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Referenztyp">
          <Button
            type="button"
            size="sm"
            variant={reference.kind === 'style' ? 'default' : 'outline'}
            className="min-h-11"
            disabled={disabled}
            onClick={() => onKindChange(reference.id, 'style')}
            data-look-ref-kind="style"
            aria-pressed={reference.kind === 'style'}
          >
            STYLE
          </Button>
          <Button
            type="button"
            size="sm"
            variant={reference.kind === 'content' ? 'default' : 'outline'}
            className="min-h-11"
            disabled={disabled}
            onClick={() => onKindChange(reference.id, 'content')}
            data-look-ref-kind="content"
            aria-pressed={reference.kind === 'content'}
          >
            CONTENT
          </Button>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`look-ref-weight-${reference.id}`}>
            Gewichtung {Math.round(reference.weight * 100)}%
          </Label>
          <input
            id={`look-ref-weight-${reference.id}`}
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={disabled}
            value={Math.round(reference.weight * 100)}
            onChange={(e) => onWeightChange(reference.id, Number(e.target.value) / 100)}
            className="w-full"
            data-look-ref-weight
          />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 shrink-0"
        disabled={disabled}
        onClick={() => onRemove(reference.id)}
        data-look-ref-remove
      >
        Entfernen
      </Button>
    </li>
  );
}
