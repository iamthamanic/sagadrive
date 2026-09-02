/**
 * useSelectionGraph — Pool vs. selected node visibility for multi-pick graphs
 * (Background training: 4 pool nodes, swap at 2/2, optional edit mode).
 * Location: src/modules/characters/hooks/useSelectionGraph.ts
 */
import { useCallback, useEffect, useState } from 'react';

export type SelectionGraphViewMode = 'pool' | 'selected';

export interface UseSelectionGraphOptions<T> {
  /** Full pool of selectable nodes shown before completion. */
  poolItems: readonly T[];
  /** Currently chosen subset. */
  selectedItems: readonly T[];
  /** Required pick count (e.g. 2 background trainings). */
  maxSelections: number;
  /** Resets edit mode and hover when pool identity changes. */
  resetKey?: string | number;
}

export function useSelectionGraph<T>({
  poolItems,
  selectedItems,
  maxSelections,
  resetKey,
}: UseSelectionGraphOptions<T>) {
  const [editing, setEditing] = useState(false);
  const [activeItem, setActiveItem] = useState<T | null>(null);

  const isComplete = selectedItems.length === maxSelections;
  const visibleNodes = isComplete && !editing ? selectedItems : poolItems;
  const viewMode: SelectionGraphViewMode = isComplete && !editing ? 'selected' : 'pool';

  useEffect(() => {
    setEditing(false);
    setActiveItem(null);
  }, [resetKey]);

  useEffect(() => {
    if (activeItem !== null && !visibleNodes.includes(activeItem)) {
      setActiveItem(null);
    }
  }, [activeItem, visibleNodes]);

  const isSelected = useCallback(
    (item: T) => selectedItems.includes(item),
    [selectedItems],
  );

  const isNodeDisabled = useCallback(
    (item: T) => {
      if (isComplete && !editing) return true;
      if (editing && !selectedItems.includes(item) && selectedItems.length >= maxSelections) {
        return true;
      }
      return false;
    },
    [editing, isComplete, maxSelections, selectedItems],
  );

  /** Call after toggling a node; closes edit mode when the replacement pick completes. */
  const handleToggleComplete = useCallback(
    (wasSelected: boolean, selectedCountBeforeToggle: number) => {
      if (editing && !wasSelected && selectedCountBeforeToggle === maxSelections - 1) {
        setEditing(false);
        setActiveItem(null);
      }
    },
    [editing, maxSelections],
  );

  const startEditing = useCallback(() => {
    setEditing(true);
    setActiveItem(null);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setActiveItem(null);
  }, []);

  return {
    visibleNodes,
    viewMode,
    isComplete,
    editing,
    setEditing,
    activeItem,
    setActiveItem,
    isSelected,
    isNodeDisabled,
    handleToggleComplete,
    startEditing,
    cancelEditing,
  };
}
