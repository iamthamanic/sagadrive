/**
 * Cached project summaries for Bibliothek/Dashboard list views.
 * Location: src/modules/projects/hooks/useProjectSummaries.ts
 */

import { useCallback } from 'react';
import { ENTITY_CACHE_KEYS } from '../../../lib/entityCache';
import { useCachedEntityList } from '../../../lib/useCachedEntityList';
import { projectService } from '../services/project.service';
import type { ProjectSummaryVm } from '../types/project.types';

interface UseProjectSummariesOptions {
  enabled?: boolean;
}

export function useProjectSummaries(options: UseProjectSummariesOptions = {}) {
  const { enabled = true } = options;

  const fetcher = useCallback(() => projectService.getUserProjectSummaries(), []);

  const { items, isLoading, error, refresh } = useCachedEntityList<ProjectSummaryVm[]>(
    ENTITY_CACHE_KEYS.projectSummaries,
    fetcher,
    [],
    { enabled },
  );

  return {
    projects: items,
    isLoading,
    error,
    refreshProjects: refresh,
  };
}
