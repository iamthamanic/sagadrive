/**
 * LiveActDiagnosticsChannelTable — compact RAW→APPLIED channel inspector (#403).
 * Location: src/app/character/liveact/LiveActDiagnosticsChannelTable.tsx
 *
 * Gear-panel table (not overlaid on the face). Polls diagnosticsV2Ref via rAF
 * while visible; no setState on the LiveAct hot path when the panel is closed.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  LIVEACT_DIAGNOSTICS_V2_SIGNAL_KEYS,
  type LiveActAppliedSignalV1,
  type LiveActDiagnosticsV2Snapshot,
} from '../../../domains/character/liveact';

interface LiveActDiagnosticsChannelTableProps {
  diagnosticsV2Ref: RefObject<LiveActDiagnosticsV2Snapshot | null>;
  /** When false, stop rAF polling and clear the table. */
  active: boolean;
}

function fmt(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

function appliedFmt(signal: LiveActAppliedSignalV1 | undefined): string {
  if (!signal || signal.status === 'unavailable') return '—';
  return fmt(signal.value);
}

export function LiveActDiagnosticsChannelTable({
  diagnosticsV2Ref,
  active,
}: LiveActDiagnosticsChannelTableProps) {
  const [snapshot, setSnapshot] = useState<LiveActDiagnosticsV2Snapshot | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setSnapshot(diagnosticsV2Ref.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [active, diagnosticsV2Ref]);

  if (!active) return null;

  if (!snapshot) {
    return (
      <p
        className="px-1 py-1 text-[10px] text-slate-400"
        data-testid="liveact-diagnostics-channel-table-empty"
      >
        RAW→APPLIED erscheint bei aktivem Tracking.
      </p>
    );
  }

  return (
    <div data-testid="liveact-diagnostics-channel-table">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-1 pb-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
        <span>Kanal</span>
        <span className="text-right">Raw</span>
        <span className="text-right">Ret</span>
        <span className="text-right">App</span>
      </div>
      <ul className="max-h-32 space-y-0.5 overflow-y-auto px-1 text-[10px] text-slate-300">
        {LIVEACT_DIAGNOSTICS_V2_SIGNAL_KEYS.map((key) => {
          const raw = snapshot.stages.raw[key];
          const ret = snapshot.stages.retargeted[key];
          const app = snapshot.stages.applied[key];
          return (
            <li
              key={key}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 rounded-sm py-0.5"
              data-liveact-diag-row={key}
            >
              <span className="truncate text-slate-200" title={key}>
                {key.replace(/^face\./, '')}
              </span>
              <span className="text-right tabular-nums">{fmt(raw)}</span>
              <span className="text-right tabular-nums">{fmt(ret)}</span>
              <span className="text-right tabular-nums">{appliedFmt(app)}</span>
            </li>
          );
        })}
      </ul>
      {snapshot.trackingLost ? (
        <p className="px-1 pt-1 text-[10px] text-amber-400/90">Tracking lost → Neutral</p>
      ) : null}
    </div>
  );
}
