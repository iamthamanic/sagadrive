/**
 * useCarouselScrollSync — Ref-based Embla scroll sync: index tracking, programmatic
 * scroll-to-selection, skipSelect guard, optional scroll-phase debounce for connectors.
 * Location: src/modules/characters/hooks/useCarouselScrollSync.ts
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CarouselApi } from '../../../components/ui/carousel';
import type { CarouselScrollPhase } from './carousel.types';

const SCROLL_SETTLE_MS = 120;

export interface UseCarouselScrollSyncOptions<TValue> {
  /** Number of carousel slides (stable count). */
  optionsLength: number;
  /** Resolve external selection to slide index; return -1 when not found. */
  getSelectedIndex: () => number;
  /** Read the value emitted for a slide index. */
  getValueAtIndex: (index: number) => TValue | undefined;
  /** True while no external selection exists yet (auto-select centered slide on mount). */
  isSelectionUnset: () => boolean;
  /** Gate programmatic scrollTo when external selection changes. */
  shouldSyncScrollToSelection: () => boolean;
  /** External selection identity — re-runs scroll sync when this changes. */
  selectionSyncKey: unknown;
  /** Whether a user-driven select at index should call onSelect. */
  shouldEmitSelect: (index: number, value: TValue) => boolean;
  onSelect: (value: TValue) => void;
  /** Connector overlays: freeze geometry while scrolling, remeasure on settled. */
  onScrollPhaseChange?: (phase: CarouselScrollPhase) => void;
  /** BackgroundCarousel: center click confirms; ArchetypeCarousel: center click is no-op. */
  selectOnCenterClick?: boolean;
}

export function useCarouselScrollSync<TValue>({
  optionsLength,
  getSelectedIndex,
  getValueAtIndex,
  isSelectionUnset,
  shouldSyncScrollToSelection,
  selectionSyncKey,
  shouldEmitSelect,
  onSelect,
  onScrollPhaseChange,
  selectOnCenterClick = false,
}: UseCarouselScrollSyncOptions<TValue>) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const skipSelectRef = useRef(false);

  const getSelectedIndexRef = useRef(getSelectedIndex);
  const getValueAtIndexRef = useRef(getValueAtIndex);
  const isSelectionUnsetRef = useRef(isSelectionUnset);
  const shouldSyncScrollRef = useRef(shouldSyncScrollToSelection);
  const shouldEmitSelectRef = useRef(shouldEmitSelect);
  const onSelectRef = useRef(onSelect);
  const onScrollPhaseChangeRef = useRef(onScrollPhaseChange);

  getSelectedIndexRef.current = getSelectedIndex;
  getValueAtIndexRef.current = getValueAtIndex;
  isSelectionUnsetRef.current = isSelectionUnset;
  shouldSyncScrollRef.current = shouldSyncScrollToSelection;
  shouldEmitSelectRef.current = shouldEmitSelect;
  onSelectRef.current = onSelect;
  onScrollPhaseChangeRef.current = onScrollPhaseChange;

  useEffect(() => {
    if (!api) return;
    const syncIndex = () => setCurrent(api.selectedScrollSnap());
    syncIndex();
    api.on('select', syncIndex);
    api.on('reInit', syncIndex);
    return () => {
      api.off('select', syncIndex);
      api.off('reInit', syncIndex);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !onScrollPhaseChangeRef.current) return;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;
    const onScrolling = () => {
      if (quietTimer) clearTimeout(quietTimer);
      onScrollPhaseChangeRef.current?.('scrolling');
    };
    const onScrollActivity = () => {
      if (quietTimer) clearTimeout(quietTimer);
      quietTimer = setTimeout(() => onScrollPhaseChangeRef.current?.('settled'), SCROLL_SETTLE_MS);
    };
    api.on('select', onScrolling);
    api.on('scroll', onScrollActivity);
    return () => {
      api.off('select', onScrolling);
      api.off('scroll', onScrollActivity);
      if (quietTimer) clearTimeout(quietTimer);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !isSelectionUnsetRef.current()) return;
    const value = getValueAtIndexRef.current(api.selectedScrollSnap());
    if (value !== undefined) onSelectRef.current(value);
  }, [api, optionsLength]);

  useEffect(() => {
    if (!api || !shouldSyncScrollRef.current()) return;
    const index = getSelectedIndexRef.current();
    if (index < 0 || index === api.selectedScrollSnap()) return;
    skipSelectRef.current = true;
    api.scrollTo(index);
  }, [api, optionsLength, selectionSyncKey]);

  useEffect(() => {
    if (!api) return;
    const handleSelect = () => {
      if (skipSelectRef.current) {
        skipSelectRef.current = false;
        return;
      }
      const index = api.selectedScrollSnap();
      const value = getValueAtIndexRef.current(index);
      if (value === undefined) return;
      if (shouldEmitSelectRef.current(index, value)) onSelectRef.current(value);
    };
    api.on('select', handleSelect);
    return () => {
      api.off('select', handleSelect);
    };
  }, [api, optionsLength]);

  const handleCardClick = useCallback((index: number) => {
    if (index === current) {
      if (!selectOnCenterClick) return;
      const value = getValueAtIndexRef.current(index);
      if (value !== undefined && shouldEmitSelectRef.current(index, value)) {
        onSelectRef.current(value);
      }
      return;
    }
    api?.scrollTo(index);
  }, [api, current, selectOnCenterClick]);

  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  return {
    api,
    setApi,
    current,
    handleCardClick,
    scrollPrev,
    scrollNext,
  };
}
