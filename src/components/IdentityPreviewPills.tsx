/**
 * IdentityPreviewPills — Compact Essenz / Archetype badges for the sticky preview card.
 * Spezies is intentionally omitted from this card.
 * Location: src/components/IdentityPreviewPills.tsx
 */
import type { SagaDriveArchetypeKey, SagaDriveEssenceKey } from '../modules/rulesets/characterCreation';
import { ArchetypeIcon } from '../app/character/creation/ArchetypeIcon';
import { EssenceIcon } from '../app/character/creation/EssenceIcon';
import { Badge } from './ui/badge';

type IdentityPreviewPillsProps = {
  essenceKey?: SagaDriveEssenceKey;
  essenceLabel?: string;
  archetypeKey?: SagaDriveArchetypeKey;
  archetypeLabel?: string;
  className?: string;
};

export function IdentityPreviewPills({
  essenceKey,
  essenceLabel,
  archetypeKey,
  archetypeLabel,
  className = '',
}: IdentityPreviewPillsProps) {
  const showEssence = Boolean(essenceKey && essenceLabel?.trim());
  const showArchetype = Boolean(archetypeKey && archetypeLabel?.trim());

  if (!showEssence && !showArchetype) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {showEssence && essenceKey ? (
        <Badge
          variant="outline"
          className="flex min-w-0 items-center gap-1.5 rounded-full border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-100"
          aria-label={`Essenz: ${essenceLabel}`}
        >
          <EssenceIcon essenceKey={essenceKey} className="h-3.5 w-3.5 shrink-0" />
          <span className="text-white/75">Essenz:</span>
          <span className="truncate text-white">{essenceLabel}</span>
        </Badge>
      ) : null}

      {showArchetype && archetypeKey ? (
        <Badge
          variant="outline"
          className="flex min-w-0 items-center gap-1.5 rounded-full border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100"
          aria-label={`Archetype: ${archetypeLabel}`}
        >
          <ArchetypeIcon archetypeKey={archetypeKey} className="h-3.5 w-3.5 shrink-0" />
          <span className="text-white/75">Archetype:</span>
          <span className="truncate text-white">{archetypeLabel}</span>
        </Badge>
      ) : null}
    </div>
  );
}
