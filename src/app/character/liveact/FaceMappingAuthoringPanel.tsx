/**
 * FaceMappingAuthoringPanel — Face Setup marker list + detail card + actions.
 * Location: src/app/character/liveact/FaceMappingAuthoringPanel.tsx
 *
 * Renders below the AvatarCanvas (not over the 3D face). Session-local draft only.
 * Detail card mirrors PDF: selected feature + pulsing point synced with viewport.
 * Auto Mapping (#421) proposes anchors; never auto-publishes.
 * Marker rows show manual screen coords and last Auto proposal side-by-side.
 */

import { useEffect, useRef, useState } from 'react';
import type { SagaDriveFaceAnchorId } from '../../../domains/character/avatar/face-anchor-contract';
import type { FaceMappingAutoAnchorOutcome } from '../../../domains/character/avatar/face-mapping-auto-v1';
import { stringifyFaceMappingCompareExport } from '../../../domains/character/avatar/face-mapping-auto-v1';
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
import { FaceMappingFeatureIcon } from './FaceMappingFeatureIcon';

/** Canvas CSS pixels for a placed (manual/current) marker. */
export interface FaceMappingManualCoordV1 {
  readonly x: number;
  readonly y: number;
  /** Compact mesh token, e.g. HeadMesh/t12 */
  readonly meshLabel: string | null;
}

/** Last Auto Mapping proposal for one anchor (may differ from applied draft). */
export interface FaceMappingAutoCoordV1 {
  readonly outcome: FaceMappingAutoAnchorOutcome;
  readonly x: number | null;
  readonly y: number | null;
  readonly meshLabel: string | null;
}

