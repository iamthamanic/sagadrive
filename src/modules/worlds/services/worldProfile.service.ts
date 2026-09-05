import { supabase } from '../../../lib/supabase';
import { normalizeWorldModuleConfigMap } from '../worldModuleRegistry';
import type {
  CreateWorldProfileDto,
  UpdateWorldProfileDto,
  WorldProfileDto,
  WorldProfileVm,
} from '../types/world.types';

function normalizeName(value: string): string {
  const name = value.trim();
  if (!name) throw new Error('Der Name der Welt ist erforderlich.');
  if (name.length > 255) throw new Error('Der Name der Welt darf höchstens 255 Zeichen lang sein.');
  return name;
}

function normalizeDescription(value?: string): string | null {
  const description = value?.trim() ?? '';
  return description || null;
}

class WorldProfileService {
  private readonly tableName = 'world_profiles';

  private mapToViewModel(dto: WorldProfileDto): WorldProfileVm {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description ?? '',
      modules: normalizeWorldModuleConfigMap(dto.modules),
      createdAt: new Date(dto.created_at),
      updatedAt: new Date(dto.updated_at),
    };
  }

  async getUserWorldProfiles(ownerUserId: string): Promise<WorldProfileVm[]> {
    if (!ownerUserId) throw new Error('User not authenticated');
    const { data, error } = await supabase
      .from(this.tableName)
      .select('id, name, description, modules, created_at, updated_at')
      .eq('owner_user_id', ownerUserId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Welten konnten nicht geladen werden: ${error.message}`);
    return (data ?? []).map((entry) => this.mapToViewModel(entry as WorldProfileDto));
  }

  async createWorldProfile(ownerUserId: string, payload: CreateWorldProfileDto): Promise<WorldProfileVm> {
    if (!ownerUserId) throw new Error('User not authenticated');
    const insertPayload = {
      owner_user_id: ownerUserId,
      name: normalizeName(payload.name),
      description: normalizeDescription(payload.description),
      modules: normalizeWorldModuleConfigMap(payload.modules),
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(`Welt konnte nicht erstellt werden: ${error.message}`);
    return this.mapToViewModel(data as WorldProfileDto);
  }

  async updateWorldProfile(
    ownerUserId: string,
    id: string,
    payload: UpdateWorldProfileDto,
  ): Promise<WorldProfileVm> {
    if (!ownerUserId) throw new Error('User not authenticated');
    const updatePayload = {
      ...(typeof payload.name === 'string' ? { name: normalizeName(payload.name) } : {}),
      ...(typeof payload.description === 'string' ? { description: normalizeDescription(payload.description) } : {}),
      ...(payload.modules ? { modules: normalizeWorldModuleConfigMap(payload.modules) } : {}),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updatePayload)
      .eq('id', id)
      .eq('owner_user_id', ownerUserId)
      .select()
      .single();

    if (error) throw new Error(`Welt konnte nicht gespeichert werden: ${error.message}`);
    return this.mapToViewModel(data as WorldProfileDto);
  }

  async deleteWorldProfile(ownerUserId: string, id: string): Promise<void> {
    if (!ownerUserId) throw new Error('User not authenticated');

    // World item definitions reference this profile with ON DELETE RESTRICT so
    // owned instances never become permanently unresolvable. Refuse early with
    // a German message instead of surfacing the Postgres FK error.
    const { count, error: catalogError } = await supabase
      .from('inventory_item_definitions')
      .select('id', { count: 'exact', head: true })
      .eq('world_profile_id', id);
    if (catalogError) {
      throw new Error(`Welt konnte nicht gelöscht werden: ${catalogError.message}`);
    }
    if ((count ?? 0) > 0) {
      throw new Error(
        'Welt kann nicht gelöscht werden, solange Gegenstand-Definitionen darauf verweisen. Archivieren Sie die Definitionen zuerst — Löschen würde bestehende Inventare unauflösbar machen.',
      );
    }

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('owner_user_id', ownerUserId);

    if (error) throw new Error(`Welt konnte nicht gelöscht werden: ${error.message}`);
  }
}

export const worldProfileService = new WorldProfileService();
