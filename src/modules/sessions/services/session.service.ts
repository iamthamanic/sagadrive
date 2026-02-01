import { supabase } from '../../../lib/supabase';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import type {
  SessionDto,
  SessionVm,
  CreateSessionDto,
  JoinSessionDto,
  SessionPlayerDto,
  SessionPlayerVm,
} from '../types/session.types';

/**
 * Session Service
 * Handles all session-related API calls
 */
class SessionService {
  private readonly tableName = 'sessions';
  private readonly playersTableName = 'session_players';

  /**
   * Generate unique 6-character session code
   */
  private generateSessionCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Map DTO to View Model
   */
  private mapToViewModel(dto: SessionDto, players: SessionPlayerDto[] = []): SessionVm {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      adventureId: dto.adventure_id,
      gmUserId: dto.gm_user_id,
      status: dto.status,
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
      startedAt: dto.started_at ? new Date(dto.started_at) : null,
      endedAt: dto.ended_at ? new Date(dto.ended_at) : null,
      players: players.map(this.mapPlayerToViewModel),
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

  /**
   * Create new session (as GM)
   */
  async createSession(payload: CreateSessionDto): Promise<SessionVm> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const code = this.generateSessionCode();

    const sessionData: Partial<SessionDto> = {
      code,
      name: payload.name,
      adventure_id: payload.adventure_id || null,
      gm_user_id: user.id,
      status: 'waiting',
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return this.mapToViewModel(data, []);
  }

  /**
   * Join existing session (as player)
   * Uses server endpoint to find session by code (bypasses RLS)
   */
  async joinSession(payload: JoinSessionDto): Promise<SessionVm> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 1. Find session by code via server (bypasses RLS)
    const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-9f6fb44c/sessions/find-by-code`;
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ code: payload.code.toUpperCase() }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Session nicht gefunden');
    }

    const { session } = await response.json();

    // 2. Check if already joined
    const { data: existingPlayer } = await supabase
      .from(this.playersTableName)
      .select('*')
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .single();

    if (!existingPlayer) {
      // 3. Add player to session
      const { error: joinError } = await supabase
        .from(this.playersTableName)
        .insert({
          session_id: session.id,
          user_id: user.id,
          character_id: payload.character_id || null,
          is_online: true,
        });

      if (joinError) {
        throw new Error(`Beitritt fehlgeschlagen: ${joinError.message}`);
      }
    }

    // 4. Fetch session with players
    return this.getSessionById(session.id);
  }

  /**
   * Get session by ID
   */
  async getSessionById(id: string): Promise<SessionVm> {
    const { data: session, error: sessionError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    const { data: players } = await supabase
      .from(this.playersTableName)
      .select('*')
      .eq('session_id', id);

    return this.mapToViewModel(session, players || []);
  }

  /**
   * Get user's active sessions (as GM or Player)
   */
  async getUserSessions(): Promise<SessionVm[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 1. Get sessions where user is GM (RLS allows this)
    const { data: gmSessions, error: gmError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('gm_user_id', user.id)
      .neq('status', 'completed')
      .order('created_at', { ascending: false });

    if (gmError) {
      throw new Error(`Failed to fetch GM sessions: ${gmError.message}`);
    }

    // 2. Get player records where user is a player (RLS allows this)
    const { data: playerRecords, error: playerError } = await supabase
      .from(this.playersTableName)
      .select('*, sessions!inner(*)')
      .eq('user_id', user.id);

    if (playerError) {
      console.error('Failed to fetch player sessions:', playerError);
    }

    // 3. Extract sessions from player records and filter out completed ones
    const playerSessions = (playerRecords || [])
      .map((record: any) => record.sessions)
      .filter((session: SessionDto) => session.status !== 'completed');

    // 4. Combine GM sessions and player sessions (avoid duplicates)
    const allSessionIds = new Set<string>();
    const combinedSessions: SessionDto[] = [];

    [...(gmSessions || []), ...playerSessions].forEach(session => {
      if (!allSessionIds.has(session.id)) {
        allSessionIds.add(session.id);
        combinedSessions.push(session);
      }
    });

    // 5. Fetch players for all sessions (GM can see all players in their sessions)
    const sessionsWithPlayers = await Promise.all(
      combinedSessions.map(async (session) => {
        const { data: players } = await supabase
          .from(this.playersTableName)
          .select('*')
          .eq('session_id', session.id);
        
        return this.mapToViewModel(session, players || []);
      })
    );

    return sessionsWithPlayers;
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    id: string,
    status: 'waiting' | 'active' | 'paused' | 'completed'
  ): Promise<SessionVm> {
    const updates: Partial<SessionDto> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'active') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.ended_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return this.getSessionById(data.id);
  }

  /**
   * Leave session
   */
  async leaveSession(sessionId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from(this.playersTableName)
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to leave session: ${error.message}`);
    }
  }
}

export const sessionService = new SessionService();
