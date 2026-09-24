/**
 * FaceMappingDetailCard — selected-marker detail popup for Face-Rig Editor.
 * Location: src/app/character/liveact/FaceMappingDetailCard.tsx
 *
 * PDF behavior: shows body-part feature + binding label + pulsing point matching
 * the highlighted Character marker (bidirectional selection feedback).
 */

import type { SagaDriveFaceAnchorId } from '../../../domains/character/avatar/face-anchor-contract';
import {
  FACE_MAPPING_ANCHOR_LABEL_DE,
  resolveFaceMappingMarkerStatus,
  type SagaDriveFaceMappingDraftV1,
} from '../../../domains/character/avatar/face-mapping-draft-v1';
import { resolveFaceMappingFeatureGroupDe } from '../../../domains/character/avatar/face-mapping-guide-geometry';

interface FaceMappingDetailCardProps {
  draft: SagaDriveFaceMappingDraftV1;
  selectedAnchorId: SagaDriveFaceAnchorId;
}

function statusLabelDe(status: string): string {
  switch (status) {
    case 'missing':
      return 'fehlt';
    case 'set':
      return 'gesetzt';
    case 'invalid':
      return 'ungültig';
    case 'reviewed':
      return 'reviewed';
    default:
      return status;
  }
}

export function FaceMappingDetailCard({ draft, selectedAnchorId }: FaceMappingDetailCardProps) {
  const feature = resolveFaceMappingFeatureGroupDe(selectedAnchorId);
  const bindingLabel = FACE_MAPPING_ANCHOR_LABEL_DE[selectedAnchorId];
  const status = resolveFaceMappingMarkerStatus(draft, selectedAnchorId);

  return (
    <div
      className="mx-3 mt-2 rounded-md border border-primary/40 bg-slate-900/95 px-3 py-2 shadow-md"
      data-testid="face-mapping-detail-card"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/50 bg-slate-950"
          aria-hidden
          data-testid="face-mapping-detail-pulse"
        >
          <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-primary shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-primary">{feature}</p>
          <p className="truncate text-xs font-medium text-white">{bindingLabel}</p>
          <p className="text-[10px] text-slate-400">
            Marker · {statusLabelDe(status)} · pulsiert auf Charakter
          </p>
        </div>
      </div>
    </div>
  );
}
