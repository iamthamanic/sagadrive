import { readFileSync } from 'node:fs';
import process from 'node:process';

const root = process.cwd();

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) {
    console.error(`Project membership security check failed: missing ${label}.`);
    process.exit(1);
  }
}

function rejectMatch(content, pattern, label) {
  if (pattern.test(content)) {
    console.error(`Project membership security check failed: ${label}.`);
    process.exit(1);
  }
}

const canonicalRls = read('src/supabase/schema_v3_rls.sql');
const migration = read('supabase/migrations/004_project_membership_security.sql');
const projectService = read('src/modules/projects/services/project.service.ts');
const memberService = read('src/modules/projects/services/project-member.service.ts');

for (const [label, pattern] of [
  ['client join INSERT policy', /CREATE POLICY\s+"Users can join projects"/i],
  ['client membership UPDATE policy', /CREATE POLICY\s+"Users can update their member record"/i],
  ['unrestricted client membership DELETE policy', /CREATE POLICY\s+"Users can leave projects"/i],
]) {
  rejectMatch(canonicalRls, pattern, label);
}

requireMatch(
  canonicalRls,
  /CREATE POLICY\s+"GM can update members in their projects"[\s\S]*?WITH CHECK[\s\S]*?gm_user_id\s*=\s*auth\.uid\(\)/i,
  'GM-controlled membership update policy',
);
requireMatch(
  canonicalRls,
  /CREATE POLICY\s+"Active members can view their projects"[\s\S]*?current_user_is_active_project_member/i,
  'active-member project visibility policy',
);
requireMatch(
  canonicalRls,
  /CREATE OR REPLACE FUNCTION public\.join_project_by_code[\s\S]*?SECURITY DEFINER[\s\S]*?auth\.uid\(\)[\s\S]*?'player'[\s\S]*?'active'/i,
  'server-owned join-by-code RPC',
);
requireMatch(
  canonicalRls,
  /REVOKE ALL ON FUNCTION public\.join_project_by_code\(TEXT, UUID\) FROM PUBLIC;/i,
  'join RPC public revoke',
);
requireMatch(
  canonicalRls,
  /CREATE OR REPLACE FUNCTION public\.set_my_project_character[\s\S]*?SET character_id = p_character_id[\s\S]*?user_id = v_user_id[\s\S]*?status = 'active'/i,
  'character-only membership update RPC',
);

requireMatch(
  migration,
  /DROP POLICY IF EXISTS "Users can update their member record" ON public\.project_members;/i,
  'existing-deployment removal of self-update policy',
);
requireMatch(
  migration,
  /DROP POLICY IF EXISTS "Users can view their own projects" ON public\.projects;/i,
  'legacy project visibility hardening',
);
requireMatch(
  migration,
  /CREATE POLICY "Active members can view their projects"[\s\S]*?current_user_is_active_project_member/i,
  'migration active-member project policy',
);

requireMatch(
  memberService,
  /\.rpc\('join_project_by_code'/,
  'frontend join path through secure RPC',
);
requireMatch(
  memberService,
  /\.rpc\('set_my_project_character'/,
  'frontend character selection through secure RPC',
);
rejectMatch(
  memberService,
  /\.from\('project_members'\)[\s\S]{0,160}?\.insert\(/,
  'project member service directly inserts authorization rows',
);
rejectMatch(
  memberService,
  /\.from\('project_members'\)[\s\S]{0,160}?\.update\(/,
  'project member service directly updates protected membership rows',
);
requireMatch(
  projectService,
  /projectMemberService\.joinByCode\(payload\)/,
  'project join flow delegates to secure member service',
);
requireMatch(
  projectService,
  /\.eq\('status', 'active'\)/,
  'project listing filters inactive memberships',
);

console.log('Project membership security check passed.');
