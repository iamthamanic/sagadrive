// Session DTOs
export interface SessionDto {
  id: string;
  code: string;
  name: string;
  adventure_id: string | null;
  gm_user_id: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface SessionPlayerDto {
  id: string;
  session_id: string;
  user_id: string;
  character_id: string | null;
  is_online: boolean;
  joined_at: string;
}

// Create DTOs
export interface CreateSessionDto {
  name: string;
  adventure_id?: string;
}

export interface JoinSessionDto {
  code: string;
  character_id?: string;
}

// View Models
export interface SessionVm {
  id: string;
  code: string;
  name: string;
  adventureId: string | null;
  gmUserId: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  players: SessionPlayerVm[];
}

export interface SessionPlayerVm {
  id: string;
  sessionId: string;
  userId: string;
  characterId: string | null;
  isOnline: boolean;
  joinedAt: Date;
}
