import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) { return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }
function requireMatch(content, pattern, label) { if (!pattern.test(content)) { console.error(`Character editor regression check failed: missing ${label}.`); process.exit(1); } }
function rejectMatch(content, pattern, label) { if (pattern.test(content)) { console.error(`Character editor regression check failed: ${label}.`); process.exit(1); } }

const runtime = read('src/modules/characters/avatar/characterStudio/CharacterStudioRuntime.ts');
const editor = read('src/components/CharacterEditor.tsx');
const speciesTraitsPanel = read('src/modules/characters/components/SpeciesTraitsPanel.tsx');
const speciesTraitOptions = read('src/modules/rulesets/speciesTraitOptions.ts');
const characterTypes = read('src/modules/characters/types/character.types.ts');
const characterService = read('src/modules/characters/services/character.service.ts');
const characterCreation = read('src/modules/rulesets/characterCreation.ts');
const inventoryPanel = read('src/modules/characters/components/CharacterInventoryPanel.tsx');
const abilitiesPanel = read('src/modules/characters/components/CharacterAbilitiesPanel.tsx');
const skillsPanel = read('src/modules/characters/components/CharacterSkillsPanel.tsx');
const loreService = read('src/modules/characters/lore/service.ts');
const rulesetMigration = read('supabase/migrations/005_character_ruleset_metadata.sql');
const portraitStorageMigration = read('supabase/migrations/006_character_portrait_storage.sql');
const sagaDriveProfileMigration = read('supabase/migrations/007_sagadrive_character_profile.sql');
const projectTypes = read('src/modules/projects/types/project.types.ts');
const projectService = read('src/modules/projects/services/project.service.ts');

requireMatch(runtime, /this\.applyAppearance\(this\.currentAvatar \?\? avatar, this\.currentManifest \?\? manifest\)/, 'latest avatar appearance replay after async model load');
requireMatch(editor, /ruleset_key:\s*ruleset/, 'SagaDrive Core ruleset in CharacterEditor save payload');
requireMatch(editor, /dnd_background:\s*null/, 'D&D metadata cleared in SagaDrive Core save payload');
requireMatch(editor, /TabsTrigger value="info"[\s\S]*TabsTrigger value="background"[\s\S]*TabsTrigger value="values"[\s\S]*TabsTrigger value="appearance"[\s\S]*TabsTrigger value="inventory"[\s\S]*TabsTrigger value="notes"/, 'SagaDrive Core editor tabs');
requireMatch(editor, /TabsTrigger value="attribute"[\s\S]*TabsTrigger value="archetype"[\s\S]*TabsTrigger value="essenz"/, 'Parameter sub-tabs for Attribute, Archetyp and Essenz');
rejectMatch(editor, /TabsTrigger value="talente"/, 'legacy Talente Parameter sub-tab remains');
requireMatch(editor, /<SpeciesTraitsPanel/, 'species traits panel inside CharacterEditor');
requireMatch(editor, /speciesTraitCost !== SAGA_DRIVE_SPECIES_TRAIT_BUDGET/, 'exact species trait budget save validation');
requireMatch(editor, /speciesTraitInstances:\s*speciesTraitInstances\.map/, 'canonical species trait instance persistence');
requireMatch(editor, /acquiredAtLevel:\s*1/, 'species creation traits remain level-one acquisitions');
requireMatch(editor, /speciesProfile:\s*characterRace === 'alien'/, 'Alien species profile persistence');
requireMatch(editor, /GenderReadingSelect/, 'gender reading field in CharacterEditor');
requireMatch(editor, /SkillSelectField/, 'skill select fields in CharacterEditor');
requireMatch(editor, /SAGA_DRIVE_START_ATTRIBUTE_ARRAY/, 'SagaDrive start attribute distribution validation');
requireMatch(editor, /sagadrive_profile:\s*sagaDriveProfile/, 'SagaDrive profile save payload');
requireMatch(editor, /notes:\s*notes\.trim\(\)/, 'persistent notes save payload');
rejectMatch(editor, /starter-fireball|Feuerball/, 'free starter fireball remains in CharacterEditor');
rejectMatch(editor, /Dungeons & Dragons 5\.5e nutzt|Wähle Klasse|dnd-class/, 'active D&D creation UI remains in CharacterEditor');

