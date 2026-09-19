/**
 * AvatarGenerateProductModeChooser — Editierbar vs Freie Form (#267).
 * Location: src/app/character/avatar/AvatarGenerateProductModeChooser.tsx
 *
 * Product intent only. Does not mention providers or invent capabilities.
 */

import {
  listGenerateProductModeOptions,
  type GenerateProductModeId,
} from '../../../domains/character/avatar';
import { Button } from '../../../shared/ui/button';

interface AvatarGenerateProductModeChooserProps {
  value: GenerateProductModeId;
  disabled?: boolean;
  onChange: (mode: GenerateProductModeId) => void;
}

export function AvatarGenerateProductModeChooser({
  value,
  disabled = false,
  onChange,
}: AvatarGenerateProductModeChooserProps) {
  const options = listGenerateProductModeOptions();

  return (
    <div
      className="space-y-2"
      role="radiogroup"
      aria-label="KI-Ziel"
      data-avatar-generate-product-mode={value}
    >
      <p className="text-xs font-medium">Ziel</p>
      <div className="grid grid-cols-1 gap-2">
        {options.map((option) => {
          const selected = option.modeId === value;
          return (
            <Button
              key={option.modeId}
              type="button"
              role="radio"
              aria-checked={selected}
              variant={selected ? 'default' : 'outline'}
              disabled={disabled}
              data-avatar-generate-mode={option.modeId}
              data-recommended={option.recommended ? 'true' : 'false'}
              className="h-auto min-h-11 flex-col items-start gap-1 whitespace-normal px-3 py-3 text-left"
              onClick={() => onChange(option.modeId)}
            >
              <span className="text-sm font-medium">{option.labelDe}</span>
              <span className="text-xs opacity-90">{option.detailDe}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
