/**
 * Character presets MVP regression contract (static source checks).
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) {
    console.error(`Character presets regression check failed: missing ${label}.`);
    process.exit(1);
  }
}

function rejectMatch(content, pattern, label) {
  if (pattern.test(content)) {
    console.error(`Character presets regression check failed: ${label}.`);
    process.exit(1);
  }
}

const migration = read('supabase/migrations/012_character_presets.sql');
const types = read('src/modules/characters/types/characterPreset.types.ts');
const service = read('src/modules/characters/services/characterPreset.service.ts');
const panel = read('src/modules/characters/components/CharacterPresetPanel.tsx');
const dialog = read('src/modules/characters/components/CreateCharacterEntryDialog.tsx');
const editor = read('src/components/CharacterEditor.tsx');
const library = read('src/components/Library.tsx');
const dashboard = read('src/components/Dashboard.tsx');
const characterTypes = read('src/modules/characters/types/character.types.ts');
const characterService = read('src/modules/characters/services/character.service.ts');

requireMatch(migration, /CREATE TABLE IF NOT EXISTS public\.character_presets/, 'character_presets table');
requireMatch(migration, /owner_user_id = auth\.uid\(\)/, 'owner RLS on character_presets');
requireMatch(migration, /ON DELETE SET NULL/, 'source character set-null on delete');
requireMatch(migration, /published BOOLEAN NOT NULL DEFAULT FALSE/, 'published false default');
requireMatch(migration, /published must remain false/, 'published stay false trigger');

requireMatch(types, /interface CharacterPresetSnapshot/, 'preset snapshot type');
requireMatch(types, /schemaVersion: 1/, 'snapshot schema version');
requireMatch(types, /freeSkillRanks/, 'free skill ranks in snapshot');
requireMatch(types, /published: boolean/, 'published flag on preset vm/dto');

requireMatch(service, /assertValidSnapshot/, 'server-side snapshot validation');
requireMatch(service, /createPresetFromCharacter/, 'create preset from character');
requireMatch(service, /releaseVersion/, 'append-only version release');
requireMatch(service, /Für Level .* existiert bereits/, 'reject duplicate level version');
requireMatch(service, /maybeAutoReleaseVersion/, 'auto release helper');
requireMatch(service, /\(Kopie\)/, 'duplicate name suffix');
requireMatch(service, /sourceCharacterMissing/, 'deleted source character note support');

requireMatch(characterTypes, /presetReleaseMode\?:/, 'release mode on sagadrive profile');
requireMatch(characterService, /presetReleaseMode/, 'release mode normalized in character service');

requireMatch(panel, /Als Preset speichern/, 'save as preset CTA');
requireMatch(panel, /Version freigeben/, 'release version CTA');
requireMatch(panel, /Auto-Freigabe bei Level-Up/, 'auto release toggle');
requireMatch(panel, /Coming soon/, 'marketplace stub');
requireMatch(panel, /disabled/, 'marketplace button disabled');
requireMatch(panel, /Speichere den Charakter zuerst/, 'unsaved character guidance');

requireMatch(dialog, /Eigenen Charakter erstellen/, 'own character create card');
requireMatch(dialog, /Preset wählen/, 'preset choose card');
requireMatch(dialog, /Noch keine Presets/, 'empty presets state');
requireMatch(dialog, /SagaDrive-Presets bald/, 'system presets stub section');
requireMatch(dialog, /Level /, 'version level picker');
requireMatch(dialog, /setCharacterEditorBootstrap/, 'bootstrap wiring from dialog');

requireMatch(editor, /value="settings"/, 'Einstellungen editor tab');
requireMatch(editor, /CharacterPresetPanel/, 'preset panel mounted');
requireMatch(editor, /takeCharacterEditorBootstrap/, 'bootstrap consume');
requireMatch(editor, /updateCharacter\(savedCharacterId/, 'update existing character on save');

requireMatch(library, /CreateCharacterEntryDialog/, 'library create dialog');
requireMatch(dashboard, /CreateCharacterEntryDialog/, 'dashboard create dialog');
rejectMatch(library, /Bibliothek Presets|Presets-Tab/, 'separate library presets tab');

console.log('Character presets regression check passed.');
