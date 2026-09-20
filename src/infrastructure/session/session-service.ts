/**
 * session-service — Self-host session persistence via SECURITY DEFINER RPCs.
 * Location: src/infrastructure/session/session-service.ts
 * Hides: Supabase RPC/table transport for play-session create/join/leave/status.
 * No Hosted make-server URLs; no client-generated session codes.
 */
import { supabase } from '../../lib/supabase';
import type {
  SessionDto,
  SessionVm,
  CreateSessionDto,
  JoinSessionDto,
  SessionPlayerDto,
  SessionPlayerVm,
  PlaySessionStatus,
} from '../../domains/session/contracts/session.types';
import {
  assertPlaySessionStatusTransition,
  normalizePlaySessionStatus,
  normalizeSessionJoinCode,
} from '../../domains/session/contracts/session-lifecycle';

type SessionRow = {
  id: string;
  code: string | null;
  name: string | null;
  project_id: string | null;
  public_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
};

class SessionService {
  private readonly tableName = 'sessions';
  private readonly playersTableName = 'session_players';

  private async resolveGmUserId(projectId: string | null): Promise<string> {
    if (!projectId) return '';
    const { data, error } = await supabase
      .from('projects')
      .select('gm_user_id')
      .eq('id', projectId)
      .maybeSingle();
    if (error || !data) return '';
    return typeof data.gm_user_id === 'string' ? data.gm_user_id : '';
  }

  private async mapRowToDto(row: SessionRow): Promise<SessionDto> {
    const projectId = row.project_id;
    const gmUserId = await this.resolveGmUserId(projectId);
    return {
      id: row.id,
      code: row.code ?? '',
      name: row.name,
      adventure_id: projectId,
      project_id: projectId,
      public_id: row.public_id ?? null,
      gm_user_id: gmUserId,
      status: normalizePlaySessionStatus(row.status),
      created_at: row.created_at,
      updated_at: row.updated_at,
      started_at: row.started_at,
      ended_at: row.ended_at,
    };
  }

  private mapToViewModel(dto: SessionDto, players: SessionPlayerDto[] = []): SessionVm {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name ?? '',
      adventureId: dto.adventure_id,
      projectId: dto.project_id,
      publicId: dto.public_id ?? null,
      gmUserId: dto.gm_user_id,
      status: dto.status,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
      startedAt: dto.started_at ? new Date(dto.started_at) : null,
      endedAt: dto.ended_at ? new Date(dto.ended_at) : null,
      players: players.map((p) => this.mapPlayerToViewModel(p)),
    };
  }

  private mapPlayerToViewModel(dto: SessionPlayerDto): SessionPlayerVm {
    return {
      id: dto.id,
      sessionId: dto.session_id,
      userId: dto.user_id,
      characterId: dto.character_id,
      isOnline: dto.is_online,
      joinedAt: new Date(dto.joined_at),
    };
  }

  private async loadPlayers(sessionId: string): Promise<SessionPlayerDto[]> {
    const { data, error } = await supabase
      .from(this.playersTableName)
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Failed to load session players:', error);
      return [];
    }
    return (data ?? []) as SessionPlayerDto[];
  }

  async createSession(payload: CreateSessionDto): Promise<SessionVm> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const projectId = payload.project_id || payload.adventure_id;
    if (!projectId) {
      throw new Error('project_id ist erforderlich, um eine Session zu erstellen');
    }

    const { data, error } = await supabase.rpc('create_play_session', {
      p_project_id: projectId,
      p_name: payload.name,
    });

    if (error || !data) {
      throw new Error(`Failed to create session: ${error?.message ?? 'unknown'}`);
    }

    const dto = await this.mapRowToDto(data as SessionRow);
    return this.mapToViewModel(dto, []);
  }

  async joinSession(payload: JoinSessionDto): Promise<SessionVm> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const code = normalizeSessionJoinCode(payload.code);

    const { data, error } = await supabase.rpc('join_session_by_code', {
      p_code: code,
      p_character_id: payload.character_id ?? null,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Session nicht gefunden');
    }

    const dto = await this.mapRowToDto(data as SessionRow);
    const players = await this.loadPlayers(dto.id);
    return this.mapToViewModel(dto, players);
  }

  async getSessionById(id: string): Promise<SessionVm> {
    const { data: session, error: sessionError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    const dto = await this.mapRowToDto(session as SessionRow);
    const players = await this.loadPlayers(id);
    return this.mapToViewModel(dto, players);
  }

  async getUserSessions(): Promise<SessionVm[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: gmProjects, error: gmProjectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('gm_user_id', user.id);

    if (gmProjectsError) {
      throw new Error(`Failed to fetch GM projects: ${gmProjectsError.message}`);
    }

    const gmProjectIds = (gmProjects ?? []).map((p) => p.id as string);

    let gmSessions: SessionRow[] = [];
    if (gmProjectIds.length > 0) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .in('project_id', gmProjectIds)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });
      if (error) {
        throw new Error(`Failed to fetch GM sessions: ${error.message}`);
      }
      gmSessions = (data ?? []) as SessionRow[];
    }

    const { data: playerRecords, error: playerError } = await supabase
      .from(this.playersTableName)
      .select('*, sessions!inner(*)')
      .eq('user_id', user.id);

    if (playerError) {
      console.error('Failed to fetch player sessions:', playerError);
    }

    type PlayerSessionJoinRow = { sessions: SessionRow | SessionRow[] | null };
    const playerSessions = ((playerRecords || []) as PlayerSessionJoinRow[])
      .map((record) => record.sessions)
      .flatMap((session) => (Array.isArray(session) ? session : session ? [session] : []))
      .filter((session) => session.status !== 'completed');

    const allSessionIds = new Set<string>();
    const combined: SessionRow[] = [];
    [...gmSessions, ...playerSessions].forEach((session) => {
      if (!allSessionIds.has(session.id)) {
        allSessionIds.add(session.id);
        combined.push(session);
      }
    });

    return Promise.all(
      combined.map(async (session) => {
        const dto = await this.mapRowToDto(session);
        const players = await this.loadPlayers(session.id);
        return this.mapToViewModel(dto, players);
      }),
    );
  }

  async updateSessionStatus(
    id: string,
    status: PlaySessionStatus,
  ): Promise<SessionVm> {
    const current = await this.getSessionById(id);
    assertPlaySessionStatusTransition(current.status, status);

    const { data, error } = await supabase.rpc('set_session_status', {
      p_session_id: id,
      p_status: status,
    });

    if (error || !data) {
      throw new Error(`Failed to update session: ${error?.message ?? 'unknown'}`);
    }

    const dto = await this.mapRowToDto(data as SessionRow);
    const players = await this.loadPlayers(id);
    return this.mapToViewModel(dto, players);
  }

  async leaveSession(sessionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase.rpc('leave_play_session', {
      p_session_id: sessionId,
    });

    if (error) {
      throw new Error(`Failed to leave session: ${error.message}`);
    }
  }
}

export const sessionService = new SessionService();