requireMatch(speciesTraitsPanel, /Name deiner Spezies \*/, 'required Alien species profile name field');
requireMatch(speciesTraitsPanel, /Körperbeschreibung/, 'Alien body description field');
requireMatch(speciesTraitsPanel, /Noch nicht verfügbar/, 'unavailable species trait treatment');
requireMatch(speciesTraitsPanel, /Weitere Auswahl/, 'repeatable species trait add control');
requireMatch(speciesTraitsPanel, /jede Unteroption nur einmal/, 'repeatable species trait duplicate-option guidance');
requireMatch(speciesTraitsPanel, /Die Speziespunkte steigen nicht automatisch mit der Charakterstufe/, 'species budget does not scale with level');
requireMatch(speciesTraitsPanel, /SpeciesTraitOptionItem/, 'dropdown option rows with help tooltips');
rejectMatch(speciesTraitsPanel, /trait\.detailPlaceholder|onTraitDetailChange|SpeciesTraitDetailValues/, 'legacy free-text species trait detail UI remains');

requireMatch(speciesTraitOptions, /label:\s*'Sehen'/, 'sharpened sense option catalog');
requireMatch(speciesTraitOptions, /label:\s*'Gift \/ Toxine'/, 'narrow resistance option catalog');
requireMatch(speciesTraitOptions, /label:\s*'Hitze & Trockenheit'/, 'environment adaptation option catalog');
requireMatch(speciesTraitOptions, /label:\s*'Dunkelsicht'/, 'enhanced sight option catalog');
requireMatch(speciesTraitOptions, /label:\s*'Vakuum & Sauerstofflosigkeit'/, 'extreme environment option catalog');
requireMatch(speciesTraitOptions, /normalizeSagaDriveSpeciesTraitOptionKey/, 'legacy option normalization');

requireMatch(characterTypes, /endurance:\s*number/, 'SagaDrive Ausdauer attribute DTO');
requireMatch(characterTypes, /mind:\s*number/, 'SagaDrive Verstand attribute DTO');
requireMatch(characterTypes, /perception:\s*number/, 'SagaDrive Wahrnehmung attribute DTO');
requireMatch(characterTypes, /sagadrive_profile\?:/, 'SagaDrive profile DTO contract');
requireMatch(characterTypes, /interface SagaDriveSpeciesTraitInstanceDto/, 'species trait instance DTO');
requireMatch(characterTypes, /speciesTraitInstances:\s*SagaDriveSpeciesTraitInstanceDto\[\]/, 'canonical species trait instance collection');
requireMatch(characterTypes, /source:\s*SagaDriveSpeciesTraitSource/, 'species trait source metadata');
requireMatch(characterTypes, /acquiredAtLevel:\s*number/, 'species trait acquisition level metadata');
requireMatch(characterTypes, /speciesTraits\?:\s*SagaDriveSpeciesTraitKey\[\]/, 'legacy species trait array read compatibility');
requireMatch(characterTypes, /speciesTraitDetails\?:\s*SagaDriveSpeciesTraitDetailsDto/, 'legacy species trait detail read compatibility');
requireMatch(characterTypes, /speciesProfile\?:\s*SagaDriveSpeciesProfileDto/, 'structured Alien species profile DTO');
requireMatch(characterTypes, /notes\?:\s*string \| null/, 'persisted notes DTO contract');
requireMatch(characterTypes, /type ItemType = 'weapon' \| 'armor' \| 'shield' \| 'tool'/, 'SagaDrive inventory item categories');

requireMatch(characterCreation, /label:\s*'Gebunden'/, 'canonical Gebunden essence label');
rejectMatch(characterCreation, /Paktbasiert/, 'legacy Paktbasiert essence label remains');
requireMatch(characterCreation, /SAGA_DRIVE_START_TOTAL_SKILL_POINTS = 10/, 'ten SagaDrive start skill points');
requireMatch(characterCreation, /SAGA_DRIVE_SPECIES_TRAIT_BUDGET = 3/, 'three-point species trait budget');
requireMatch(characterCreation, /key:\s*'enhanced-climbing'.*label:\s*'Erweitertes Klettern'/s, 'enhanced climbing species trait');
requireMatch(characterCreation, /key:\s*'enhanced-swimming'.*label:\s*'Erweitertes Schwimmen'/s, 'enhanced swimming species trait');
requireMatch(characterCreation, /exceptional-body[\s\S]*available:\s*false/, 'exceptional body remains unavailable');
requireMatch(characterCreation, /sagaDriveSpeciesTraitKeysByRace/, 'species-specific trait allowlists');
requireMatch(characterCreation, /key:\s*'athletics'.*label:\s*'Athletik'/s, 'SagaDrive skill definitions');
requireMatch(skillsPanel, /Mindestens.*Fertigkeiten.*Wert 1 oder höher/s, 'minimum trained skill validation');
requireMatch(abilitiesPanel, /Regelgebundene Fähigkeiten/, 'rule-bound abilities panel');
rejectMatch(abilitiesPanel, /Fähigkeit hinzufügen|setDialogOpen/, 'free-form ability creation remains');
requireMatch(inventoryPanel, /capacity = 5 \+ 2 \* strength/, 'SagaDrive carrying capacity formula');
requireMatch(inventoryPanel, /Über Traglast: Bewegung −3 m/, 'overload consequences');
rejectMatch(inventoryPanel, /capacity = 30|Freier Inventarplatz|Jeder Gegenstand belegt einen Inventarplatz/, 'legacy fixed-slot inventory remains');

