/**
 * AvatarSourceSelector — three source cards (SagaDrive / Import / Meshy) for #14.
 * Location: src/app/character/avatar/AvatarSourceSelector.tsx
 *
 * Source is UI origin only; capabilities come from validated analysis, never from the card choice.
 */

import {
  AVATAR_SOURCE_OPTIONS,
  describeAvatarSourceCapabilities,
  type AvatarSource,
} from '../../../domains/character/avatar';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';

interface AvatarSourceSelectorProps {
  value: AvatarSource;
  capabilitySummary?: string;
  onSelect: (source: AvatarSource) => void;
  disabled?: boolean;
}

export function AvatarSourceSelector({
  value,
  capabilitySummary,
  onSelect,
  disabled = false,
}: AvatarSourceSelectorProps) {
  const summary =
    capabilitySummary ??
    describeAvatarSourceCapabilities({
      source: value,
      morphBody: false,
      morphFace: false,
      animation: false,
      facial: false,
      wearables: false,
    });

  return (
    <section className="space-y-3" aria-label="Avatar-Quelle" data-avatar-source={value}>
      <div>
        <h3 className="text-sm font-medium">Avatar-Quelle</h3>
        <p className="text-xs text-muted-foreground">
          Eine Quelle wählen. Funktionen richten sich nach der Rig-Analyse — nicht nach der Quelle.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Avatar-Quellen">
        {AVATAR_SOURCE_OPTIONS.map((option) => {
          const selected = value === option.source;
          return (
            <Button
              key={option.source}
              type="button"
              role="radio"
              aria-checked={selected}
              variant={selected ? 'default' : 'outline'}
              disabled={disabled}
              data-avatar-source-card={option.source}
              data-selected={selected ? 'true' : 'false'}
              className="h-auto flex-col items-start gap-1 whitespace-normal px-3 py-3 text-left"
              onClick={() => onSelect(option.source)}
            >
              <span className="font-medium">{option.titleDe}</span>
              <Badge variant="secondary" className="text-[10px]">
                {option.expectationDe}
              </Badge>
              <span className="text-xs opacity-90">{option.summaryDe}</span>
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground" data-avatar-source-capability-summary>
        {summary}
      </p>
    </section>
  );
}
