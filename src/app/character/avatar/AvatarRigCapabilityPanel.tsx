/**
 * AvatarRigCapabilityPanel — read-only DE capability readout for analyzed avatars (#6).
 * Location: src/app/character/avatar/AvatarRigCapabilityPanel.tsx
 *
 * Never shows raw bone strings. Unsupported features are listed as limitations.
 */

import {
  capabilityFlagLabel,
  type AvatarRigAnalysisResult,
} from '../../../domains/character/avatar';

interface AvatarRigCapabilityPanelProps {
  analysis: AvatarRigAnalysisResult | null;
}

const STATUS_LABEL: Record<AvatarRigAnalysisResult['status'], string> = {
  analyzing: 'Analysiere Rig …',
  ready: 'Rig bereit',
  limited: 'Eingeschränkt nutzbar',
  failed: 'Analyse fehlgeschlagen',
};

export function AvatarRigCapabilityPanel({ analysis }: AvatarRigCapabilityPanelProps) {
  if (!analysis) {
    return (
      <div
        className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
        data-avatar-rig-status="analyzing"
        role="status"
      >
        Rig-Analyse wartet auf geladenes Modell …
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
      data-avatar-rig-status={analysis.status}
      role="status"
      aria-live="polite"
    >
      <p className="font-medium">{STATUS_LABEL[analysis.status]}</p>
      <p className="text-muted-foreground">{analysis.message}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Avatar-Fähigkeiten">
        {analysis.capabilities.flags.map((flag) => (
          <li
            key={flag}
            className="rounded border border-border bg-background px-2 py-0.5 font-medium"
            data-avatar-rig-flag={flag}
          >
            {capabilityFlagLabel(flag)}
          </li>
        ))}
      </ul>
      {analysis.capabilities.limitations.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground" aria-label="Einschränkungen">
          {analysis.capabilities.limitations.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-muted-foreground">
        Vertrag {analysis.rig.contractVersion}
      </p>
    </div>
  );
}