requireMatch(characterService, /sagadrive_profile:/, 'SagaDrive profile persistence');
requireMatch(characterService, /normalizeSpeciesTraitInstances/, 'canonical species trait instance normalization');
requireMatch(characterService, /normalizeLegacySpeciesTraitInstances/, 'legacy species trait migration on read');
requireMatch(characterService, /legacyDetail/, 'unmapped legacy species trait detail preservation');
requireMatch(characterService, /normalizeSpeciesProfile/, 'Alien species profile normalization');
requireMatch(characterService, /notes:\s*payload\.notes\?\.trim\(\) \|\| null/, 'notes persistence');
requireMatch(characterService, /value\?\.constitution/, 'legacy constitution attribute read fallback');
requireMatch(characterService, /value\?\.intelligence/, 'legacy intelligence attribute read fallback');
requireMatch(characterService, /value\?\.wisdom/, 'legacy wisdom attribute read fallback');
requireMatch(rulesetMigration, /ADD COLUMN IF NOT EXISTS ruleset_key TEXT NOT NULL DEFAULT 'sagadrive-core'/, 'ruleset key migration');
requireMatch(rulesetMigration, /CHECK \(ruleset_key IN \('sagadrive-core', 'dnd-5\.5e'\)\)/, 'ruleset key database constraint');
requireMatch(sagaDriveProfileMigration, /ADD COLUMN IF NOT EXISTS sagadrive_profile JSONB/, 'SagaDrive profile migration');
requireMatch(sagaDriveProfileMigration, /ADD COLUMN IF NOT EXISTS notes TEXT/, 'character notes migration');

requireMatch(characterService, /supabase\.storage[\s\S]*?\.from\(CHARACTER_PORTRAIT_BUCKET\)[\s\S]*?\.upload\(filePath, file/, 'portrait upload through configured Supabase Storage client');
requireMatch(characterService, /createSignedUrl\(filePath, 31_536_000\)/, 'private portrait signed URL creation');
rejectMatch(characterService, /https:\/\/\$\{projectId\}\.supabase\.co|make-server-9f6fb44c\/characters\/upload-portrait/, 'portrait upload still uses the fixed hosted make-server endpoint');
requireMatch(portraitStorageMigration, /INSERT INTO storage\.buckets[\s\S]*?VALUES\s*\(\s*'character-portraits',\s*'character-portraits',\s*false,\s*5242880,/, 'private portrait storage bucket with 5MB limit');
requireMatch(portraitStorageMigration, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/, 'owner-scoped portrait storage policies');
requireMatch(loreService, /error\.context\.clone\(\)\.json\(\)/, 'structured Edge Function HTTP error parsing');
requireMatch(loreService, /serverMessage \?\?\s*'Hintergrundgeschichte konnte nicht generiert werden\. Bitte versuche es erneut\.'/,
  'generic lore fallback only after server message lookup');
rejectMatch(loreService, /if \(error\)[\s\S]{0,220}?Prüfe die Character-AI-Konfiguration/, 'lore HTTP errors are collapsed into a configuration message');
requireMatch(projectTypes, /status: 'active' \| 'paused' \| 'completed' \| 'archived'/, 'legacy archived project status in DTO/view-model types');
requireMatch(projectService, /value === 'active' \|\| value === 'paused' \|\| value === 'completed' \|\| value === 'archived'/, 'legacy archived project runtime validation');

console.log('Character editor regression check passed.');
