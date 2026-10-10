/**
 * #569 — Saga/session runtime columns must not be selectable by authenticated
 * clients; infrastructure must use explicit safe column lists (no select *).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function fail(message) {
  console.error(`Saga state column privileges check failed: ${message}`);
  process.exit(1);
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) fail(`missing ${label}`);
}

function rejectMatch(content, pattern, label) {
  if (pattern.test(content)) fail(label);
}

const migrationPath = 'supabase/migrations/059_saga_state_column_privileges.sql';
if (!existsSync(join(root, migrationPath))) {
  fail(`missing ${migrationPath}`);
}

const migration = read(migrationPath);
requireMatch(
  migration,
  /REVOKE SELECT ON TABLE public\.projects FROM authenticated/i,
  'REVOKE table SELECT on projects from authenticated',
);
requireMatch(
  migration,
  /REVOKE SELECT ON TABLE public\.sessions FROM authenticated/i,
  'REVOKE table SELECT on sessions from authenticated',
);
requireMatch(
  migration,
  /GRANT SELECT \(%s\) ON TABLE public\.projects TO authenticated/i,
  'dynamic GRANT SELECT safe projects columns',
);
requireMatch(
  migration,
  /GRANT SELECT \(%s\) ON TABLE public\.sessions TO authenticated/i,
  'dynamic GRANT SELECT safe sessions columns',
);
requireMatch(
  migration,
  /adventure_runtime/,
  'adventure_runtime mentioned (ensure + deny)',
);
requireMatch(
  migration,
  /world_state/,
  'world_state mentioned',
);
requireMatch(
  migration,
  /GRANT ALL ON TABLE public\.projects TO service_role/i,
  'service_role grant on projects',
);
requireMatch(
  migration,
  /GRANT ALL ON TABLE public\.sessions TO service_role/i,
  'service_role grant on sessions',
);

const snapshotMigration = read('supabase/migrations/050_session_adventure_runtime.sql');
requireMatch(
  snapshotMigration,
  /GRANT EXECUTE ON FUNCTION public\.get_session_runtime_snapshot\(UUID\) TO authenticated/i,
  'get_session_runtime_snapshot EXECUTE for authenticated',
);

const applyMigrations = read('scripts/apply-migrations.sh');
requireMatch(
  applyMigrations,
  /059_saga_state_column_privileges\.sql/,
  'apply-migrations lists 059',
);

const projectService = read('src/infrastructure/project/project-service.ts');
const sessionService = read('src/infrastructure/session/session-service.ts');

requireMatch(projectService, /PROJECT_SAFE_COLUMNS/, 'PROJECT_SAFE_COLUMNS constant');
requireMatch(projectService, /SESSION_SAFE_COLUMNS/, 'SESSION_SAFE_COLUMNS in project-service');
requireMatch(sessionService, /SESSION_SAFE_COLUMNS/, 'SESSION_SAFE_COLUMNS in session-service');

function safeColumnList(source, constName) {
  const match = source.match(
    new RegExp(`const ${constName}\\s*=\\s*([\\\`'"])([\\s\\S]*?)\\1`),
  );
  return match ? match[2] : '';
}

const projectSafe = safeColumnList(projectService, 'PROJECT_SAFE_COLUMNS');
const projectSessionSafe = safeColumnList(projectService, 'SESSION_SAFE_COLUMNS');
const sessionSafe = safeColumnList(sessionService, 'SESSION_SAFE_COLUMNS');
if (!projectSafe) fail('PROJECT_SAFE_COLUMNS string not found');
if (!projectSessionSafe) fail('project-service SESSION_SAFE_COLUMNS string not found');
if (!sessionSafe) fail('session-service SESSION_SAFE_COLUMNS string not found');
if (/\badventure_runtime\b/.test(projectSafe)) {
  fail('PROJECT_SAFE_COLUMNS must not include adventure_runtime');
}
if (/\b(world_state|notes)\b/.test(projectSessionSafe)) {
  fail('project-service SESSION_SAFE_COLUMNS must not include world_state/notes');
}
if (/\b(world_state|notes)\b/.test(sessionSafe)) {
  fail('session-service SESSION_SAFE_COLUMNS must not include world_state/notes');
}

rejectMatch(
  projectService,
  /\.from\(\s*this\.tableName\s*\)[\s\S]{0,120}?\.select\(\s*['"]\*['"]\s*\)/,
  'project-service selects * from projects',
);
rejectMatch(
  projectService,
  /\.from\(\s*this\.sessionsTableName\s*\)[\s\S]{0,120}?\.select\(\s*['"]\*['"]\s*\)/,
  'project-service selects * from sessions',
);
rejectMatch(projectService, /projects!inner\(\*\)/, 'project-service nested projects!inner(*)');
rejectMatch(
  sessionService,
  /\.from\(\s*this\.tableName\s*\)[\s\S]{0,120}?\.select\(\s*['"]\*['"]\s*\)/,
  'session-service selects * from sessions',
);
rejectMatch(sessionService, /sessions!inner\(\*\)/, 'session-service nested sessions!inner(*)');

const infraDir = join(root, 'src/infrastructure');
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

for (const filePath of walk(infraDir)) {
  const rel = filePath.slice(root.length + 1);
  const content = readFileSync(filePath, 'utf8');
  if (
    /\.from\(\s*['"]projects['"]\s*\)[\s\S]{0,160}?\.select\(\s*['"]\*['"]\s*\)/.test(content)
    || /\.from\(\s*['"]sessions['"]\s*\)[\s\S]{0,160}?\.select\(\s*['"]\*['"]\s*\)/.test(content)
  ) {
    fail(`${rel} still uses select('*') on projects/sessions`);
  }
  if (/projects!inner\(\*\)/.test(content) || /sessions!inner\(\*\)/.test(content)) {
    fail(`${rel} still uses !inner(*) embed for projects/sessions`);
  }
  if (
    /\.from\(\s*['"]projects['"]\s*\)[\s\S]{0,200}?\.select\([^)]*adventure_runtime/.test(content)
  ) {
    fail(`${rel} explicitly selects projects.adventure_runtime`);
  }
  if (
    /\.from\(\s*['"]sessions['"]\s*\)[\s\S]{0,200}?\.select\([^)]*world_state/.test(content)
    || /\.from\(\s*['"]sessions['"]\s*\)[\s\S]{0,200}?\.select\([^)]*\bnotes\b/.test(content)
  ) {
    fail(`${rel} explicitly selects sessions.world_state or notes`);
  }
}

console.log('Saga state column privileges check passed.');
