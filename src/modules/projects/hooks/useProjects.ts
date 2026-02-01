import { useState, useEffect } from 'react';
import { projectService } from '../services/project.service';
import type { ProjectVm, CreateProjectDto, JoinProjectDto } from '../types/project.types';

/**
 * Custom hook for managing projects
 */
export function useProjects() {
  const [projects, setProjects] = useState<ProjectVm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await projectService.getUserProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (payload: CreateProjectDto): Promise<ProjectVm> => {
    try {
      setError(null);
      const newProject = await projectService.createProject(payload);
      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const joinProject = async (payload: JoinProjectDto): Promise<ProjectVm> => {
    try {
      setError(null);
      const project = await projectService.joinProject(payload);
      setProjects((prev) => [project, ...prev]);
      return project;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to join project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateProject = async (id: string, updates: Partial<ProjectVm>) => {
    try {
      setError(null);
      const updated = await projectService.updateProject(id, updates as any);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setError(null);
      await projectService.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const leaveProject = async (projectId: string) => {
    try {
      setError(null);
      await projectService.leaveProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to leave project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    joinProject,
    updateProject,
    deleteProject,
    leaveProject,
  };
}
