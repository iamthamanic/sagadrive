// ============================================
// RULESETS Module - Service Layer
// ============================================

import { supabase } from '../../../lib/supabase';
import type { Ruleset, CreateRulesetDTO, UpdateRulesetDTO } from '../types/ruleset.types';

export const rulesetService = {
  /**
   * Get all available rulesets (official + public + user's own)
   */
  async getAll(): Promise<Ruleset[]> {
    const { data, error } = await supabase
      .from('rulesets')
      .select('*')
      .order('is_official', { ascending: false })
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get official rulesets only (D&D 5e, DSA, etc.)
   */
  async getOfficial(): Promise<Ruleset[]> {
    const { data, error } = await supabase
      .from('rulesets')
      .select('*')
      .eq('is_official', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single ruleset by ID
   */
  async getById(id: string): Promise<Ruleset | null> {
    const { data, error } = await supabase
      .from('rulesets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a custom ruleset
   */
  async create(dto: CreateRulesetDTO): Promise<Ruleset> {
    const { data, error } = await supabase
      .from('rulesets')
      .insert({
        ...dto,
        is_official: false,
        is_marketplace_item: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a ruleset
   */
  async update(dto: UpdateRulesetDTO): Promise<Ruleset> {
    const { id, ...updates } = dto;
    const { data, error } = await supabase
      .from('rulesets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a ruleset
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('rulesets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
