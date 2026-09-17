/**
 * AvatarAnimationPreviewControls — Idle/Walk/Combat/Emote preview switcher (#8).
 * Location: src/app/character/avatar/AvatarAnimationPreviewControls.tsx
 *
 * Only supported actions are activatable; unsupported show a DE explanation.
 * Respects prefers-reduced-motion (no autoplay escalation).
 */

import { useEffect, useState } from 'react';
import {
  AVATAR_ANIMATION_ACTIONS,
  animationActionLabelDe,
  type AvatarAnimationActionId,
  type AvatarAnimationSupportResult,
} from '../../../domains/character/avatar';

interface AvatarAnimationPreviewControlsProps {
  support: AvatarAnimationSupportResult | null;
  activeAction: AvatarAnimationActionId | null;
  message?: string;
  onSelect: (actionId: AvatarAnimationActionId) => void;
  disabled?: boolean;
}

export function AvatarAnimationPreviewControls({
  support,
  activeAction,
  message,
  onSelect,
  disabled,
}: AvatarAnimationPreviewControlsProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (disabled || !support) return;
      const map: Record<string, AvatarAnimationActionId> = {
        '1': 'idle',
        '2': 'walk',
        '3': 'combat',
        '4': 'emote',
      };
      const action = map[event.key];
      if (!action) return;
      if (!support.supported.includes(action)) return;
      onSelect(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled, onSelect, support]);

  if (!support) {
    return (
      <div
        className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
        data-avatar-animation-status="waiting"
        role="status"
      >
        Animation wartet auf Rig-Analyse …
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
      data-avatar-animation-status="ready"
      data-avatar-animation-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="group"
      aria-label="Avatar-Animationsvorschau"
    >
      <p className="font-medium">Animation</p>
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_ANIMATION_ACTIONS.map((actionId) => {
          const supported = support.supported.includes(actionId);
          const reason = support.unsupportedReasons[actionId];
          const isActive = activeAction === actionId;
          return (
            <button
              key={actionId}
              type="button"
              className={`min-h-11 rounded border px-3 py-1.5 font-medium transition-colors ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : supported
                    ? 'border-border bg-background hover:border-accent'
                    : 'cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground opacity-70'
              }`}
              data-avatar-animation-action={actionId}
              data-avatar-animation-supported={supported ? 'true' : 'false'}
              aria-pressed={isActive}
              aria-disabled={!supported || disabled}
              title={supported ? animationActionLabelDe(actionId) : reason}
              disabled={disabled || !supported}
              onClick={() => {
                if (!supported || disabled) return;
                onSelect(actionId);
              }}
            >
              {animationActionLabelDe(actionId)}
            </button>
          );
        })}
      </div>
      {message ? (
        <p className="text-muted-foreground" data-avatar-animation-message>
          {message}
        </p>
      ) : null}
      {reducedMotion ? (
        <p className="text-[10px] text-muted-foreground">
          Reduzierte Bewegung aktiv — kein Autoplay, Crossfade aus.
        </p>
      ) : null}
      <p className="text-[10px] text-muted-foreground">
        Tasten 1–4 · Vertrag {support.contractVersion}
      </p>
    </div>
  );
}