interface FaceMappingAuthoringPanelProps {
  draft: SagaDriveFaceMappingDraftV1;
  missMessage: string | null;
  autoBusy?: boolean;
  autoStatusMessage?: string | null;
  /** Current draft → screen projection (updates with camera). */
  manualCoords?: Readonly<Partial<Record<SagaDriveFaceAnchorId, FaceMappingManualCoordV1>>>;
  /** Last Auto Mapping session proposals (kept for compare even after apply). */
  autoCoords?: Readonly<Partial<Record<SagaDriveFaceAnchorId, FaceMappingAutoCoordV1>>>;
  onSelect: (anchorId: SagaDriveFaceAnchorId) => void;
  onClearSelected: () => void;
  onReset: () => void;
  onCancel: () => void;
  onAutoMapping?: () => void;
  /** Optional authoring provenance for JSON export (source per anchor). */
  getAuthoringMeta?: () => Readonly<
    Partial<Record<SagaDriveFaceAnchorId, { source: string; confidence?: number; reviewed?: boolean }>>
  >;
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

function fmtPx(x: number, y: number): string {
  return `${Math.round(x)}×${Math.round(y)}`;
}

function autoOutcomeDe(outcome: FaceMappingAutoAnchorOutcome): string {
  switch (outcome) {
    case 'mapped':
      return 'ok';
    case 'raycast_miss':
      return 'miss';
    case 'missing_landmark':
      return 'kein LM';
    case 'low_confidence':
      return 'unsicher';
    case 'skipped_protected':
      return 'geschützt';
    default:
      return outcome;
  }
}

function MarkerCoordCompare({
  manual,
  auto,
}: {
  manual: FaceMappingManualCoordV1 | undefined;
  auto: FaceMappingAutoCoordV1 | undefined;
}) {
  if (!manual && !auto) return null;

  let deltaLabel: string | null = null;
  if (
    manual &&
    auto &&
    auto.x != null &&
    auto.y != null &&
    Number.isFinite(auto.x) &&
    Number.isFinite(auto.y)
  ) {
    const d = Math.hypot(auto.x - manual.x, auto.y - manual.y);
    deltaLabel = `Δ${Math.round(d)}`;
  }

  return (
    <span
      className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[9px] leading-tight opacity-90"
      data-testid="face-mapping-marker-coords"
    >
      {manual ? (
        <span title={manual.meshLabel ?? undefined} data-testid="face-mapping-coord-manual">
          <span className="text-emerald-200/90">Manuell</span>{' '}
          {fmtPx(manual.x, manual.y)}
          {manual.meshLabel ? (
            <span className="ml-1 opacity-70">{manual.meshLabel}</span>
          ) : null}
        </span>
      ) : (
        <span className="opacity-50" data-testid="face-mapping-coord-manual-empty">
          Manuell —
        </span>
      )}
      {auto ? (
        <span title={auto.meshLabel ?? undefined} data-testid="face-mapping-coord-auto">
          <span className="text-cyan-200/90">Auto</span>{' '}
          {auto.x != null && auto.y != null ? fmtPx(auto.x, auto.y) : '—'}
          {auto.outcome !== 'mapped' ? (
            <span className="ml-1 text-amber-200/80">({autoOutcomeDe(auto.outcome)})</span>
          ) : null}
          {deltaLabel ? <span className="ml-1 opacity-70">{deltaLabel}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

export function FaceMappingAuthoringPanel({
  draft,
  missMessage,
  autoBusy = false,
  autoStatusMessage = null,
  manualCoords = {},
  autoCoords = {},
  onSelect,
  onClearSelected,
  onReset,
  onCancel,
  onAutoMapping,
  getAuthoringMeta,
}: FaceMappingAuthoringPanelProps) {
  const summary = validateFaceMappingDraft(draft);
  const selectedId = draft.selectedAnchorId;
  const hasAnyAuto = Object.keys(autoCoords).length > 0;
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const copyJson = async () => {
    try {
      const metaRaw = getAuthoringMeta?.() ?? {};
      const meta = Object.fromEntries(
        Object.entries(metaRaw).map(([id, row]) => [
          id,
          {
            source: row.source as 'auto' | 'manual' | 'manual_override',
            ...(row.confidence != null ? { confidence: row.confidence } : {}),
            ...(row.reviewed != null ? { reviewed: row.reviewed } : {}),
          },
        ]),
      );
      const json = stringifyFaceMappingCompareExport({
        draft,
        manualCoords,
        autoCoords,
        meta,
      });
      await navigator.clipboard.writeText(json);
      setCopyState('copied');
    } catch (error) {
      console.warn('[face-mapping] compare JSON clipboard failed', error);
      setCopyState('failed');
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyState('idle'), 2000);
  };

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
        Scroll zoomen. Auf leerer Fläche ziehen = Kamera verschieben (z. B. nach oben zur Stirn).
        Marker greifen und setzen; Guides folgen live. Auto Mapping ist nur ein Vorschlag.
        {hasAnyAuto
          ? ' Koordinaten: Manuell (aktuell) · Auto (letzter Lauf) · Δ = Abstand px.'
          : ' Gesetzte Marker zeigen Screen-Koordinaten (px).'}
      </p>

      {onAutoMapping ? (
        <div className="flex gap-1.5 border-b border-white/10 px-2 pb-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 flex-1 border-primary/40 text-[11px] text-primary hover:bg-primary/10"
            disabled={autoBusy}
            onClick={onAutoMapping}
            data-testid="face-mapping-auto"
          >
            {autoBusy ? 'Auto Mapping…' : 'Auto Mapping'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-white/15 text-[11px]"
            disabled={summary.setCount === 0 && !hasAnyAuto}
            onClick={() => void copyJson()}
            data-testid="face-mapping-copy-json"
            title="Manuell + Auto Koordinaten/Bindings als JSON kopieren"
          >
            {copyState === 'copied'
              ? 'Kopiert'
              : copyState === 'failed'
                ? 'Fehlgeschlagen'
                : 'JSON kopieren'}
          </Button>
        </div>
      ) : (
        <div className="flex gap-1.5 border-b border-white/10 px-2 pb-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 w-full border-white/15 text-[11px]"
            disabled={summary.setCount === 0 && !hasAnyAuto}
            onClick={() => void copyJson()}
            data-testid="face-mapping-copy-json"
            title="Manuell + Auto Koordinaten/Bindings als JSON kopieren"
          >
            {copyState === 'copied'
              ? 'Kopiert'
              : copyState === 'failed'
                ? 'Fehlgeschlagen'
                : 'JSON kopieren'}
          </Button>
        </div>
      )}

      {selectedId ? <FaceMappingDetailCard draft={draft} selectedAnchorId={selectedId} /> : null}

      {autoStatusMessage ? (
        <p
          className="mx-3 mb-1 mt-2 rounded-sm bg-primary/10 px-2 py-1 text-[10px] text-cyan-100"
          role="status"
          data-testid="face-mapping-auto-status"
        >
          {autoStatusMessage}
        </p>
      ) : null}

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
                const manual = manualCoords[id];
                const auto = autoCoords[id];
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`flex w-full flex-col gap-0.5 rounded-sm border px-2 py-1.5 text-left text-[11px] ${statusClass(status, selected)} ${selected ? 'animate-pulse' : ''}`}
                      aria-pressed={selected}
                      data-testid={`face-mapping-marker-${id}`}
                      onClick={() => onSelect(id)}
                    >
                      <span className="flex w-full items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <FaceMappingFeatureIcon
                            anchorId={id}
                            size="sm"
                            pulse={selected}
                            className="shrink-0"
                          />
                          <span className="truncate">{FACE_MAPPING_ANCHOR_LABEL_DE[id]}</span>
                        </span>
                        <span className="shrink-0 text-[10px] opacity-90">
                          {statusLabelDe(status)}
                        </span>
                      </span>
                      <MarkerCoordCompare manual={manual} auto={auto} />
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
      </div>
      <p className="px-2 pb-2 text-[10px] text-slate-500">
        Speichern sitzt unten am Viewport — schreibt Face Mapping auf den Charakter (danach Charakter speichern).
      </p>
    </aside>
  );
}
