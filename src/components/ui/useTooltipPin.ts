"use client";

import { useCallback, useState } from "react";

export type UseTooltipPinOptions = {
  /** Controlled pinned state (click-to-stay). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
};

/**
 * useTooltipPin — Hover preview + click-to-pin open state for Radix tooltips.
 * Hover opens temporarily; click toggles pinned mode until dismiss, outside click, or Escape.
 * Location: src/components/ui/useTooltipPin.ts
 */
export function useTooltipPin(options: UseTooltipPinOptions = {}) {
  const { open: controlledPinned, onOpenChange, defaultOpen = false } = options;

  const [pinnedInternal, setPinnedInternal] = useState(defaultOpen);
  const [hoverOpen, setHoverOpen] = useState(false);

  const isPinnedControlled = controlledPinned !== undefined;
  const pinned = isPinnedControlled ? controlledPinned : pinnedInternal;

  const setPinned = useCallback(
    (nextPinned: boolean) => {
      if (isPinnedControlled) {
        onOpenChange?.(nextPinned);
        return;
      }
      setPinnedInternal(nextPinned);
      onOpenChange?.(nextPinned);
    },
    [isPinnedControlled, onOpenChange],
  );

  const open = pinned || hoverOpen;

  const togglePin = useCallback(() => {
    if (pinned) {
      setPinned(false);
      setHoverOpen(false);
      return;
    }
    setPinned(true);
  }, [pinned, setPinned]);

  const dismiss = useCallback(() => {
    setPinned(false);
    setHoverOpen(false);
  }, [setPinned]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (pinned) {
        return;
      }
      setHoverOpen(nextOpen);
    },
    [pinned],
  );

  return {
    open,
    pinned,
    hoverOpen,
    togglePin,
    dismiss,
    onOpenChange: handleOpenChange,
  };
}
