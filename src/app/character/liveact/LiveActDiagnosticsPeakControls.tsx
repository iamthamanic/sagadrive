/**
 * LiveActDiagnosticsPeakControls — reset / copy per-stage peaks for webcam fidelity audits.
 * Location: src/app/character/liveact/LiveActDiagnosticsPeakControls.tsx
 *
 * Used under LiveActDiagnosticsChannelTable and after stepped calibration. "Kopieren"
 * writes numbers-only JSON to the clipboard (user-initiated; no video, no landmarks).
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../shared/ui/button';

interface LiveActDiagnosticsPeakControlsProps {
  /** Engine frames accumulated since the last reset. */
  frames: number;
  onReset?: () => void;
  /** Serialized peaks for the clipboard. */
  getExportJson: () => string;
  /** Hide Reset when the host owns a one-shot calibration export. */
  showReset?: boolean;
  /** Prefix before the frame count. */
  framesLabel?: string;
  testId?: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

const COPY_FEEDBACK_MS = 2000;
const buttonClass = 'h-6 px-1.5 text-[10px] text-slate-300 hover:bg-white/10 hover:text-slate-50';

export function LiveActDiagnosticsPeakControls({
  frames,
  onReset,
  getExportJson,
  showReset = true,
  framesLabel = 'Peaks',
  testId = 'liveact-diagnostics-peaks',
}: LiveActDiagnosticsPeakControlsProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    },
    [],
  );

  const showFeedback = (state: CopyState) => {
    setCopyState(state);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setCopyState('idle'), COPY_FEEDBACK_MS);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getExportJson());
      showFeedback('copied');
    } catch (error) {
      console.warn('[liveact] peak export: clipboard write failed', error);
      showFeedback('failed');
    }
  };

  return (
    <div
      className="flex items-center gap-1 px-1 pt-1 text-[10px] text-slate-400"
      data-testid={testId}
    >
      <span className="mr-auto tabular-nums" title="Min/Max pro Stufe seit dem letzten Reset">
        {framesLabel}: {frames} Frames
      </span>
      {showReset && onReset ? (
        <Button type="button" size="sm" variant="ghost" className={buttonClass} onClick={onReset}>
          Reset
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={buttonClass}
        disabled={frames === 0}
        onClick={() => void copy()}
        data-testid={`${testId}-copy`}
      >
        {copyState === 'copied' ? 'Kopiert' : copyState === 'failed' ? 'Fehlgeschlagen' : 'Kopieren'}
      </Button>
    </div>
  );
}
