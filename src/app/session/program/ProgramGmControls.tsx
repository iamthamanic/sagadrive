/**
 * ProgramGmControls — GM/Director Program source/layout switch (#365).
 * Location: src/app/session/program/ProgramGmControls.tsx
 */
import { useState } from 'react';
import { Button } from '../../../shared/ui/button';
import type {
  ProgramLayoutKind,
  ProgramPresentationCommandInput,
  ProgramSourceKind,
} from '../../../domains/session/presentation/program-presentation';

type ProgramGmControlsProps = {
  isSwitching: boolean;
  onSwitch: (input: ProgramPresentationCommandInput) => Promise<boolean>;
};

export function ProgramGmControls({ isSwitching, onSwitch }: ProgramGmControlsProps) {
  const [sourceKind, setSourceKind] = useState<ProgramSourceKind>('shared-scene');
  const [layoutKind, setLayoutKind] = useState<ProgramLayoutKind>('fullscreen-16x9');
  const [overlayText, setOverlayText] = useState('');

  const publish = async () => {
    const source =
      sourceKind === 'look'
        ? ({ kind: 'look', lookId: null } as const)
        : ({ kind: sourceKind } as const);
    await onSwitch({
      source,
      layout: { kind: layoutKind },
      overlay: overlayText.trim()
        ? { kind: 'title', text: overlayText.trim() }
        : null,
    });
  };

  return (
    <section
      className="space-y-3 rounded-md border border-border p-3"
      data-program-gm="v1"
      aria-label="Program Output steuern"
    >
      <h3 className="text-sm font-medium">Program Output</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">
          Quelle
          <select
            className="select select-bordered select-sm w-full"
            value={sourceKind}
            onChange={(e) => setSourceKind(e.target.value as ProgramSourceKind)}
            data-program-source-select
          >
            <option value="shared-scene">Shared Scene</option>
            <option value="neutral">Neutral</option>
            <option value="look">Look (Fallback)</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Layout
          <select
            className="select select-bordered select-sm w-full"
            value={layoutKind}
            onChange={(e) => setLayoutKind(e.target.value as ProgramLayoutKind)}
            data-program-layout-select
          >
            <option value="fullscreen-16x9">16:9 Fullscreen</option>
            <option value="letterbox">Letterbox</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Overlay-Titel (öffentlich)
        <input
          className="input input-bordered input-sm w-full"
          value={overlayText}
          onChange={(e) => setOverlayText(e.target.value)}
          maxLength={120}
          placeholder="optional"
          data-program-overlay-input
        />
      </label>
      <Button
        type="button"
        size="sm"
        disabled={isSwitching}
        onClick={() => void publish()}
        data-program-publish
      >
        {isSwitching ? 'Wird gesetzt…' : 'Program setzen'}
      </Button>
    </section>
  );
}
