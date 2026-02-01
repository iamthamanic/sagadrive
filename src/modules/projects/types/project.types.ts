/**
 * Project Types
 * A project is a campaign/adventure with a GM and players
 */

// ============================================
// DTOs (Data Transfer Objects - from Supabase)
// ============================================

export interface ProjectDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  world_id: string | null;
  gm_user_id: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ProjectMemberDto {
  id: string;
  project_id: string;
  user_id: string;
  character_id: string | null;
  role: 'gm' | 'player';
  joined_at: string;
  status: 'active' | 'inactive' | 'kicked';
}

export interface SessionDto {
  id: string;
  project_id: string;
  session_number: number;
  name: string | null;
  notes: string | null;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// View Models (for UI consumption)
// ============================================

export interface ProjectMemberVm {
  id: string;
  userId: string;
  characterId: string | null;
  role: 'gm' | 'player';
  joinedAt: string;
  status: 'active' | 'inactive' | 'kicked';
}

export interface SessionVm {
  id: string;
  projectId: string;
  sessionNumber: number;
  name: string | null;
  notes: string | null;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startedAt: string | null;
  endedAt: string | null;
  durationMinutes: number | null;
  createdAt: string;
}

export interface ProjectVm {
  id: string;
  code: string;
  name: string;
  description: string | null;
  worldId: string | null;
  gmUserId: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
  members: ProjectMemberVm[];
  sessions: SessionVm[];
  totalSessions: number;
  lastSessionDate: string | null;
}

// ============================================
// Create DTOs (for creating new records)
// ============================================

export interface CreateProjectDto {
  name: string;
  description?: string;
  world_id?: string;
}

export interface JoinProjectDto {
  code: string;
  character_id?: string;
}

export interface CreateSessionDto {
  project_id: string;
  session_number: number;
  name?: string;
  notes?: string;
}

export interface UpdateSessionDto {
  id: string;
  name?: string;
  notes?: string;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
  started_at?: string;
  ended_at?: string;
}
