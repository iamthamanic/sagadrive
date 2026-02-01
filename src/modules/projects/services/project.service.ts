import { supabase } from '../../../lib/supabase';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import type {
  ProjectDto,
  ProjectVm,
  CreateProjectDto,
  JoinProjectDto,
  ProjectMemberDto,
  ProjectMemberVm,
  SessionDto,
  SessionVm,
} from '../types/project.types';

/**
 * Project Service
 * Handles all project-related API calls (campaigns/adventures)
 */
class ProjectService {
  private readonly tableName = 'projects';
  private readonly membersTableName = 'project_members';
  private readonly sessionsTableName = 'sessions';

  /**
   * Generate random 6-digit join code
   */
  private generateProjectCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Map DTO to View Model
   */
  private mapToViewModel(
    project: ProjectDto,
    members: ProjectMemberDto[],
    sessions: SessionDto[]
  ): ProjectVm {
    const mappedMembers: ProjectMemberVm[] = members.map((m) => ({
      id: m.id,
      userId: m.user_id,
      characterId: m.character_id,
      role: m.role,
      joinedAt: m.joined_at,
      status: m.status,
    }));

    const mappedSessions: SessionVm[] = sessions.map((s) => ({
      id: s.id,
      projectId: s.project_id,
      sessionNumber: s.session_number,
      name: s.name,
      notes: s.notes,
      status: s.status,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      durationMinutes: s.duration_minutes,
      createdAt: s.created_at,
    }));

    // Find last session date
    const completedSessions = sessions.filter((s) => s.ended_at);
    const lastSessionDate = completedSessions.length
      ? completedSessions.sort((a, b) => 
          new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime()
        )[0].ended_at
      : null;

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      description: project.description,
      worldId: project.world_id,
      gmUserId: project.gm_user_id,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      members: mappedMembers,
      sessions: mappedSessions,
      totalSessions: sessions.length,
      lastSessionDate,
    };
  }

  /**
   * Create new project (as GM)
   */
  async createProject(payload: CreateProjectDto): Promise<ProjectVm> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const code = this.generateProjectCode();

    const projectData: Partial<ProjectDto> = {
      code,
      name: payload.name,
      description: payload.description || null,
      world_id: payload.world_id || null,
      gm_user_id: user.id,
      status: 'active',
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(projectData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    // Add GM as member
    await supabase.from(this.membersTableName).insert({
      project_id: data.id,
      user_id: user.id,
      role: 'gm',
      status: 'active',
    });

    return this.mapToViewModel(data, [], []);
  }

  /**
   * Get user's projects (as GM or Player)
   */
  async getUserProjects(): Promise<ProjectVm[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 1. Get projects where user is GM (RLS allows this)
    const { data: gmProjects, error: gmError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('gm_user_id', user.id)
      .order('created_at', { ascending: false });

    if (gmError) {
      throw new Error(`Failed to fetch GM projects: ${gmError.message}`);
    }

    // 2. Get member records where user is a player (RLS allows this)
    const { data: memberRecords, error: memberError } = await supabase
      .from(this.membersTableName)
      .select('*, projects!inner(*)')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('Failed to fetch player projects:', memberError);
    }

    // 3. Extract projects from member records
    const playerProjects = (memberRecords || [])
      .map((record: any) => record.projects);

    // 4. Combine GM projects and player projects (avoid duplicates)
    const allProjectIds = new Set<string>();
    const combinedProjects: ProjectDto[] = [];

    [...(gmProjects || []), ...playerProjects].forEach(project => {
      if (!allProjectIds.has(project.id)) {
        allProjectIds.add(project.id);
        combinedProjects.push(project);
      }
    });

    // 5. Fetch members and sessions for all projects
    const projectsWithDetails = await Promise.all(
      combinedProjects.map(async (project) => {
        const { data: members } = await supabase
          .from(this.membersTableName)
          .select('*')
          .eq('project_id', project.id);

        const { data: sessions } = await supabase
          .from(this.sessionsTableName)
          .select('*')
          .eq('project_id', project.id)
          .order('session_number', { ascending: true });
        
        return this.mapToViewModel(project, members || [], sessions || []);
      })
    );

    return projectsWithDetails;
  }

  /**
   * Join project by code (as player)
   * Uses Supabase RPC function to find project (bypasses RLS)
   */
  async joinProject(payload: JoinProjectDto): Promise<ProjectVm> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 1. Find project by code using RPC function
    const { data: projects, error: findError } = await supabase
      .rpc('find_project_by_code', { project_code: payload.code.toUpperCase() });

    if (findError) {
      console.error('Error finding project:', findError);
      throw new Error('Fehler beim Suchen des Projekts');
    }

    if (!projects || projects.length === 0) {
      throw new Error('Projekt nicht gefunden. Bitte überprüfe den Code.');
    }

    const project = projects[0];

    // 2. Check if already joined
    const { data: existingMember } = await supabase
      .from(this.membersTableName)
      .select('*')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      throw new Error('Du bist bereits Mitglied dieses Projekts');
    }

    // 3. Add player to project
    const { error: joinError } = await supabase
      .from(this.membersTableName)
      .insert({
        project_id: project.id,
        user_id: user.id,
        character_id: payload.character_id || null,
        role: 'player',
        status: 'active',
      });

    if (joinError) {
      throw new Error(`Beitritt fehlgeschlagen: ${joinError.message}`);
    }

    // 4. Fetch updated project with members and sessions
    return this.getProjectById(project.id);
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<ProjectVm> {
    const { data: project, error: projectError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    const { data: members } = await supabase
      .from(this.membersTableName)
      .select('*')
      .eq('project_id', id);

    const { data: sessions } = await supabase
      .from(this.sessionsTableName)
      .select('*')
      .eq('project_id', id)
      .order('session_number', { ascending: true });

    return this.mapToViewModel(project, members || [], sessions || []);
  }

  /**
   * Update project
   */
  async updateProject(id: string, updates: Partial<ProjectDto>): Promise<ProjectVm> {
    const { error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return this.getProjectById(id);
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  /**
   * Leave project (as player)
   */
  async leaveProject(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from(this.membersTableName)
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to leave project: ${error.message}`);
    }
  }
}

export const projectService = new ProjectService();
