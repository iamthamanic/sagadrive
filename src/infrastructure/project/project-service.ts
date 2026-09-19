/**
 * project-service — Supabase adapter for projects/campaigns.
 * Location: src/infrastructure/project/project-service.ts
 */
import { supabase } from '../../lib/supabase';
import { getAuthenticatedUserId } from '../../lib/authenticatedUser';
import { raceWithTimeoutReject, SUPABASE_QUERY_TIMEOUT_MS } from '../../lib/networkTimeout';
import { projectMemberService } from './project-member-service';
import type {
  ProjectDto,
  ProjectVm,
  CreateProjectDto,
  JoinProjectDto,
  ProjectMemberDto,
  ProjectMemberVm,
  ProjectSummaryVm,
  SessionDto,
  SessionVm,
} from '../../domains/project/contracts/project.types';

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
    typeof value.public_id === 'string' &&
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.description === 'string' || value.description === null) &&
    (typeof value.world_id === 'string' || value.world_id === null) &&
    typeof value.gm_user_id === 'string' &&
    isProjectStatus(value.status) &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
}

/**
 * Project Service
 * Handles all project-related API calls (campaigns/adventures)
 */
function isProjectSummaryRow(
  value: unknown,
): value is Pick<ProjectDto, 'id' | 'public_id' | 'code' | 'name' | 'description' | 'gm_user_id' | 'status'> {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.public_id === 'string' &&
    typeof value.code === 'string' &&
    typeof value.name === 'string' &&
    (typeof value.description === 'string' || value.description === null) &&
    typeof value.gm_user_id === 'string' &&
    isProjectStatus(value.status)
  );
}

function isSessionStatus(value: unknown): value is SessionDto['status'] {
  return (
    value === 'scheduled'
    || value === 'active'
    || value === 'paused'
    || value === 'completed'
    || value === 'cancelled'
  );
}

function isSessionDto(value: unknown): value is SessionDto {
  if (!isRecord(value)) return false;
  const durationOk =
    value.duration_minutes === undefined
    || typeof value.duration_minutes === 'number'
    || value.duration_minutes === null;
  return (
    typeof value.id === 'string'
    && typeof value.public_id === 'string'
    && typeof value.project_id === 'string'
    && typeof value.session_number === 'number'
    && (typeof value.name === 'string' || value.name === null)
    && (typeof value.notes === 'string' || value.notes === null)
    && isSessionStatus(value.status)
    && (typeof value.started_at === 'string' || value.started_at === null)
    && (typeof value.ended_at === 'string' || value.ended_at === null)
    && durationOk
    && typeof value.created_at === 'string'
    && typeof value.updated_at === 'string'
  );
}

