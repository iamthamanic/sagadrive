import { useState, useEffect } from 'react';
import { projectService } from '../services/project.service';
import type {
  ProjectVm,
  CreateProjectDto,
  UpdateProjectDto,
  JoinProjectDto,
} from '../types/project.types';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectVm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchProjects();
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
      setProjects((prev) => [project, ...prev.filter((entry) => entry.id !== project.id)]);
      return project;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to join project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateProject = async (id: string, updates: UpdateProjectDto): Promise<ProjectVm> => {
    try {
      setError(null);
      const updated = await projectService.updateProject(id, updates);
      setProjects((prev) => prev.map((project) => project.id === id ? updated : project));
      return updated;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const setWorldProfile = async (projectId: string, worldProfileId: string): Promise<ProjectVm> => {
    try {
      setError(null);
      const updated = await projectService.setWorldProfile(projectId, worldProfileId);
      setProjects((prev) => prev.map((project) => project.id === projectId ? updated : project));
      return updated;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Welt konnte nicht zugewiesen werden';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const setMyCharacter = async (projectId: string, characterId: string | null): Promise<ProjectVm> => {
    try {
      setError(null);
      const updated = await projectService.setMyCharacter(projectId, characterId);
      setProjects((prev) => prev.map((project) => project.id === projectId ? updated : project));
      return updated;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Charakter konnte nicht zugewiesen werden';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setError(null);
      await projectService.deleteProject(id);
      setProjects((prev) => prev.filter((project) => project.id !== id));
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
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
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
    setWorldProfile,
    setMyCharacter,
    deleteProject,
    leaveProject,
  };
}
