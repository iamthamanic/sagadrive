import { readFileSync } from 'node:fs';
import process from 'node:process';

function read(path) { return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'); }
function requireMatch(content, pattern, label) { if (!pattern.test(content)) { console.error(`Character editor regression check failed: missing ${label}.`); process.exit(1); } }
function rejectMatch(content, pattern, label) { if (pattern.test(content)) { console.error(`Character editor regression check failed: ${label}.`); process.exit(1); } }

const runtime = read('src/modules/characters/avatar/characterStudio/CharacterStudioRuntime.ts');
const editor = read('src/components/CharacterEditor.tsx');
const backgroundPanel = read('src/modules/characters/components/CharacterBackgroundPanel.tsx');
const backgroundCarousel = read('src/modules/characters/components/BackgroundCarousel.tsx');
const backgroundTemplates = read('src/modules/rulesets/backgroundTemplates.ts');
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
requireMatch(editor, /TabsTrigger value="info"[\s\S]*TabsTrigger value="values"[\s\S]*TabsTrigger value="appearance"[\s\S]*TabsTrigger value="inventory"[\s\S]*TabsTrigger value="statistics"/, 'SagaDrive Core editor tabs');
rejectMatch(editor, /TabsTrigger value="background"/, 'legacy dedicated Hintergrund editor tab remains');
rejectMatch(editor, /TabsTrigger value="notes"/, 'legacy Notizen editor tab remains');
requireMatch(editor, /CharacterNotesSection/, 'notes section inside Kompetenzen');
requireMatch(editor, /CharacterBackgroundPanel/, 'template-first background panel inside Kompetenzen');
requireMatch(editor, /CharacterStatisticsPanel/, 'statistics panel inside CharacterEditor');
requireMatch(editor, /savedCharacterId/, 'saved character id retained for statistics');
requireMatch(editor, /TabsTrigger value="competencies"[\s\S]*TabsTrigger value="archetype"[\s\S]*TabsTrigger value="essenz"/, 'Parameter sub-tabs for Kompetenzen, Archetyp and Essenz');
rejectMatch(editor, /TabsTrigger value="attribute"/, 'legacy Attribute-only Parameter sub-tab remains');
rejectMatch(editor, /TabsTrigger value="talente"/, 'legacy Talente Parameter sub-tab remains');
requireMatch(editor, /<SpeciesTraitsPanel/, 'species traits panel inside CharacterEditor');
requireMatch(editor, /speciesTraitCost !== SAGA_DRIVE_SPECIES_TRAIT_BUDGET/, 'exact species trait budget save validation');
requireMatch(editor, /speciesTraitInstances:\s*speciesTraitInstances\.map/, 'canonical species trait instance persistence');
requireMatch(editor, /acquiredAtLevel:\s*1/, 'species creation traits remain level-one acquisitions');
requireMatch(editor, /speciesProfile:\s*characterRace === 'alien'/, 'Alien species profile persistence');
requireMatch(editor, /GenderReadingSelect/, 'gender reading field in CharacterEditor');
requireMatch(editor, /backgroundTemplateId:\s*backgroundTemplateId \?\? null/, 'background template origin persistence');
requireMatch(editor, /isValidSagaDriveAttributeBuild/, 'SagaDrive attribute bonus build validation');
requireMatch(editor, /sagadrive_profile:\s*sagaDriveProfile/, 'SagaDrive profile save payload');
requireMatch(editor, /notes:\s*notes\.trim\(\)/, 'persistent notes save payload');
rejectMatch(editor, /starter-fireball|Feuerball/, 'free starter fireball remains in CharacterEditor');
rejectMatch(editor, /Dungeons & Dragons 5\.5e nutzt|Wähle Klasse|dnd-class/, 'active D&D creation UI remains in CharacterEditor');

requireMatch(backgroundTemplates, /id:\s*'street-doctor'/, 'Heilung & Fürsorge legacy template id');
requireMatch(backgroundTemplates, /skillPool:\s*\['medicine', 'insight', 'survival', 'awareness'\]/, 'Heilung & Fürsorge fixed four-skill pool');
rejectMatch(backgroundTemplates, /recommendedTraining/, 'legacy background training recommendation or compatibility field remains');
rejectMatch(editor, /recommendedTraining/, 'CharacterEditor still reads legacy background training recommendations');
requireMatch(editor, /setBackgroundTraining\(\['', ''\]\);/, 'neutral background training initialization in CharacterEditor');
requireMatch(backgroundTemplates, /validateSagaDriveBackgroundTemplateCatalog/, 'background template catalog validation');
requireMatch(backgroundPanel, /BackgroundCarousel/, 'background template carousel');
requireMatch(backgroundCarousel, /Eigener Hintergrund/, 'first-class custom background mode');
requireMatch(backgroundCarousel, /BACKGROUND_FRAMEWORK_ICON_BY_ID/, 'framework-specific background icons');
requireMatch(backgroundPanel, /Training · 2 wählen/, 'two background training choices');
requireMatch(backgroundPanel, /Auswahl ändern/, 'background training edit action');
requireMatch(backgroundPanel, /visibleSkillNodes/, 'collapsed two-node background training graph');
rejectMatch(backgroundPanel, />Empfohlen</, 'static Empfohlen badge remains in background training flow');
requireMatch(backgroundPanel, /Standard:/, 'standard attribute relationship inside template flow');
requireMatch(backgroundPanel, /BackgroundSkillConnector|data-background-skill-grid/, 'background skill connector graph');

requireMatch(speciesTraitsPanel, /Name deiner Spezies \*/, 'required Alien species profile name field');
requireMatch(speciesTraitsPanel, /Körperbeschreibung/, 'Alien body description field');
requireMatch(speciesTraitsPanel, /Noch nicht verfügbar/, 'unavailable species trait treatment');
requireMatch(speciesTraitsPanel, /Weitere Auswahl/, 'repeatable species trait add control');
requireMatch(speciesTraitsPanel, /jede Unteroption nur einmal/, 'repeatable species trait duplicate-option guidance');
requireMatch(speciesTraitsPanel, /Die Speziespunkte steigen nicht automatisch mit der Charakterstufe/, 'species budget does not scale with level');
requireMatch(speciesTraitsPanel, /catalog\.helpIntro/, 'field-level catalog help intro');
requireMatch(speciesTraitsPanel, /SpeciesTraitOptionItem/, 'per-option dropdown help control');
requireMatch(speciesTraitsPanel, /disabled=\{selectedByOtherInstance\.has\(option\.value\)\}/, 'duplicate option disabled in repeated instances');
requireMatch(speciesTraitsPanel, /\{trait\.cost\} P/, 'per-instance species trait cost');
rejectMatch(speciesTraitsPanel, /trait\.detailPlaceholder|onTraitDetailChange|SpeciesTraitDetailValues/, 'legacy free-text species trait detail UI remains');
rejectMatch(speciesTraitsPanel, /catalog\.options\.map\(\(option\)[\s\S]*option\.description/s, 'catalog descriptions dumped into field-level tooltip');

const speciesTraitOptionItem = read('src/modules/characters/components/SpeciesTraitOptionItem.tsx');
requireMatch(speciesTraitOptionItem, /option\.description/, 'per-option tooltip description');
requireMatch(speciesTraitOptionItem, /title=\{option\.description\}/, 'per-option native description title');
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
requireMatch(characterTypes, /backgroundTemplateId\?:\s*string \| null/, 'optional background template metadata');
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
requireMatch(skillsPanel, /Standardbeziehung – keine Voraussetzung/, 'skill-standard-attribute relationship semantics');
requireMatch(skillsPanel, /Hintergrund-Pool/, 'background pool source distinction');
requireMatch(abilitiesPanel, /Regelgebundene Fähigkeiten/, 'rule-bound abilities panel');
rejectMatch(abilitiesPanel, /Fähigkeit hinzufügen|setDialogOpen/, 'free-form ability creation remains');
requireMatch(inventoryPanel, /capacity = 5 \+ 2 \* strength/, 'SagaDrive carrying capacity formula');
requireMatch(inventoryPanel, /Über Traglast: Bewegung −3 m/, 'overload consequences');
rejectMatch(inventoryPanel, /capacity = 30|Freier Inventarplatz|Jeder Gegenstand belegt einen Inventarplatz/, 'legacy fixed-slot inventory remains');

requireMatch(characterTypes, /baseAttributes\?:\s*CharacterAttributesDto/, 'SagaDrive baseAttributes profile persistence');
requireMatch(characterTypes, /attributeAdvances\?:\s*SagaDriveAttributeAdvancesDto/, 'SagaDrive attributeAdvances profile persistence');
requireMatch(characterService, /normalizeOptionalBaseAttributes/, 'baseAttributes normalization on profile read');
requireMatch(characterService, /normalizeSagaDriveAttributeAdvances/, 'attributeAdvances normalization on profile read');
requireMatch(characterService, /assertValidSagaDriveAttributePersistence/, 'server-side SagaDrive attribute build validation');
requireMatch(characterService, /isValidSagaDriveAttributeBuild/, 'server validates attribute build with Core helper');
requireMatch(characterService, /sagadrive_profile:/, 'SagaDrive profile persistence');
requireMatch(characterService, /normalizeBackgroundTemplateId/, 'background template backward compatibility');
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

const adventureArcMigration = read('supabase/migrations/009_character_adventure_arcs.sql');
const adventureArcTypes = read('src/modules/characters/types/characterAdventureArc.types.ts');
const adventureArcService = read('src/modules/characters/services/characterAdventureArc.service.ts');
const notesSection = read('src/modules/characters/components/CharacterNotesSection.tsx');
const statisticsPanel = read('src/modules/characters/components/CharacterStatisticsPanel.tsx');

requireMatch(adventureArcMigration, /CREATE TABLE IF NOT EXISTS public\.character_adventure_arcs/, 'character adventure arcs table');
requireMatch(adventureArcMigration, /UNIQUE \(character_id, project_id\)/, 'one arc per character-project pair');
requireMatch(adventureArcMigration, /Owners insert adventure arcs for active memberships/, 'owner insert RLS requires active membership');
requireMatch(adventureArcMigration, /prevent_character_adventure_arc_retarget/, 'immutable character_id/project_id on arcs');
requireMatch(adventureArcMigration, /Owners update character adventure arcs/, 'owner update RLS on adventure arcs');
requireMatch(adventureArcTypes, /CharacterAdventureDevelopmentKind = 'level' \| 'species-trait' \| 'skill' \| 'note'/, 'development kind contract');
requireMatch(adventureArcService, /listArcsForCharacter/, 'arc sync/list service');
requireMatch(adventureArcService, /appendDevelopment/, 'append development service');
requireMatch(notesSection, /id="notes"/, 'notes textarea id preserved');
requireMatch(statisticsPanel, /Entwicklung eintragen/, 'statistics development form entry point');
requireMatch(statisticsPanel, /Speichere den Charakter zuerst/, 'unsaved character statistics guidance');

console.log('Character editor regression check passed.');