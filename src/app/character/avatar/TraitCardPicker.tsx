/**
 * TraitCardPicker — card grid for one avatar trait group (live select, local loading/error).
 * Location: src/app/character/avatar/TraitCardPicker.tsx
 *
 * UX: one purpose (pick trait), large targets, selected ≠ color-only (ring + aria-pressed),
 * per-group loading, Retry preserves other editor state.
 */

import { useEffect, useRef, useState } from 'react';
import {
  isAllowedTraitId,
  listTraitOptionsForGroup,
  traitGroupLabel,
  type AvatarTraitGroupId,
} from '../../../domains/character/avatar';
import { Button } from '../../../shared/ui/button';

export type TraitGroupLoadState =
  | { status: 'idle' }
  | { status: 'loading'; traitId: string }
  | { status: 'error'; traitId: string; message: string };

interface TraitCardPickerProps {
  groupId: AvatarTraitGroupId;
  value: string;
  onChange: (traitId: string) => void;
  loadState: TraitGroupLoadState;
  onRetry?: (traitId: string) => void;
}

function traitSwatchClass(groupId: AvatarTraitGroupId, traitId: string): string {
  // Deterministic pastel from id hash — visual thumb without remote images.
  let hash = 0;
  const seed = `${groupId}:${traitId}`;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 42% 38%)`;
}

export function TraitCardPicker({
  groupId,
  value,
  onChange,
  loadState,
  onRetry,
}: TraitCardPickerProps) {
  const options = listTraitOptionsForGroup(groupId);
  const label = traitGroupLabel(groupId);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep focus inside group when selection changes via keyboard.
    if (!listRef.current) return;
    const selected = listRef.current.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (selected && document.activeElement?.closest('[data-trait-card-picker]') === listRef.current) {
      selected.focus();
    }
  }, [value]);

  return (
    <div className="space-y-2" data-trait-group={groupId}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {loadState.status === 'loading' && (
          <span className="text-xs text-muted-foreground" role="status">
            Lade …
          </span>
        )}
      </div>

      <div
        ref={listRef}
        data-trait-card-picker
        role="listbox"
        aria-label={label}
        className="grid max-w-full grid-cols-2 gap-2 overflow-x-hidden sm:grid-cols-2"
      >
        {options.map((option) => {
          const selected = option.id === value;
          const loadingThis =
            loadState.status === 'loading' && loadState.traitId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-pressed={selected}
              disabled={loadState.status === 'loading'}
              onClick={() => {
                if (!isAllowedTraitId(groupId, option.id)) return;
                onChange(option.id);
              }}
              className={`flex min-h-14 touch-manipulation flex-col items-stretch gap-1 rounded-lg border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 ${
                selected
                  ? 'border-primary ring-2 ring-primary/70 bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <span
                className="h-8 w-full rounded-md"
                style={{ background: traitSwatchClass(groupId, option.id) }}
                aria-hidden
              />
              <span className="text-sm font-medium leading-tight">{option.label}</span>
              {loadingThis && (
                <span className="text-[10px] text-amber-600 dark:text-amber-300">Wird angewendet …</span>
              )}
            </button>
          );
        })}
      </div>

      {loadState.status === 'error' && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 px-2.5 py-2 text-xs text-red-100"
          role="alert"
        >
          <span className="min-w-0 flex-1">{loadState.message}</span>
          {onRetry && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => onRetry(loadState.traitId)}
            >
              Erneut versuchen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Local async apply helper — simulates trait load, fails closed on unknown ids.
 * Stale generations are discarded by the caller via generation counter.
 */
export function useTraitApplyController(
  apply: (groupId: AvatarTraitGroupId, traitId: string) => void,
) {
  const [states, setStates] = useState<
    Partial<Record<AvatarTraitGroupId, TraitGroupLoadState>>
  >({});
  const generationRef = useRef<Partial<Record<AvatarTraitGroupId, number>>>({});

  const setIdle = (groupId: AvatarTraitGroupId) => {
    setStates((prev) => ({ ...prev, [groupId]: { status: 'idle' } }));
  };

  const requestApply = (groupId: AvatarTraitGroupId, traitId: string) => {
    if (!isAllowedTraitId(groupId, traitId)) {
      setStates((prev) => ({
        ...prev,
        [groupId]: {
          status: 'error',
          traitId,
          message: 'Dieses Merkmal ist nicht erlaubt.',
        },
      }));
      return;
    }

    const generation = (generationRef.current[groupId] ?? 0) + 1;
    generationRef.current[groupId] = generation;
    setStates((prev) => ({
      ...prev,
      [groupId]: { status: 'loading', traitId },
    }));

    window.setTimeout(() => {
      if (generationRef.current[groupId] !== generation) return;
      try {
        apply(groupId, traitId);
        setIdle(groupId);
      } catch {
        setStates((prev) => ({
          ...prev,
          [groupId]: {
            status: 'error',
            traitId,
            message: 'Merkmal konnte nicht angewendet werden.',
          },
        }));
      }
    }, 120);
  };

  return {
    getState(groupId: AvatarTraitGroupId): TraitGroupLoadState {
      return states[groupId] ?? { status: 'idle' };
    },
    requestApply,
  };
}
