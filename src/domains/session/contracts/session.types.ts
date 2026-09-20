/**
 * session.types — Play-session DTOs/VMs for SessionJoin / session-service.
 * Location: src/domains/session/contracts/session.types.ts
 * Note: Project saga sessions in domains/project use a separate SessionDto shape.
 */
import type { PlaySessionStatus } from './session-lifecycle';

export type { PlaySessionStatus };

/** Raw row shape returned by play-session RPCs / selects (snake_case). */
export interface SessionDto {
  id: string;
  code: string;
  name: string | null;
  /** Adventure/project binding — maps from `project_id`. */
  adventure_id: string | null;
  project_id: string | null;
  public_id?: string | null;
  gm_user_id: string;
  status: PlaySessionStatus;
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

export interface CreateSessionDto {
  name: string;
  /** Prefer `project_id`; `adventure_id` kept as alias for SessionJoin. */
  project_id?: string;
  adventure_id?: string;
}

export interface JoinSessionDto {
  code: string;
  character_id?: string;
}

export interface SessionVm {
  id: string;
  code: string;
  name: string;
  adventureId: string | null;
  projectId: string | null;
  publicId: string | null;
  gmUserId: string;
  status: PlaySessionStatus;
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
