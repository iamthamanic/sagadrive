import { supabase } from '../../../lib/supabase';
import { getSpeciesDevelopmentMode } from '../worldModuleRegistry';
import { worldProfileService } from './worldProfile.service';
import type { EffectiveWorldConfig, WorldProfileVm } from '../types/world.types';

interface ParticipationRow {
  character_id: string | null;
  status: string;
}

interface ProjectWorldProfileRow {
  id: string;
  world_profile_id: string | null;
}

export function buildEffectiveWorldConfigForParticipation(
  projectId: string,
  characterId: string,
  world: WorldProfileVm,
): EffectiveWorldConfig {
  return {
    projectId,
    characterId,
    worldProfileId: world.id,
    worldName: world.name,
    modules: world.modules,
    speciesDevelopmentMode: getSpeciesDevelopmentMode(world.modules),
    source: 'project-world-profile',
  };
}

export async function resolveEffectiveWorldConfigForParticipation(
  projectId: string,
  characterId: string,
): Promise<EffectiveWorldConfig> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  if (!projectId || !characterId) throw new Error('Abenteuer und Charakter sind erforderlich.');

  const { data: membership, error: membershipError } = await supabase
    .from('project_members')
    .select('character_id,status')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (membershipError || !membership) {
    throw new Error('Keine aktive Teilnahme an diesem Abenteuer gefunden.');
  }

  const participation = membership as ParticipationRow;
  if (participation.character_id !== characterId) {
    throw new Error('Der Charakter ist dieser Abenteuerteilnahme nicht zugewiesen.');
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id,world_profile_id')
    .eq('id', projectId)
    .single();

  if (projectError || !project) throw new Error('Abenteuer nicht gefunden.');
  const projectRow = project as ProjectWorldProfileRow;
  if (!projectRow.world_profile_id) {
    throw new Error('Diesem Abenteuer ist noch keine Welt zugewiesen.');
  }

  const world = await worldProfileService.getAccessibleWorldProfileById(projectRow.world_profile_id);
  return buildEffectiveWorldConfigForParticipation(projectId, characterId, world);
}
