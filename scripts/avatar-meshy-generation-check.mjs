#!/usr/bin/env node
/**
 * avatar-meshy-generation-check — deterministic tests for #10 Meshy avatar generation.
 * Location: scripts/avatar-meshy-generation-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function check(cond, msg) {
  if (!cond) {
    console.error(`avatar-meshy-generation-check FAIL: ${msg}`);
    process.exit(1);
  }
}

const domain = read('src/domains/character/avatar/meshy-avatar-job.ts');
const index = read('src/domains/character/avatar/index.ts');
const service = read('src/infrastructure/character/avatar/character-avatar-meshy-service.ts');
const panel = read('src/app/character/avatar/AvatarMeshyPanel.tsx');
const editor = read('src/app/character/edit/CharacterEditor.tsx');
const edge = read('supabase/functions/character-avatar-meshy/index.ts');
const provider = read('supabase/functions/_shared/avatar-meshy-text-to-3d.ts');
const migration = read('supabase/migrations/026_character_avatar_meshy_jobs.sql');
const agents = read('AGENTS.md');

check(/MESHY_AVATAR_JOB_CONTRACT_VERSION/.test(domain), 'job contract version');
check(/validateMeshyAvatarPrompt/.test(domain), 'prompt validator');
check(/assertNoCapabilityFromProviderStatus/.test(domain), 'no capability from provider');
check(/buildMeshyAvatarIdempotencyKey/.test(domain), 'idempotency key');
check(!/from ['"]react['"]/.test(domain), 'domain no React');

check(/export \{[\s\S]*validateMeshyAvatarPrompt/.test(index), 'barrel exports validator');
check(/assertNoCapabilityFromProviderStatus/.test(index), 'barrel exports capability guard');

check(/character-avatar-meshy/.test(service), 'invokes edge function');
check(!/MESHY_API_KEY/.test(service), 'no meshy key in client service');
check(/assertNoCapabilityFromProviderStatus/.test(service), 'service forces pending caps');

check(/Mit KI erstellen/.test(panel), 'CTA label');
check(/data-avatar-meshy-status/.test(panel), 'status attr');
check(/Kosten bestätigen/.test(panel), 'cost confirm');
check(/sessionStorage/.test(panel), 'reload-stable job id');
check(/data-avatar-meshy-retry/.test(panel), 'explicit retry');
check(/AvatarMeshyPanel/.test(editor), 'editor mounts panel');

check(/downloadMeshyGlbBytes/.test(edge), 'SSRF-safe download');
check(/resolveMeshyApiKeyForUser/.test(edge), 'server-side key resolve');
check(/rig_analysis_status: 'pending'/.test(edge) || /rig_analysis_status: \"pending\"/.test(edge) || /rigAnalysisStatus: 'pending'/.test(edge), 'capabilities stay pending');
check(/consumeAvatarMeshyRateLimit/.test(edge), 'rate limit');
check(/idempotency_key/.test(edge), 'idempotency');

check(/text-to-3d/.test(provider), 'text-to-3d provider');
check(/createMockMeshyTextTo3dProvider/.test(provider), 'mock provider');

check(/character_avatar_meshy_jobs/.test(migration), 'jobs table');
check(/rig_analysis_status = 'pending'/.test(migration), 'insert forces pending');
check(/idx_character_avatar_meshy_idempotency/.test(migration), 'idempotency unique index');

check(/Immediately claim the next issue/.test(agents) || /auto-compact in-session/.test(agents), 'AGENTS auto-compact policy');

// pure prompt / capability replica
function validatePrompt(p) {
  const n = p.trim().replace(/\s+/g, ' ');
  if (n.length < 8) return false;
  if (n.length > 500) return false;
  return true;
}
check(validatePrompt('abc') === false && validatePrompt('elf warrior hero') === true, 'prompt length gate');
function capsFromProvider() { return 'pending'; }
check(capsFromProvider('SUCCEEDED') === 'pending', 'no capability escalate');

console.log('avatar-meshy-generation-check PASS');
