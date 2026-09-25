/**
 * LiveActCapabilityInspector — read-only Input / Mapping / Avatar matrix (#333).
 * Location: src/app/character/liveact/LiveActCapabilityInspector.tsx
 *
 * Shown in viewport gear; uses LiveActCapabilitiesV1 only (no second rig scan).
 */

import {
  buildLiveActCapabilityInspectorRows,
  type LiveActCapabilitiesV1,
} from '../../../domains/character/liveact';

interface LiveActCapabilityInspectorProps {
  capabilities: LiveActCapabilitiesV1 | null;
  /** When true, Input column reflects live face tracking (ephemeral). */
  inputLive: boolean;
}

function axisMark(ok: boolean, live: boolean): string {
  if (!ok) return '—';
  return live ? '✓' : '·';
}

export function LiveActCapabilityInspector({
  capabilities,
  inputLive,
}: LiveActCapabilityInspectorProps) {
  if (!capabilities) {
    return (
      <p
        className="px-1 py-1 text-[10px] text-slate-400"
        data-testid="liveact-capability-inspector-empty"
      >
        Capability-Daten nach Modell-Laden verfügbar.
      </p>
    );
  }

  const rows = buildLiveActCapabilityInspectorRows(capabilities);

  return (
    <div data-testid="liveact-capability-inspector">
      <p
        className="px-1 pb-1 text-[10px] leading-snug text-slate-400"
        data-testid="liveact-capability-runtime-summary"
      >
        Runtime {capabilities.runtimeKind.toUpperCase()} · Gaze{' '}
        <span data-testid="liveact-capability-gaze-path">{capabilities.gazeDrivePath}</span>
        {' · '}
        Expressions {capabilities.activeFaceChannelCount}/{capabilities.totalFaceChannelCount}
      </p>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 px-1 pb-1 text-[9px] font-medium uppercase tracking-wide text-slate-500">
        <span>Kanal</span>
        <span className="text-right">Input</span>
        <span className="text-right">Map</span>
        <span className="text-right">Avatar</span>
      </div>
      <ul className="max-h-40 space-y-0.5 overflow-y-auto px-1 text-[10px] text-slate-300">
        {rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 rounded-sm py-0.5"
            data-liveact-inspector-row={row.id}
          >
            <span className="truncate text-slate-200" title={row.labelDe}>
              {row.labelDe}
            </span>
            <span
              className="text-right tabular-nums"
              data-liveact-inspector-input={row.input ? (inputLive ? 'live' : 'ready') : 'no'}
            >
              {axisMark(row.input, inputLive)}
            </span>
            <span
              className="text-right tabular-nums"
              data-liveact-inspector-mapping={row.mapping ? 'yes' : 'no'}
            >
              {row.mapping ? '✓' : '—'}
            </span>
            <span
              className="text-right tabular-nums"
              data-liveact-inspector-avatar={row.avatar ? 'yes' : 'no'}
            >
              {row.avatar ? '✓' : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
