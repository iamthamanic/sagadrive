import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) {
    console.error(`Character editor regression check failed: missing ${label}.`);
    process.exit(1);
  }
}

function rejectMatch(content, pattern, label) {
  if (pattern.test(content)) {
    console.error(`Character editor regression check failed: ${label}.`);
    process.exit(1);
  }
}

const runtime = read('src/modules/characters/avatar/characterStudio/CharacterStudioRuntime.ts');
const editor = read('src/components/CharacterEditor.tsx');
const characterTypes = read('src/modules/characters/types/character.types.ts');
const characterService = read('src/modules/characters/services/character.service.ts');
const loreService = read('src/modules/characters/lore/service.ts');
const rulesetMigration = read('supabase/migrations/005_character_ruleset_metadata.sql');
const portraitStorageMigration = read('supabase/migrations/006_character_portrait_storage.sql');
const projectTypes = read('src/modules/projects/types/project.types.ts');
const projectService = read('src/modules/projects/services/project.service.ts');

requireMatch(
  runtime,
  /this\.applyAppearance\(this\.currentAvatar \?\? avatar, this\.currentManifest \?\? manifest\)/,
  'latest avatar appearance replay after async model load',
);

requireMatch(
  editor,
  /ruleset_key:\s*ruleset,[\s\S]*?dnd_background:\s*isDnd55 \? dndBackground : null/,
  'ruleset and D&D background in CharacterEditor save payload',
);
requireMatch(characterTypes, /ruleset_key\?:\s*CharacterRulesetKey/, 'ruleset key DTO contract');
requireMatch(characterTypes, /dnd_background\?:\s*string \| null/, 'D&D background DTO contract');
requireMatch(characterTypes, /rulesetKey:\s*CharacterRulesetKey/, 'ruleset key view-model contract');
requireMatch(characterTypes, /dndBackground\?:\s*string/, 'D&D background view-model contract');
requireMatch(
  characterService,
  /ruleset_key:\s*rulesetKey,[\s\S]*?dnd_background:\s*rulesetKey === 'dnd-5\.5e'/,
  'ruleset-aware character create persistence',
);
requireMatch(
  characterService,
  /const rulesetKey = dto\.ruleset_key === 'dnd-5\.5e' \? 'dnd-5\.5e' : 'sagadrive-core'/,
  'backward-compatible ruleset read fallback',
);
requireMatch(
  rulesetMigration,
  /ADD COLUMN IF NOT EXISTS ruleset_key TEXT NOT NULL DEFAULT 'sagadrive-core'/,
  'ruleset key migration',
);
requireMatch(
  rulesetMigration,
  /CHECK \(ruleset_key IN \('sagadrive-core', 'dnd-5\.5e'\)\)/,
  'ruleset key database constraint',
);
requireMatch(
  rulesetMigration,
  /ADD COLUMN IF NOT EXISTS dnd_background TEXT/,
  'D&D background migration',
);

requireMatch(
  characterService,
  /supabase\.storage[\s\S]*?\.from\(CHARACTER_PORTRAIT_BUCKET\)[\s\S]*?\.upload\(filePath, file/,
  'portrait upload through configured Supabase Storage client',
);
requireMatch(
  characterService,
  /createSignedUrl\(filePath, 31_536_000\)/,
  'private portrait signed URL creation',
);
rejectMatch(
  characterService,
  /https:\/\/\$\{projectId\}\.supabase\.co|make-server-9f6fb44c\/characters\/upload-portrait/,
  'portrait upload still uses the fixed hosted make-server endpoint',
);
requireMatch(
  portraitStorageMigration,
  /INSERT INTO storage\.buckets[\s\S]*?VALUES\s*\(\s*'character-portraits',\s*'character-portraits',\s*false,\s*5242880,/,
  'private portrait storage bucket with 5MB limit',
);
requireMatch(
  portraitStorageMigration,
  /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/,
  'owner-scoped portrait storage policies',
);

requireMatch(
  loreService,
  /error\.context\.clone\(\)\.json\(\)/,
  'structured Edge Function HTTP error parsing',
);
requireMatch(
  loreService,
  /serverMessage \?\?\s*'Hintergrundgeschichte konnte nicht generiert werden\. Bitte versuche es erneut\.'/,
  'generic lore fallback only after server message lookup',
);
rejectMatch(
  loreService,
  /if \(error\)[\s\S]{0,220}?Prüfe die Character-AI-Konfiguration/,
  'lore HTTP errors are collapsed into a configuration message',
);

requireMatch(
  projectTypes,
  /status: 'active' \| 'paused' \| 'completed' \| 'archived'/,
  'legacy archived project status in DTO/view-model types',
);
requireMatch(
  projectService,
  /value === 'active' \|\| value === 'paused' \|\| value === 'completed' \|\| value === 'archived'/,
  'legacy archived project runtime validation',
);

console.log('Character editor regression check passed.');