import { supabase } from '../../../lib/supabase';
import { projectMemberService } from './project-member.service';
import type {
  ProjectDto,
  ProjectVm,
  CreateProjectDto,
  UpdateProjectDto,
  JoinProjectDto,
  ProjectMemberDto,
  ProjectMemberVm,
  SessionDto,
  SessionVm,
} from '../types/project.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProjectStatus(value: unknown): value is ProjectDto['status'] {
  return value === 'active' || value === 'paused' || value === 'completed' || value === 'archived';
}

function isProjectDto(value: unknown): value is ProjectDto {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.description === 'string' || value.description === null) &&
    (typeof value.world_id === 'string' || value.world_id === null) &&
    (typeof value.world_profile_id === 'string' || value.world_profile_id === null) &&
    typeof value.gm_user_id === 'string' &&
    isProjectStatus(value.status) &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

class ProjectService {
  private readonly tableName = 'projects';
  private readonly membersTableName = 'project_members';
  private readonly sessionsTableName = 'sessions';

  private generateProjectCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private mapToViewModel(
    project: ProjectDto,
    members: ProjectMemberDto[],
    sessions: SessionDto[],
  ): ProjectVm {
    const mappedMembers: ProjectMemberVm[] = members.map((member) => ({
      id: member.id,
      userId: member.user_id,
      characterId: member.character_id,
      role: member.role,
      joinedAt: member.joined_at,
      status: member.status,
    }));

    const mappedSessions: SessionVm[] = sessions.map((session) => ({
      id: session.id,
      projectId: session.project_id,
      sessionNumber: session.session_number,
      name: session.name,
      notes: session.notes,
      status: session.status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      durationMinutes: session.duration_minutes,
      createdAt: session.created_at,
    }));

    const completedSessions = sessions.filter((session) => session.ended_at);
    const lastSessionDate = completedSessions.length
      ? completedSessions.sort((left, right) =>
          new Date(right.ended_at!).getTime() - new Date(left.ended_at!).getTime(),
        )[0].ended_at
      : null;

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      description: project.description,
      worldId: project.world_id,
      worldProfileId: project.world_profile_id,
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

  async createProject(payload: CreateProjectDto): Promise<ProjectVm> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    if (!payload.world_profile_id) throw new Error('Bitte wähle eine Welt für das Abenteuer.');

    const code = this.generateProjectCode();
    const projectData: Partial<ProjectDto> = {
      code,
      name: payload.name,
      description: payload.description || null,
      world_id: null,
      world_profile_id: payload.world_profile_id,
      gm_user_id: user.id,
      status: 'active',
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(projectData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create project: ${error.message}`);

    await supabase.from(this.membersTableName).insert({
      project_id: data.id,
      user_id: user.id,
      role: 'gm',
      status: 'active',
    });

    return this.mapToViewModel(data as ProjectDto, [], []);
  }

  async getUserProjects(): Promise<ProjectVm[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: gmProjects, error: gmError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('gm_user_id', user.id)
      .order('created_at', { ascending: false });

    if (gmError) throw new Error(`Failed to fetch GM projects: ${gmError.message}`);

    const { data: memberRecords, error: memberError } = await supabase
      .from(this.membersTableName)
      .select('*, projects!inner(*)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (memberError) console.error('Failed to fetch player projects:', memberError);

    const playerProjects: ProjectDto[] = [];
    for (const record of memberRecords || []) {
      if (!isRecord(record)) continue;
      const project = record.projects;
      if (isProjectDto(project)) playerProjects.push(project);
    }

    const allProjectIds = new Set<string>();
    const combinedProjects: ProjectDto[] = [];
    for (const project of [...(gmProjects || []), ...playerProjects]) {
      if (!isProjectDto(project) || allProjectIds.has(project.id)) continue;
      allProjectIds.add(project.id);
      combinedProjects.push(project);
    }

    return Promise.all(
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
      }),
    );
  }

  async joinProject(payload: JoinProjectDto): Promise<ProjectVm> {
    const membership = await projectMemberService.joinByCode(payload);
    return this.getProjectById(membership.project_id);
  }

  async getProjectById(id: string): Promise<ProjectVm> {
    const { data: project, error: projectError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (projectError || !project || !isProjectDto(project)) {
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

  async updateProject(id: string, updates: UpdateProjectDto): Promise<ProjectVm> {
    const { error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(`Failed to update project: ${error.message}`);
    return this.getProjectById(id);
  }

  async setWorldProfile(projectId: string, worldProfileId: string): Promise<ProjectVm> {
    const { error } = await supabase.rpc('set_project_world_profile', {
      p_project_id: projectId,
      p_world_profile_id: worldProfileId,
    });

    if (error) throw new Error(`Welt konnte dem Abenteuer nicht zugewiesen werden: ${error.message}`);
    return this.getProjectById(projectId);
  }

  async setMyCharacter(projectId: string, characterId: string | null): Promise<ProjectVm> {
    await projectMemberService.updateCharacter(projectId, characterId);
    return this.getProjectById(projectId);
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete project: ${error.message}`);
  }

  async leaveProject(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    await projectMemberService.leave(projectId, user.id);
  }
}

export const projectService = new ProjectService();
