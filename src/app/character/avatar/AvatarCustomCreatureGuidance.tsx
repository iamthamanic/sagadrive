/**
 * AvatarCustomCreatureGuidance — DE copy for Custom Creature Original path (#266).
 * Location: src/app/character/avatar/AvatarCustomCreatureGuidance.tsx
 *
 * Shown after import analysis when anatomy is custom-creature.
 * Does not invent capabilities; conversion remains optional interpretation.
 */

import {
  buildCustomCreatureFlowGuidance,
  type ImportAnalysisSummaryV1,
} from '../../../domains/character/avatar';

interface AvatarCustomCreatureGuidanceProps {
  summary: ImportAnalysisSummaryV1;
}

export function AvatarCustomCreatureGuidance({
  summary,
}: AvatarCustomCreatureGuidanceProps) {
  if (summary.anatomy !== 'custom-creature' && summary.flowStatus !== 'ready-custom') {
    return null;
  }
  const guidance = buildCustomCreatureFlowGuidance();

  return (
    <aside
      className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs"
      aria-label="Eigener Körper Hinweise"
      data-avatar-custom-creature-guidance
    >
      <p className="text-sm font-medium" data-avatar-custom-recommend-original>
        {guidance.headlineDe}
      </p>
      <p className="text-muted-foreground">{guidance.detailDe}</p>
      <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
        <li data-avatar-custom-wardrobe-limit>{guidance.wardrobeLimitationDe}</li>
        <li data-avatar-custom-autorig-optional>{guidance.autoRigOptionalDe}</li>
        <li data-avatar-custom-conversion-interp>
          {guidance.conversionInterpretationDe}
        </li>
      </ul>
    </aside>
  );
}
