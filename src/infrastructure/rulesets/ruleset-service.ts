/**
 * ruleset-service — Ruleset catalog service (Supabase adapter).
 * Location: src/infrastructure/rulesets/ruleset-service.ts
 */
import { supabase } from '../../lib/supabase';
import type { CreateRulesetDTO, Ruleset, UpdateRulesetDTO } from '../../domains/rules/ruleset-catalog';

export const rulesetService = {
  async getAll(): Promise<Ruleset[]> {
    const { data, error } = await supabase
      .from('rulesets')
      .select('*')
      .order('is_official', { ascending: false })
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getOfficial(): Promise<Ruleset[]> {
    const { data, error } = await supabase
      .from('rulesets')
      .select('*')
      .eq('is_official', true)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Ruleset | null> {
    const { data, error } = await supabase.from('rulesets').select('*').eq('id', id).single();

    if (error) throw error;
    return data;
  },

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

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('rulesets').delete().eq('id', id);

    if (error) throw error;
  },
};
