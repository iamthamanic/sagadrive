/**
 * Cached project summaries for Bibliothek/Dashboard list views.
 * Location: src/app/project/hooks/useProjectSummaries.ts
 */

import { useCallback } from 'react';
import { ENTITY_CACHE_KEYS } from '../../../lib/entityCache';
import { useCachedEntityList } from '../../../lib/useCachedEntityList';
import { projectService } from '../../../infrastructure/project/project-service';
import type { ProjectSummaryVm } from '../../../domains/project/contracts/project.types';

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
