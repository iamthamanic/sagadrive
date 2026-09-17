/**
 * AvatarFacialPreviewControls — compact Blink / Emotion / Viseme test controls (#11).
 * Location: src/app/character/avatar/AvatarFacialPreviewControls.tsx
 *
 * Only available expressions are activatable; missing shapes are omitted (not broken buttons).
 * Transient weights only — never persisted into character appearance.
 */

import {
  FACIAL_BLINK_KEY,
  FACIAL_EMOTION_KEYS,
  FACIAL_VISEME_KEYS,
  facialKeyLabelDe,
  type FacialAvailability,
  type FacialCanonicalKey,
} from '../../../domains/character/avatar';

interface AvatarFacialPreviewControlsProps {
  availability: FacialAvailability | null;
  activeKey: FacialCanonicalKey | null;
  message?: string;
  disabled?: boolean;
  onSet: (key: FacialCanonicalKey, weight: number) => void;
  onReset: () => void;
}

function ActionButton({
  facialKey,
  available,
  active,
  disabled,
  onSet,
}: {
  facialKey: FacialCanonicalKey;
  available: boolean;
  active: boolean;
  disabled?: boolean;
  onSet: (key: FacialCanonicalKey, weight: number) => void;
}) {
  if (!available) return null;
  return (
    <button
      type="button"
      className={`min-h-11 rounded border px-2.5 py-1.5 text-xs font-medium ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background hover:border-accent'
      }`}
      data-avatar-facial-key={facialKey}
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onSet(facialKey, facialKey === 'neutral' ? 1 : 1)}
    >
      {facialKeyLabelDe(facialKey)}
    </button>
  );
}

export function AvatarFacialPreviewControls({
  availability,
  activeKey,
  message,
  disabled,
  onSet,
  onReset,
}: AvatarFacialPreviewControlsProps) {
  if (!availability) {
    return (
      <div
        className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
        data-avatar-facial-status="waiting"
        role="status"
      >
        Facial wartet auf VRM …
      </div>
    );
  }

  const available = new Set(availability.available);
  const hasAny = availability.available.length > 0;

  return (
    <div
      className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
      data-avatar-facial-status={hasAny ? 'ready' : 'empty'}
      role="group"
      aria-label="Avatar-Gesichtsausdrücke"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Gesicht</p>
        <button
          type="button"
          className="min-h-11 rounded border border-border bg-background px-2.5 py-1 font-medium hover:border-accent"
          data-avatar-facial-reset
          disabled={disabled || !hasAny}
          onClick={onReset}
        >
          Neutral
        </button>
      </div>

      {!hasAny ? (
        <p className="text-muted-foreground">Keine Expressions am Modell — fail-soft.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5" aria-label="Blink">
            <ActionButton
              facialKey={FACIAL_BLINK_KEY}
              available={available.has(FACIAL_BLINK_KEY)}
              active={activeKey === FACIAL_BLINK_KEY}
              disabled={disabled}
              onSet={onSet}
            />
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Emotionen">
            {FACIAL_EMOTION_KEYS.map((key) => (
              <ActionButton
                key={key}
                facialKey={key}
                available={available.has(key)}
                active={activeKey === key}
                disabled={disabled}
                onSet={onSet}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Mundformen">
            {FACIAL_VISEME_KEYS.map((key) => (
              <ActionButton
                key={key}
                facialKey={key}
                available={available.has(key)}
                active={activeKey === key}
                disabled={disabled}
                onSet={onSet}
              />
            ))}
          </div>
        </>
      )}

      {message ? (
        <p className="text-muted-foreground" data-avatar-facial-message>
          {message}
        </p>
      ) : null}
      <p className="text-[10px] text-muted-foreground">Vertrag {availability.contractVersion}</p>
    </div>
  );
}