function normalizeSessionDto(value: SessionDto): SessionDto {
  return {
    ...value,
    duration_minutes: value.duration_minutes ?? null,
  };
}

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
      publicId: session.public_id,
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
          new Date(right.ended_at!).getTime() - new Date(left.ended_at!).getTime()
        )[0].ended_at
      : null;

    return {
      id: project.id,
      publicId: project.public_id,
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
    const userId = await getAuthenticatedUserId();

    const code = this.generateProjectCode();

    const projectData: Partial<ProjectDto> = {
      code,
      name: payload.name,
      description: payload.description || null,
      world_id: payload.world_id || null,
      gm_user_id: userId,
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

    // The GM-controlled membership policy permits this bootstrap row.
    await supabase.from(this.membersTableName).insert({
      project_id: data.id,
      user_id: userId,
      role: 'gm',
      status: 'active',
    });

    return this.mapToViewModel(data, [], []);
  }

  /**
   * Get user's projects (as GM or active player).
   */
  async getUserProjectSummaries(): Promise<ProjectSummaryVm[]> {
    return raceWithTimeoutReject(
      this.fetchUserProjectSummaries(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Failed to fetch projects: request timed out',
    );
  }

  async getUserProjects(): Promise<ProjectVm[]> {
    return raceWithTimeoutReject(
      this.fetchUserProjects(),
      SUPABASE_QUERY_TIMEOUT_MS,
      'Failed to fetch projects: request timed out',
    );
  }

  private countByProjectId(rows: ReadonlyArray<{ project_id: string }>): Map<string, number> {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
    }
    return counts;
  }

  private async fetchUserProjectSummaries(): Promise<ProjectSummaryVm[]> {
    const userId = await getAuthenticatedUserId();

    const { data: gmProjects, error: gmError } = await supabase
      .from(this.tableName)
      .select('id, public_id, code, name, description, gm_user_id, status')
      .eq('gm_user_id', userId)
      .order('created_at', { ascending: false });

    if (gmError) {
      throw new Error(`Failed to fetch GM projects: ${gmError.message}`);
    }

    const { data: memberRecords, error: memberError } = await supabase
      .from(this.membersTableName)
      .select('projects!inner(id, public_id, code, name, description, gm_user_id, status)')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) {
      console.error('Failed to fetch player projects:', memberError);
    }

    type ProjectSummaryRow = Pick<
      ProjectDto,
      'id' | 'public_id' | 'code' | 'name' | 'description' | 'gm_user_id' | 'status'
    >;
    const combined = new Map<string, ProjectSummaryRow>();

    for (const project of gmProjects ?? []) {
      if (!isProjectSummaryRow(project)) continue;
      combined.set(project.id, project);
    }

    for (const record of memberRecords ?? []) {
      if (!isRecord(record)) continue;
      const project = record.projects;
      if (!isProjectSummaryRow(project)) continue;
      combined.set(project.id, project);
    }

    const projectIds = [...combined.keys()];
    if (projectIds.length === 0) return [];

    const [{ data: memberRows, error: membersBatchError }, { data: sessionRows, error: sessionsBatchError }] =
      await Promise.all([
        supabase.from(this.membersTableName).select('project_id').in('project_id', projectIds),
        supabase.from(this.sessionsTableName).select('project_id').in('project_id', projectIds),
      ]);

    if (membersBatchError) {
      throw new Error(`Failed to fetch project members: ${membersBatchError.message}`);
    }
    if (sessionsBatchError) {
      throw new Error(`Failed to fetch project sessions: ${sessionsBatchError.message}`);
    }

    const memberCounts = this.countByProjectId((memberRows ?? []) as Array<{ project_id: string }>);
    const sessionCounts = this.countByProjectId((sessionRows ?? []) as Array<{ project_id: string }>);

    return projectIds.map((id) => {
      const project = combined.get(id)!;
      return {
        id: project.id,
        publicId: project.public_id,
        code: project.code,
        name: project.name,
        description: project.description,
        gmUserId: project.gm_user_id,
        status: project.status,
        memberCount: memberCounts.get(id) ?? 0,
        sessionCount: sessionCounts.get(id) ?? 0,
      };
    });
  }

  private async fetchUserProjects(): Promise<ProjectVm[]> {
    const userId = await getAuthenticatedUserId();

    const { data: gmProjects, error: gmError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('gm_user_id', userId)
      .order('created_at', { ascending: false });

    if (gmError) {
      throw new Error(`Failed to fetch GM projects: ${gmError.message}`);
    }

    const { data: memberRecords, error: memberError } = await supabase
      .from(this.membersTableName)
      .select('*, projects!inner(*)')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) {
      console.error('Failed to fetch player projects:', memberError);
    }

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
      })
    );
  }

  /**
   * Join project by secret code. The SECURITY DEFINER RPC owns membership identity,
   * role and status, so the browser cannot mint or reactivate an authorization grant.
   */
  async joinProject(payload: JoinProjectDto): Promise<ProjectVm> {
    const membership = await projectMemberService.joinByCode(payload);
    return this.getProjectById(membership.project_id);
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
   * Leave project (as player). Kicked rows stay server/GM-controlled denial records.
   */
  async leaveProject(projectId: string): Promise<void> {
    const userId = await getAuthenticatedUserId();
    await projectMemberService.leave(projectId, userId);
  }

  /**
   * Resolve saga by public id (SA-XXXXX). Auth/RLS still gate the row.
   */
  async getProjectByPublicId(publicId: string): Promise<ProjectVm> {
    const { data: project, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('public_id', publicId.trim().toUpperCase())
      .single();

    if (error || !project || !isProjectDto(project)) {
      throw new Error('Project not found');
    }

    return this.getProjectById(project.id);
  }

  /**
   * Resolve session by public id, scoped to saga public id (cross-saga → not found).
   */
  async getSessionByPublicIds(
    sagaPublicId: string,
    sessionPublicId: string,
  ): Promise<{ project: ProjectVm; session: SessionVm }> {
    const project = await this.getProjectByPublicId(sagaPublicId);
    const session = project.sessions.find(
      (row) => row.publicId === sessionPublicId.trim().toUpperCase(),
    );
    if (!session) {
      throw new Error('Session not found in saga');
    }
    return { project, session };
  }

  /**
   * Create a project session with concurrency-safe session_number allocation (DB RPC).
   */
  async createProjectSession(payload: {
    projectId: string;
    name?: string;
    notes?: string;
  }): Promise<SessionVm> {
    const { data, error } = await supabase.rpc('create_project_session', {
      p_project_id: payload.projectId,
      p_name: payload.name ?? null,
      p_notes: payload.notes ?? null,
    });

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    if (!isSessionDto(data)) {
      throw new Error('Failed to create session: invalid response');
    }

    const normalized = normalizeSessionDto(data);
    return {
      id: normalized.id,
      publicId: normalized.public_id,
      projectId: normalized.project_id,
      sessionNumber: normalized.session_number,
      name: normalized.name,
      notes: normalized.notes,
      status: normalized.status,
      startedAt: normalized.started_at,
      endedAt: normalized.ended_at,
      durationMinutes: normalized.duration_minutes,
      createdAt: normalized.created_at,
    };
  }
}

export const projectService = new ProjectService();
