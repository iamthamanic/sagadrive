import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) {
    console.error(`World context regression check failed: missing ${label}.`);
    process.exit(1);
  }
}

function rejectMatch(content, pattern, label) {
  if (pattern.test(content)) {
    console.error(`World context regression check failed: ${label}.`);
    process.exit(1);
  }
}

const migration = read('supabase/migrations/009_project_world_profiles.sql');
const projectService = read('src/modules/projects/services/project.service.ts');
const effectiveWorldService = read('src/modules/worlds/services/effectiveWorld.service.ts');
const projectJoin = read('src/components/ProjectJoin.tsx');
const library = read('src/components/Library.tsx');

requireMatch(migration, /ADD COLUMN IF NOT EXISTS world_profile_id UUID REFERENCES public\.world_profiles\(id\)/i, 'dedicated project world-profile foreign key');
rejectMatch(migration, /DROP COLUMN[^;]*world_id|ALTER COLUMN[^;]*world_id|RENAME COLUMN\s+world_id/i, 'legacy projects.world_id is reinterpreted or removed');
requireMatch(migration, /CREATE POLICY "GM can update their projects"[\s\S]*?USING \(gm_user_id = auth\.uid\(\)\)[\s\S]*?WITH CHECK \(gm_user_id = auth\.uid\(\)\)/i, 'project GM update policy with immutable owner check');
requireMatch(migration, /CREATE OR REPLACE FUNCTION public\.set_project_world_profile[\s\S]*?SECURITY DEFINER[\s\S]*?gm_user_id = v_user_id[\s\S]*?owner_user_id = v_user_id/i, 'GM-only world assignment RPC with owner check');
requireMatch(migration, /CREATE POLICY "Users can view owned or assigned world profiles"[\s\S]*?current_user_is_active_project_member\(projects\.id\)/i, 'active participant world-profile visibility');

requireMatch(projectService, /world_id:\s*null,[\s\S]*?world_profile_id:\s*payload\.world_profile_id/i, 'new adventures write only the rule-world profile link');
requireMatch(projectService, /\.rpc\('set_project_world_profile'/i, 'adventure world changes use secure RPC');
rejectMatch(projectService, /setWorldProfile[\s\S]*?\.update\([^)]*world_id/i, 'world-profile setter writes the legacy world_id');

requireMatch(effectiveWorldService, /\.eq\('status', 'active'\)[\s\S]*?participation\.character_id !== characterId/i, 'effective world requires active membership and exact assigned character');
requireMatch(effectiveWorldService, /\.select\('id,world_profile_id'\)[\s\S]*?getAccessibleWorldProfileById/i, 'effective world resolves through the project world profile');

requireMatch(projectJoin, /world_profile_id:\s*selectedWorldId/i, 'adventure creation includes selected world profile');
requireMatch(projectJoin, /joinProject\(\{\s*code:\s*joinCode,\s*character_id:\s*selectedCharacterId/i, 'join flow requires selected character');
requireMatch(library, /buildEffectiveWorldConfigForParticipation/i, 'library derives effective world config from participation context');
rejectMatch(library, /Das vergessene Königreich|Schatten über Neverwinter/i, 'static adventure fixtures remain in library');

console.log('World context regression check passed.');
