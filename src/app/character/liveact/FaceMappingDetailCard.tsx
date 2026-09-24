/**
 * FaceMappingDetailCard — selected-marker detail popup for Face-Rig Editor.
 * Location: src/app/character/liveact/FaceMappingDetailCard.tsx
 *
 * PDF behavior: Körperteil-Silhouette + binding label + pulsing landmark matching
 * the highlighted Character marker (bidirectional selection feedback).
 */

import type { SagaDriveFaceAnchorId } from '../../../domains/character/avatar/face-anchor-contract';
import {
  FACE_MAPPING_ANCHOR_LABEL_DE,
  resolveFaceMappingMarkerStatus,
  type SagaDriveFaceMappingDraftV1,
} from '../../../domains/character/avatar/face-mapping-draft-v1';
import { resolveFaceMappingFeatureGroupDe } from '../../../domains/character/avatar/face-mapping-guide-geometry';
import { FaceMappingFeatureIcon } from './FaceMappingFeatureIcon';

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
          className="relative shrink-0"
          aria-hidden
          data-testid="face-mapping-detail-pulse"
        >
          <FaceMappingFeatureIcon anchorId={selectedAnchorId} size="lg" pulse />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-primary">{feature}</p>
          <p className="truncate text-xs font-medium text-white">{bindingLabel}</p>
          <p className="text-[10px] text-slate-400">
            Marker · {statusLabelDe(status)} · pulsiert auf Charakter + Icon
          </p>
        </div>
      </div>
    </div>
  );
}
