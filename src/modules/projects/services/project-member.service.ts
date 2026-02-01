// ============================================
// PROJECT MEMBERS - Service Layer
// ============================================

import { supabase } from '../../../lib/supabase';
import type { ProjectMember, JoinProjectDTO } from '../types/project.types';

export const projectMemberService = {
  /**
   * Get all members of a project
   */
  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('joined_at');

    if (error) throw error;
    return data || [];
  },

  /**
   * Join a project by code
   */
  async joinByCode(dto: JoinProjectDTO, userId: string): Promise<ProjectMember> {
    // First, find the project by code
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('code', dto.code)
      .single();

    if (projectError) throw new Error('Invalid project code');

    // Check if already a member
    const { data: existing } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', userId)
      .single();

    if (existing) throw new Error('Already a member of this project');

    // Join as player
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: userId,
        character_id: dto.character_id || null,
        role: 'player',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update member's character
   */
  async updateCharacter(
    projectId: string,
    userId: string,
    characterId: string
  ): Promise<ProjectMember> {
    const { data, error } = await supabase
      .from('project_members')
      .update({ character_id: characterId })
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Leave a project
   */
  async leave(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Get projects where user is a member
   */
  async getMyProjects(userId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        project:projects(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
