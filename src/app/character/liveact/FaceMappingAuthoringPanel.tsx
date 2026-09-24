/**
 * FaceMappingAuthoringPanel — Face Setup marker list + detail card + actions.
 * Location: src/app/character/liveact/FaceMappingAuthoringPanel.tsx
 *
 * Renders below the AvatarCanvas (not over the 3D face). Session-local draft only.
 * Detail card mirrors PDF: selected feature + pulsing point synced with viewport.
 */

import type { SagaDriveFaceAnchorId } from '../../../domains/character/avatar/face-anchor-contract';
import {
  FACE_MAPPING_ANCHOR_LABEL_DE,
  FACE_MAPPING_MARKER_GROUP_DEFS,
  resolveFaceMappingMarkerStatus,
  validateFaceMappingDraft,
  type FaceMappingMarkerStatus,
  type SagaDriveFaceMappingDraftV1,
} from '../../../domains/character/avatar/face-mapping-draft-v1';
import { Button } from '../../../shared/ui/button';
import { FaceMappingDetailCard } from './FaceMappingDetailCard';

interface FaceMappingAuthoringPanelProps {
  draft: SagaDriveFaceMappingDraftV1;
  missMessage: string | null;
  onSelect: (anchorId: SagaDriveFaceAnchorId) => void;
  onClearSelected: () => void;
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
}

function statusLabelDe(status: FaceMappingMarkerStatus): string {
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

function statusClass(status: FaceMappingMarkerStatus, selected: boolean): string {
  // Selected: solid primary + white text (primary-foreground is dark on light themes).
  if (selected) return 'border-primary bg-primary text-white ring-2 ring-primary/40';
  switch (status) {
    case 'missing':
      return 'border-white/10 bg-slate-900/80 text-slate-300';
    case 'set':
      return 'border-amber-400/50 bg-amber-400/10 text-amber-100';
    case 'invalid':
      return 'border-red-400/50 bg-red-500/10 text-red-100';
    case 'reviewed':
      return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100';
    default:
      return 'border-white/10 bg-slate-900/80';
  }
}

export function FaceMappingAuthoringPanel({
  draft,
  missMessage,
  onSelect,
  onClearSelected,
  onReset,
  onCancel,
  onApply,
}: FaceMappingAuthoringPanelProps) {
  const summary = validateFaceMappingDraft(draft);
  const selectedId = draft.selectedAnchorId;

  return (
    <aside
      className="pointer-events-auto relative z-10 flex max-h-[min(42vh,22rem)] w-full flex-col rounded-md border border-white/15 bg-slate-950/95 text-slate-100 shadow-lg backdrop-blur-sm"
      data-testid="face-mapping-authoring-panel"
      aria-label="Face Mapping"
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-100">Face Mapping</p>
          <p className="text-[10px] text-slate-400">
            {summary.setCount} gesetzt · {summary.missingCount} fehlen
            {summary.invalidCount > 0 ? ` · ${summary.invalidCount} ungültig` : ''}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-slate-300"
          onClick={onCancel}
          data-testid="face-mapping-cancel"
        >
          Schließen
        </Button>
      </div>

      <p className="px-3 py-1.5 text-[10px] text-slate-400">
        Marker wählen → Detail zeigt Feature. Am 3D-Punkt greifen und ziehen; Guides folgen live.
      </p>

      {selectedId ? <FaceMappingDetailCard draft={draft} selectedAnchorId={selectedId} /> : null}

      {missMessage ? (
        <p
          className="mx-3 mb-1 mt-2 rounded-sm bg-amber-400/10 px-2 py-1 text-[10px] text-amber-100"
          role="status"
          data-testid="face-mapping-miss"
        >
          {missMessage}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-2">
        {FACE_MAPPING_MARKER_GROUP_DEFS.map((group) => (
          <div key={group.id} className="mb-2">
            <p className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {group.labelDe}
            </p>
            <ul className="flex flex-col gap-1">
              {group.anchorIds.map((id) => {
                const status = resolveFaceMappingMarkerStatus(draft, id);
                const selected = draft.selectedAnchorId === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between gap-2 rounded-sm border px-2 py-1.5 text-left text-[11px] ${statusClass(status, selected)} ${selected ? 'animate-pulse' : ''}`}
                      aria-pressed={selected}
                      data-testid={`face-mapping-marker-${id}`}
                      onClick={() => onSelect(id)}
                    >
                      <span className="truncate">{FACE_MAPPING_ANCHOR_LABEL_DE[id]}</span>
                      <span className="shrink-0 text-[10px] opacity-90">{statusLabelDe(status)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-white/10 p-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 flex-1 border-white/15 text-[11px]"
          disabled={!draft.selectedAnchorId}
          onClick={onClearSelected}
          data-testid="face-mapping-clear"
        >
          Löschen
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 flex-1 border-white/15 text-[11px]"
          onClick={onReset}
          data-testid="face-mapping-reset"
        >
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 w-full bg-primary text-white hover:bg-accent hover:text-accent-foreground"
          onClick={onApply}
          data-testid="face-mapping-apply"
        >
          Übernehmen
        </Button>
      </div>
    </aside>
  );
}
