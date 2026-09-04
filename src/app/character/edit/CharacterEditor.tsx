import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Camera, CheckCircle2, CircleHelp, Eye, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AvatarCanvas } from '../../../modules/characters/avatar/AvatarCanvas';
import { createCharacterStudioAvatar, getAvatarRacePreset } from '../../../modules/characters/avatar';
import { characterService } from '../../../modules/characters/services/character.service';
import type {
  AbilityDto,
  CharacterAppearanceDto,
  CharacterAttributesDto,
  CharacterGenderReading,
  CharacterLoreContext,
  ItemDto,
  SagaDriveProfileDto,
  SagaDriveSpeciesTraitInstanceDto,
} from '../../../modules/characters';
import { AttributeD20Icon } from '../../../components/AttributeD20Icon';
import { DerivedStatCard } from '../../../components/DerivedStatCard';
import { AttributeDerivedConnector } from '../../../components/AttributeDerivedConnector';
import { IdentityPreviewPills } from '../../../components/IdentityPreviewPills';
import { CharacterAssistantButton } from '../../../components/assistant/CharacterAssistantButton';
import {
  CharacterArchetypePanel,
  CharacterBackgroundComposer,
  CharacterBackgroundPanel,
  CharacterEssencePanel,
  GenderReadingSelect,
  SpeciesCarousel,
  SpeciesTraitsPanel,
} from '../creation';
import {
  CharacterInventoryPanel,
  CharacterNotesSection,
  CharacterPresetPanel,
  CharacterSkillsPanel,
  CharacterStatisticsPanel,
  CharacterTraitEditor,
  RuleHelp,
  getInventoryLoad,
} from '../progression';
import { takeCharacterEditorBootstrap, clearCharacterEditorBootstrap } from '../shared/characterEditorBootstrap';
import { assertValidSnapshot, characterPresetService } from '../../../modules/characters/services/characterPreset.service';
import { normalizeSafeUrl } from '../../../modules/characters/avatar';
import type { CharacterPresetReleaseMode, CharacterPresetSnapshot } from '../../../modules/characters/types/characterPreset.types';
import { buildSagaDriveDerivedStatCards } from './map-derived-stat-cards';
import { getSagaDriveBackgroundTemplate } from '../../../domains/rules/sagadrive/background-templates';
import {
  SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS,
  SAGA_DRIVE_ATTRIBUTE_BONUS_CAP,
  SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET,
  SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP,
  applySagaDriveAttributeAdvances,
  canAssignSagaDriveAttributeAdvance,
  getSagaDriveAttributeAdvanceBudget,
  getSagaDriveAttributeAdvanceLevels,
  getSagaDriveAttributeBonusLevelGuide,
  getSagaDriveBaseAttributePointsUsed,
  isValidSagaDriveAttributeBuild,
  resolveSagaDriveAttributeBuildState,
  type SagaDriveAttributeAdvanceLevel,
  type SagaDriveAttributeAdvances,
} from '../../../domains/rules/sagadrive/attribute-progression';
import {
  SAGA_DRIVE_SPECIES_TRAIT_BUDGET,
  SAGA_DRIVE_START_FREE_SKILL_POINTS,
  characterRulesetOptions,
  createEmptySagaDriveSkillRanks,
  getCharacterCreationOptionLabel,
  getSagaDriveArchetype,
  getSagaDriveEssence,
  getSagaDriveSpeciesTrait,
  getSagaDriveSpeciesTraitCost,
  getSagaDriveSpeciesTraitKeysForRace,
  isCharacterRulesetKey,
  isSagaDriveArchetypeKey,
  isSagaDriveEssenceKey,
  isSagaDriveSkillKey,
  sagaDriveAttributeDefinitions,
  sagaDriveRaceOptions,
  sagaDriveSkillDefinitions,
  type CharacterRulesetKey,
  type SagaDriveArchetypeKey,
  type SagaDriveAttributeKey,
  type SagaDriveEssenceKey,
  type SagaDriveSkillKey,
} from '../../../domains/rules/sagadrive/character-creation';
import {
  SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS,
  backgroundSkillPointsToTrainedSkills,
  getSagaDriveExperienceBonus,
  getSagaDriveSkillCap,
  isValidBackgroundSkillPoints,
  isValidSagaDriveSkillDevelopment,
  isValidStartSkillBuild,
  normalizeFreeSkillRanks,
  resolveSagaDriveSkillBuildState,
  resolveSagaDriveSkillRanksSafe,
  sumBackgroundSkillPointsUsed,
  type SagaDriveBackgroundSkillPoints,
  type SagaDriveSkillAdvanceDto,
  type SagaDriveSpecializationRecordDto,
} from '../../../modules/rulesets/skillProgression';
import { getSagaDriveSpeciesTraitOptionCatalog } from '../../../domains/rules/sagadrive/species-trait-options';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';
import { Separator } from '../../../components/ui/separator';
import { Slider } from '../../../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

type ActivityTrackingWindow = Window & { trackActivity?: (description: string) => void };
type EditorTab = 'info' | 'values' | 'appearance' | 'inventory' | 'settings';
type ValuesSubTab = 'attributes' | 'background' | 'details' | 'archetype' | 'essenz';
type SettingsSubTab = 'statistics' | 'preset';
type ValidationProblem = { tab: EditorTab; message: string; valuesSubTab?: ValuesSubTab };
type SkillSlot = SagaDriveSkillKey | '';
type BackgroundSkillPool = [SkillSlot, SkillSlot, SkillSlot, SkillSlot];
const INITIAL_ATTRIBUTES: CharacterAttributesDto = { strength: 4, dexterity: 3, endurance: 3, mind: 2, perception: 2, charisma: 1 };

const trackActivity = (description: string) => {
  if (typeof window === 'undefined') return;
  (window as ActivityTrackingWindow).trackActivity?.(description);
};

function isEditorTab(value: string): value is EditorTab {
  return value === 'info' || value === 'values' || value === 'appearance' || value === 'inventory' || value === 'settings';
}

function isValuesSubTab(value: string): value is ValuesSubTab {
  return value === 'attributes' || value === 'background' || value === 'details' || value === 'archetype' || value === 'essenz';
}

function isSettingsSubTab(value: string): value is SettingsSubTab {
  return value === 'statistics' || value === 'preset';
}

function padBackgroundSkills(skills: readonly SagaDriveSkillKey[], size: 4): BackgroundSkillPool {
  const slots: SkillSlot[] = [...skills.slice(0, size)];
  while (slots.length < size) slots.push('');
  return slots as BackgroundSkillPool;
}

function syncBackgroundSpecialization(
  specializations: readonly SagaDriveSpecializationRecordDto[],
  skill: SkillSlot,
  name: string,
): SagaDriveSpecializationRecordDto[] {
  const withoutBackground = specializations.filter((entry) => entry.source !== 'background');
  if (!isSagaDriveSkillKey(skill) || !name.trim()) return withoutBackground;
  return [...withoutBackground, { skill, name: name.trim(), source: 'background', acquiredAtLevel: 1 }];
}

function parseStartAttribute(value: string): 0 | 1 | 2 | 3 | 4 {
  const parsed = Number.parseInt(value, 10);
  if (parsed <= 0) return 0;
  if (parsed >= 4) return 4;
  if (parsed === 1 || parsed === 2 || parsed === 3) return parsed;
  return 0;
}

function uniqueSkills(values: readonly SkillSlot[]): SagaDriveSkillKey[] { return Array.from(new Set(values.filter(isSagaDriveSkillKey))); }

/** Label -> data-derived-card Selector für den Bracket-Tree. */
const DERIVED_SELECTOR_BY_LABEL: Record<string, string> = {
  Gesundheit: 'health', Verteidigung: 'defense', Initiative: 'initiative', Körperwiderstand: 'body-resistance',
  Reflexwiderstand: 'reflex-resistance', Geistwiderstand: 'mind-resistance', Manöverwiderstand: 'maneuver-resistance',
  Bewegung: 'movement', Erholung: 'recovery', Traglast: 'carry-capacity',
};

/**
 * Tooltip-Text für Attribut-Dropdown-Optionen, die über die Standard-Abgeleiteten hinaus
 * Manöverwiderstand an dieses Attribut hängen (max(STÄ+Athletik, GES+Akrobatik)).
 * null = keine Zusatzwirkung bei diesem Wert.
 */
function getAttributeOptionExtraDerivedHint(
  attribute: SagaDriveAttributeKey,
  optionValue: number,
  attributes: CharacterAttributesDto,
  athleticsRank: number,
  acrobaticsRank: number,
): string | null {
  if (attribute === 'strength') {
    const wins = optionValue + athleticsRank >= attributes.dexterity + acrobaticsRank;
    return wins
      ? 'Zusätzlich Manöverwiderstand: Bei diesem Wert gewinnt STÄ+Athletik gegen GES+Akrobatik.'
      : null;
  }
  if (attribute === 'dexterity') {
    const wins = attributes.strength + athleticsRank < optionValue + acrobaticsRank;
    return wins
      ? 'Zusätzlich Manöverwiderstand: Bei diesem Wert gewinnt GES+Akrobatik gegen STÄ+Athletik.'
      : null;
  }
  return null;
}

function areSpeciesTraitInstancesValid(
  instances: readonly SagaDriveSpeciesTraitInstanceDto[],
  allowedTraitKeys: ReadonlySet<string>,
): boolean {
  const nonRepeatableTraits = new Set<string>();
  const repeatableOptions = new Set<string>();

  for (const instance of instances) {
    const trait = getSagaDriveSpeciesTrait(instance.trait);
    if (!allowedTraitKeys.has(instance.trait) || trait.available === false) return false;

    const catalog = getSagaDriveSpeciesTraitOptionCatalog(instance.trait);
    if (!catalog) {
      if (nonRepeatableTraits.has(instance.trait)) return false;
      nonRepeatableTraits.add(instance.trait);
      continue;
    }

    if (!instance.option || !catalog.options.some((option) => option.value === instance.option)) return false;
    const optionIdentity = `${instance.trait}:${instance.option}`;
    if (repeatableOptions.has(optionIdentity)) return false;
    repeatableOptions.add(optionIdentity);
  }

  return true;
}

function retainSpeciesTraitInstancesForRace(
  instances: readonly SagaDriveSpeciesTraitInstanceDto[],
  allowedTraitKeys: ReadonlySet<string>,
): SagaDriveSpeciesTraitInstanceDto[] {
  const retained: SagaDriveSpeciesTraitInstanceDto[] = [];
  let usedPoints = 0;

  for (const instance of instances) {
    const trait = getSagaDriveSpeciesTrait(instance.trait);
    if (!allowedTraitKeys.has(instance.trait) || trait.available === false) continue;
    if (usedPoints + trait.cost > SAGA_DRIVE_SPECIES_TRAIT_BUDGET) continue;
    retained.push(instance);
    usedPoints += trait.cost;
  }

  return retained;
}

export function CharacterEditor() {
  const [activeTab, setActiveTab] = useState<EditorTab>('info');
  const [activeValuesSubTab, setActiveValuesSubTab] = useState<ValuesSubTab>('archetype');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<SettingsSubTab>('statistics');
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [savedCharacterId, setSavedCharacterId] = useState<string | null>(null);
  const [persistedLevel, setPersistedLevel] = useState<number | null>(null);
  const [characterLevel, setCharacterLevel] = useState(1);
  const [ruleset, setRuleset] = useState<CharacterRulesetKey>('sagadrive-core');
  const [characterName, setCharacterName] = useState('');
  const [description, setDescription] = useState('');
  const [characterArchetype, setCharacterArchetype] = useState<SagaDriveArchetypeKey | undefined>();
  const [characterRace, setCharacterRace] = useState('human');
  const [genderReading, setGenderReading] = useState<CharacterGenderReading | undefined>();
  const [essenceProfile, setEssenceProfile] = useState<SagaDriveEssenceKey | undefined>();
  const [speciesTraitInstances, setSpeciesTraitInstances] = useState<SagaDriveSpeciesTraitInstanceDto[]>([]);
  const [speciesProfileName, setSpeciesProfileName] = useState('');
  const [speciesBodyDescription, setSpeciesBodyDescription] = useState('');
  const [presetReleaseMode, setPresetReleaseMode] = useState<CharacterPresetReleaseMode>('manual');

  const initialPreset = getAvatarRacePreset('human');
  const [bodySize, setBodySize] = useState([initialPreset.bodySize]);
  const [height, setHeight] = useState([initialPreset.height]);
  const [headStyle, setHeadStyle] = useState(initialPreset.head);
  const [ears, setEars] = useState(initialPreset.ears);
  const [hairStyle, setHairStyle] = useState(initialPreset.hair);
  const [hairColor, setHairColor] = useState(initialPreset.hairColor);
  const [skinTone, setSkinTone] = useState(initialPreset.skinTone);
  const [clothing, setClothing] = useState(initialPreset.clothing);
  const [accessory, setAccessory] = useState(initialPreset.accessory ?? 'none');

  const [baseAttributes, setBaseAttributes] = useState<CharacterAttributesDto>(INITIAL_ATTRIBUTES);
  const [attributeAdvances, setAttributeAdvances] = useState<SagaDriveAttributeAdvances>({});
  const [freeSkillRanks, setFreeSkillRanks] = useState(createEmptySagaDriveSkillRanks);
  const [archetypeTrainingSkill, setArchetypeTrainingSkill] = useState<SagaDriveSkillKey | undefined>();
  const [backgroundTemplateId, setBackgroundTemplateId] = useState<string | null | undefined>(undefined);
  const [backgroundName, setBackgroundName] = useState('');
  const [backgroundSkillPool, setBackgroundSkillPool] = useState<BackgroundSkillPool>(['', '', '', '']);
  const [backgroundSkillPoints, setBackgroundSkillPoints] = useState<SagaDriveBackgroundSkillPoints>({});
  const [skillAdvances, setSkillAdvances] = useState<SagaDriveSkillAdvanceDto[]>([]);
  const [specializations, setSpecializations] = useState<SagaDriveSpecializationRecordDto[]>([]);
  const [specializationSkill, setSpecializationSkill] = useState<SkillSlot>('');
  const [specializationName, setSpecializationName] = useState('');
  const [milieuAccess, setMilieuAccess] = useState('');
  const [contact, setContact] = useState('');
  const [complication, setComplication] = useState('');
  const [communication, setCommunication] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<SagaDriveSkillKey | undefined>();
  const [inventory, setInventory] = useState<ItemDto[]>([]);
  const [backgroundStory, setBackgroundStory] = useState('');
  const [personalityTraits, setPersonalityTraits] = useState<string[]>([]);
  const [ideals, setIdeals] = useState<string[]>([]);
  const [bonds, setBonds] = useState<string[]>([]);
  const [flaws, setFlaws] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [portraitUrl, setPortraitUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarCanvasRef = useRef<HTMLCanvasElement>(null);
  const bootstrapAppliedRef = useRef(false);

  const currentAvatar = useMemo(() => createCharacterStudioAvatar({
    race: characterRace, head: headStyle, ears, hairStyle, clothing, accessory: accessory === 'none' ? undefined : accessory,
    hairColor, skinTone, bodySize: bodySize[0] ?? 50, height: height[0] ?? 50,
  }), [accessory, bodySize, characterRace, clothing, ears, hairColor, hairStyle, headStyle, height, skinTone]);

  const archetype = characterArchetype ? getSagaDriveArchetype(characterArchetype) : undefined;
  const essence = essenceProfile ? getSagaDriveEssence(essenceProfile) : undefined;
  const baseSpeciesLabel = getCharacterCreationOptionLabel(sagaDriveRaceOptions, characterRace);
  const speciesDisplayName = characterRace === 'alien' && speciesProfileName.trim() ? speciesProfileName.trim() : baseSpeciesLabel;
  const selectedBackgroundPool = useMemo(() => uniqueSkills(backgroundSkillPool), [backgroundSkillPool]);
  const backgroundPointsUsed = useMemo(() => sumBackgroundSkillPointsUsed(backgroundSkillPoints), [backgroundSkillPoints]);
  const attributes = useMemo(
    () => applySagaDriveAttributeAdvances(baseAttributes, attributeAdvances, characterLevel),
    [attributeAdvances, baseAttributes, characterLevel],
  );
  const skillBuild = useMemo(() => ({
    freeSkillRanks,
    backgroundSkillPoints,
    archetypeTrainingSkill,
    skillAdvances,
    specializations,
  }), [archetypeTrainingSkill, backgroundSkillPoints, freeSkillRanks, skillAdvances, specializations]);
  const finalSkillRanks = useMemo(
    () => resolveSagaDriveSkillRanksSafe(skillBuild, characterLevel),
    [characterLevel, skillBuild],
  );

  const abilities = useMemo<AbilityDto[]>(() => {
    if (!archetype) return [];
    return [{ id: `sagadrive-core-${archetype.value}`, name: archetype.coreAbility.name, description: archetype.coreAbility.description, type: archetype.value === 'fighter' ? 'combat' : 'skill', cost: 0, effect: archetype.coreAbility.effect, source: archetype.label, rank: archetype.coreAbility.rank, action_type: archetype.coreAbility.actionType }];
  }, [archetype]);

  const freeSkillPointsUsed = useMemo(() => sagaDriveSkillDefinitions.reduce((sum, skill) => sum + freeSkillRanks[skill.key], 0), [freeSkillRanks]);
  const skillCap = getSagaDriveSkillCap(characterLevel);
  const skillOverflow = useMemo(() => sagaDriveSkillDefinitions.some((skill) => finalSkillRanks[skill.key] > skillCap), [finalSkillRanks, skillCap]);
  const attributeAdvanceLevels = getSagaDriveAttributeAdvanceLevels(characterLevel);
  const attributeAdvanceBudget = getSagaDriveAttributeAdvanceBudget(characterLevel);
  const attributeAdvancesUsed = attributeAdvanceLevels.filter((advanceLevel) => Boolean(attributeAdvances[advanceLevel])).length;
  const attributePointsUsed = getSagaDriveBaseAttributePointsUsed(baseAttributes);
  const attributeDistributionValid = isValidSagaDriveAttributeBuild(baseAttributes, attributeAdvances, characterLevel);
  const speciesTraitCost = getSagaDriveSpeciesTraitCost(speciesTraitInstances.map((instance) => instance.trait));
  const allowedSpeciesTraitKeys = useMemo(() => new Set(getSagaDriveSpeciesTraitKeysForRace(characterRace)), [characterRace]);
  const speciesTraitInstancesValid = areSpeciesTraitInstancesValid(speciesTraitInstances, allowedSpeciesTraitKeys);
  const speciesTraitsComplete = speciesTraitCost === SAGA_DRIVE_SPECIES_TRAIT_BUDGET
    && speciesTraitInstancesValid
    && (characterRace !== 'alien' || Boolean(speciesProfileName.trim()));
  const inventoryLoad = getInventoryLoad(inventory);
  const carryCapacity = 5 + 2 * attributes.strength;
  const overloaded = inventoryLoad > carryCapacity;
  const movement = overloaded ? 6 : 9;
  const experienceBonus = getSagaDriveExperienceBonus(characterLevel);
  const health = 12 + 2 * attributes.endurance + 2 * experienceBonus;
  const defense = 10 + attributes.dexterity + experienceBonus + Math.max(finalSkillRanks.melee, finalSkillRanks.acrobatics);
  const recovery = attributes.endurance + experienceBonus;
  const derivedStatCards = useMemo(
    () => buildSagaDriveDerivedStatCards({ attributes, finalSkillRanks, experienceBonus, level: characterLevel, overloaded }),
    [attributes, characterLevel, experienceBonus, finalSkillRanks, overloaded],
  );

  const backgroundComplete = backgroundTemplateId !== undefined
    && Boolean(backgroundName.trim())
    && selectedBackgroundPool.length === 4
    && isValidBackgroundSkillPoints(backgroundSkillPoints, selectedBackgroundPool)
    && isSagaDriveSkillKey(specializationSkill)
    && (backgroundSkillPoints[specializationSkill] ?? 0) > 0
    && Boolean(specializationName.trim())
    && Boolean(milieuAccess.trim())
    && Boolean(contact.trim())
    && Boolean(complication.trim())
    && Boolean(communication.trim());
  const genderReadingComplete = Boolean(genderReading);
  const startSkillBuild = useMemo(() => ({
    freeSkillRanks,
    backgroundSkillPoints,
    archetypeTrainingSkill,
  }), [archetypeTrainingSkill, backgroundSkillPoints, freeSkillRanks]);
  const skillsComplete = Boolean(archetypeTrainingSkill)
    && freeSkillPointsUsed === SAGA_DRIVE_START_FREE_SKILL_POINTS
    && backgroundPointsUsed === SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS
    && isValidStartSkillBuild(startSkillBuild, selectedBackgroundPool, characterArchetype)
    && isValidSagaDriveSkillDevelopment(startSkillBuild, skillAdvances, specializations, characterLevel)
    && !skillOverflow;
  const archetypeComplete = Boolean(characterArchetype && archetypeTrainingSkill);
  const essenzComplete = Boolean(essenceProfile);
  const attributesComplete = attributeDistributionValid && skillsComplete;
  const detailsComplete = Boolean(notes.trim())
    || personalityTraits.length > 0
    || ideals.length > 0
    || bonds.length > 0
    || flaws.length > 0;
  const valuesSubTabComplete: Record<ValuesSubTab, boolean> = {
    archetype: archetypeComplete,
    essenz: essenzComplete,
    attributes: attributesComplete,
    background: backgroundComplete,
    details: detailsComplete,
  };

  const collectValidationProblems = (): ValidationProblem[] => {
    const problems: ValidationProblem[] = [];
    if (!characterName.trim()) problems.push({ tab: 'info', message: 'Bitte gib deinem Charakter einen Namen.' });
    if (ruleset === 'dnd-5.5e') problems.push({ tab: 'info', message: 'D&D 5.5e ist in diesem Editor noch nicht verfügbar. Wähle SagaDrive Core.' });
    if (!genderReadingComplete) problems.push({ tab: 'info', message: 'Bitte wähle, wie dein Charakter gelesen wird (männlich, weiblich oder divers).' });
    if (speciesTraitCost !== SAGA_DRIVE_SPECIES_TRAIT_BUDGET) problems.push({ tab: 'info', message: `Wähle Speziesmerkmale im Wert von genau ${SAGA_DRIVE_SPECIES_TRAIT_BUDGET} Punkten.` });
    if (characterRace === 'alien' && !speciesProfileName.trim()) problems.push({ tab: 'info', message: 'Gib deinem Alien-Speziesprofil einen Namen.' });
    if (!speciesTraitInstancesValid) problems.push({ tab: 'info', message: 'Vervollständige alle Speziesmerkmale und verwende jede Unteroption höchstens einmal.' });
    if (!backgroundComplete) problems.push({ tab: 'values', valuesSubTab: 'background', message: 'Vervollständige deinen mechanischen Hintergrund unter Hintergrund.' });
    if (!attributeDistributionValid) problems.push({ tab: 'values', valuesSubTab: 'attributes', message: `Verteile genau ${SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET} Basis-Bonuspunkte (+0 bis +4) und alle für Level ${characterLevel} verfügbaren Attributsteigerungen, ohne einen Endwert über +${SAGA_DRIVE_ATTRIBUTE_BONUS_CAP} zu erzeugen.` });
    if (!characterArchetype) problems.push({ tab: 'values', valuesSubTab: 'archetype', message: 'Bitte wähle einen Archetyp.' });
    if (!skillsComplete) problems.push({ tab: 'values', valuesSubTab: 'attributes', message: 'Vervollständige die drei Startquellen (7 frei, 2 Hintergrund, 1 Archetyp) und alle Fertigkeitsentwicklungen bis zu deinem Level. Pro Entwicklungsstufe ist genau eine Entscheidung erlaubt; Spezialisierungen brauchen ihren Mindestrang (1/3/5) bereits zum Erwerbszeitpunkt.' });
    if (!essenceProfile) problems.push({ tab: 'values', valuesSubTab: 'essenz', message: 'Bitte wähle eine primäre Essenz.' });
    return problems;
  };

  const buildPresetSnapshot = (): CharacterPresetSnapshot => {
    const sagaDriveProfile: SagaDriveProfileDto = {
      archetype: characterArchetype,
      essence: essenceProfile,
      speciesTraitInstances: speciesTraitInstances.map((instance) => ({
        trait: instance.trait,
        ...(instance.option ? { option: instance.option } : {}),
        source: 'species-creation',
        acquiredAtLevel: 1,
      })),
      speciesProfile: characterRace === 'alien' ? { name: speciesProfileName.trim(), bodyDescription: speciesBodyDescription.trim() } : undefined,
      backgroundTemplateId: backgroundTemplateId ?? null,
      background: {
        name: backgroundName.trim(),
        skillPool: selectedBackgroundPool,
        trainedSkills: backgroundSkillPointsToTrainedSkills(backgroundSkillPoints),
        backgroundSkillPoints,
        specialization: isSagaDriveSkillKey(specializationSkill)
          ? { skill: specializationSkill, name: specializationName.trim(), source: 'background', acquiredAtLevel: 1 }
          : undefined,
        milieuAccess: milieuAccess.trim(),
        contact: contact.trim(),
        complication: complication.trim(),
        communication: communication.trim(),
      },
      archetypeTrainingSkill,
      freeSkillRanks,
      skillAdvances: skillAdvances.length > 0 ? skillAdvances : undefined,
      specializations: specializations.length > 0 ? specializations : undefined,
      baseAttributes,
      attributeAdvances,
      presetReleaseMode,
      drive: 3,
      momentum: 0,
    };
    return {
      schemaVersion: 1,
      name: characterName.trim(),
      description: description.trim(),
      class: characterArchetype ?? '',
      race: characterRace,
      ruleset_key: ruleset,
      level: characterLevel,
      background_story: backgroundStory.trim() || undefined,
      notes: notes.trim(),
      personality_traits: personalityTraits.length > 0 ? personalityTraits : undefined,
      ideals: ideals.length > 0 ? ideals : undefined,
      bonds: bonds.length > 0 ? bonds : undefined,
      flaws: flaws.length > 0 ? flaws : undefined,
      appearance: {
        body_size: currentAvatar.body.size,
        height: currentAvatar.body.height,
        face_features: currentAvatar.traits.head ?? headStyle,
        hair_style: currentAvatar.traits.hair ?? hairStyle,
        hair_color: currentAvatar.colors.hair,
        skin_tone: currentAvatar.colors.skin,
        clothing: currentAvatar.traits.clothing ?? clothing,
        gender_reading: genderReading,
        avatar: currentAvatar,
      },
      attributes,
      skills: finalSkillRanks,
      sagadrive_profile: sagaDriveProfile,
      abilities,
      inventory,
      portrait_url: portraitUrl || undefined,
    };
  };

  const hydrateEditorFromPersistedCharacter = (payload: {
    savedCharacterId: string | null;
    persistedLevel: number | null;
    name: string;
    description: string;
    rulesetKey: string;
    level: number;
    race: string;
    attributes: CharacterAttributesDto;
    skills: Record<SagaDriveSkillKey, number>;
    profile: SagaDriveProfileDto;
    appearance: CharacterAppearanceDto;
    inventory?: ItemDto[];
    backgroundStory?: string;
    notes?: string;
    personalityTraits?: string[];
    ideals?: string[];
    bonds?: string[];
    flaws?: string[];
    portraitUrl?: string;
    successMessage: string;
  }) => {
    const { profile, appearance } = payload;
    const resolved = resolveSagaDriveAttributeBuildState(payload.attributes, profile);
    const hydratedFreeSkillRanks = normalizeFreeSkillRanks(profile.freeSkillRanks);

    setCharacterName(payload.name);
    setDescription(payload.description);
    setRuleset(payload.rulesetKey === 'dnd-5.5e' ? 'dnd-5.5e' : 'sagadrive-core');
    setCharacterLevel(payload.level);
    setCharacterRace(payload.race);
    setCharacterArchetype(profile.archetype && isSagaDriveArchetypeKey(profile.archetype) ? profile.archetype : undefined);
    setEssenceProfile(profile.essence && isSagaDriveEssenceKey(profile.essence) ? profile.essence : undefined);
    setGenderReading(appearance.gender_reading);
    setSpeciesTraitInstances(profile.speciesTraitInstances ?? []);
    setSpeciesProfileName(profile.speciesProfile?.name ?? '');
    setSpeciesBodyDescription(profile.speciesProfile?.bodyDescription ?? '');
    setBaseAttributes(resolved.baseAttributes);
    setAttributeAdvances(resolved.attributeAdvances);
    setFreeSkillRanks(hydratedFreeSkillRanks);
    setArchetypeTrainingSkill(profile.archetypeTrainingSkill && isSagaDriveSkillKey(profile.archetypeTrainingSkill) ? profile.archetypeTrainingSkill : undefined);
    setBackgroundTemplateId(profile.backgroundTemplateId === undefined ? undefined : profile.backgroundTemplateId);
    setBackgroundName(profile.background?.name ?? '');
    setBackgroundSkillPool(padBackgroundSkills(profile.background?.skillPool ?? [], 4));
    const resolvedSkills = resolveSagaDriveSkillBuildState({
      freeSkillRanks: hydratedFreeSkillRanks,
      backgroundSkillPoints: profile.background?.backgroundSkillPoints,
      skillPool: profile.background?.skillPool,
      archetypeTrainingSkill: profile.archetypeTrainingSkill && isSagaDriveSkillKey(profile.archetypeTrainingSkill) ? profile.archetypeTrainingSkill : undefined,
      skillAdvances: profile.skillAdvances,
      specializations: profile.specializations,
      backgroundSpecialization: profile.background?.specialization && isSagaDriveSkillKey(profile.background.specialization.skill)
        ? profile.background.specialization
        : undefined,
    });
    setBackgroundSkillPoints(resolvedSkills.backgroundSkillPoints);
    setSkillAdvances(resolvedSkills.skillAdvances ?? []);
    setSpecializations(resolvedSkills.specializations ?? []);
    const backgroundSpec = resolvedSkills.specializations?.find((entry) => entry.source === 'background');
    setSpecializationSkill(backgroundSpec?.skill ?? (profile.background?.specialization?.skill && isSagaDriveSkillKey(profile.background.specialization.skill) ? profile.background.specialization.skill : ''));
    setSpecializationName(backgroundSpec?.name ?? profile.background?.specialization?.name ?? '');
    setMilieuAccess(profile.background?.milieuAccess ?? '');
    setContact(profile.background?.contact ?? '');
    setComplication(profile.background?.complication ?? '');
    setCommunication(profile.background?.communication ?? '');
    setInventory(payload.inventory ?? []);
    setBackgroundStory(payload.backgroundStory ?? '');
    setPersonalityTraits(payload.personalityTraits ?? []);
    setIdeals(payload.ideals ?? []);
    setBonds(payload.bonds ?? []);
    setFlaws(payload.flaws ?? []);
    setNotes(payload.notes ?? '');
    setPortraitUrl(payload.portraitUrl ? (normalizeSafeUrl(payload.portraitUrl) ?? '') : '');
    setPresetReleaseMode(profile.presetReleaseMode === 'auto' ? 'auto' : 'manual');
    setBodySize([appearance.body_size ?? 50]);
    setHeight([appearance.height ?? 50]);
    setHeadStyle(appearance.face_features || appearance.avatar?.traits.head || 'human-balanced');
    setEars(appearance.avatar?.traits.ears || 'round');
    setHairStyle(appearance.hair_style || appearance.avatar?.traits.hair || 'short');
    setHairColor(appearance.hair_color || appearance.avatar?.colors.hair || '#3f2a1d');
    setSkinTone(appearance.skin_tone || appearance.avatar?.colors.skin || '#c58c6a');
    setClothing(appearance.clothing || appearance.avatar?.traits.clothing || 'casual');
    setAccessory(appearance.avatar?.traits.accessory ?? 'none');
    setSavedCharacterId(payload.savedCharacterId);
    setPersistedLevel(payload.persistedLevel);
    clearCharacterEditorBootstrap();
    toast.success(payload.successMessage);
  };

  useEffect(() => {
    if (bootstrapAppliedRef.current) return;

    const bootstrap = takeCharacterEditorBootstrap();
    const storedEditId = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('sagadrive:character-edit-id')
      : null;
    if (storedEditId) sessionStorage.removeItem('sagadrive:character-edit-id');
    const editCharacterId = bootstrap?.kind === 'character-edit'
      ? bootstrap.characterId
      : storedEditId;

    if (bootstrap?.kind === 'preset-snapshot') {
      bootstrapAppliedRef.current = true;
      const { snapshot } = bootstrap;
      try {
        assertValidSnapshot(snapshot);
      } catch (error) {
        console.error('Preset bootstrap rejected:', error instanceof Error ? error.message : error);
        toast.error(error instanceof Error ? error.message : 'Preset konnte nicht geladen werden.');
        return;
      }
      hydrateEditorFromPersistedCharacter({
        savedCharacterId: null,
        persistedLevel: null,
        name: bootstrap.characterName || snapshot.name,
        description: snapshot.description ?? '',
        rulesetKey: snapshot.ruleset_key,
        level: snapshot.level,
        race: snapshot.race,
        attributes: snapshot.attributes,
        skills: snapshot.skills,
        profile: snapshot.sagadrive_profile,
        appearance: snapshot.appearance,
        inventory: snapshot.inventory,
        backgroundStory: snapshot.background_story,
        notes: snapshot.notes,
        personalityTraits: snapshot.personality_traits,
        ideals: snapshot.ideals,
        bonds: snapshot.bonds,
        flaws: snapshot.flaws,
        portraitUrl: snapshot.portrait_url,
        successMessage: 'Preset geladen — neuer Charakter im Editor.',
      });
      return;
    }

    if (!editCharacterId) return;
    bootstrapAppliedRef.current = true;

    void (async () => {
      try {
        const character = await characterService.getCharacterById(editCharacterId);
        hydrateEditorFromPersistedCharacter({
          savedCharacterId: character.id,
          persistedLevel: character.level,
          name: character.name,
          description: character.description,
          rulesetKey: character.rulesetKey,
          level: character.level,
          race: character.race,
          attributes: character.attributes,
          skills: character.skills,
          profile: character.sagaDriveProfile,
          appearance: character.appearance,
          inventory: character.inventory,
          backgroundStory: character.backgroundStory,
          notes: character.notes,
          personalityTraits: character.personalityTraits,
          ideals: character.ideals,
          bonds: character.bonds,
          flaws: character.flaws,
          portraitUrl: character.portraitUrl,
          successMessage: `Charakter „${character.name}“ geladen.`,
        });
      } catch (error) {
        console.error('Character edit bootstrap failed:', error);
        clearCharacterEditorBootstrap();
        toast.error(error instanceof Error ? error.message : 'Charakter konnte nicht geladen werden.');
      }
    })();
  }, []);

  const loreContext = useMemo<CharacterLoreContext>(() => ({
    ruleset,
    name: characterName.trim(),
    description: [description.trim(), backgroundName.trim() ? `Hintergrund: ${backgroundName.trim()}` : ''].filter(Boolean).join('\n'),
    characterClass: archetype?.label ?? '',
    raceOrSpecies: speciesDisplayName,
    essenceProfile: essence?.label,
    level: characterLevel,
    attributes: { strength: attributes.strength, dexterity: attributes.dexterity, constitution: attributes.endurance, intelligence: attributes.mind, wisdom: attributes.perception, charisma: attributes.charisma },
    abilities: abilities.map((ability) => ({ name: ability.name, description: ability.description, type: ability.type, cost: ability.cost, effect: ability.effect })),
    inventory: inventory.map((item) => ({ name: item.name, description: item.description, type: item.type === 'shield' || item.type === 'tool' ? 'misc' : item.type, quantity: item.quantity })),
    appearance: { bodySize: currentAvatar.body.size, height: currentAvatar.body.height, face: currentAvatar.traits.head ?? headStyle, hairStyle: currentAvatar.traits.hair ?? hairStyle, hairColor: currentAvatar.colors.hair, skinTone: currentAvatar.colors.skin, clothing: currentAvatar.traits.clothing ?? clothing, accessory: currentAvatar.traits.accessory },
    traits: { personality: personalityTraits, ideals, bonds, flaws },
  }), [abilities, archetype, attributes, backgroundName, bonds, characterLevel, characterName, clothing, currentAvatar, description, essence, flaws, hairStyle, ideals, inventory, personalityTraits, ruleset, speciesDisplayName]);

  const rulesetLabel = getCharacterCreationOptionLabel(characterRulesetOptions, ruleset);

  const applyRacePreset = (race: string, resetTraits = false) => {
    const preset = getAvatarRacePreset(race);
    const allowed = new Set(getSagaDriveSpeciesTraitKeysForRace(race));
    const retainedInstances = resetTraits ? [] : retainSpeciesTraitInstancesForRace(speciesTraitInstances, allowed);
    setSpeciesTraitInstances(retainedInstances);
    setCharacterRace(race); setBodySize([preset.bodySize]); setHeight([preset.height]); setHeadStyle(preset.head); setEars(preset.ears); setHairStyle(preset.hair); setHairColor(preset.hairColor); setSkinTone(preset.skinTone); setClothing(preset.clothing); setAccessory(preset.accessory ?? 'none');
  };

  const resetBackgroundMechanics = () => {
    setBackgroundName('');
    setBackgroundSkillPool(['', '', '', '']);
    setBackgroundSkillPoints({});
    setSpecializationSkill('');
    setSpecializationName('');
    setSpecializations((current) => current.filter((entry) => entry.source !== 'background'));
  };

  const handleRulesetChange = (value: string) => {
    if (!isCharacterRulesetKey(value) || value === ruleset) return;
    setRuleset(value);
    setCharacterArchetype(undefined);
    setEssenceProfile(undefined);
    setArchetypeTrainingSkill(undefined);
    setFreeSkillRanks(createEmptySagaDriveSkillRanks());
    setSkillAdvances([]);
    setSpecializations([]);
    setBackgroundTemplateId(undefined);
    resetBackgroundMechanics();
    setMilieuAccess('');
    setContact('');
    setComplication('');
    setCommunication('');
    setSpeciesTraitInstances([]);
    setSpeciesProfileName('');
    setSpeciesBodyDescription('');
    setBaseAttributes(INITIAL_ATTRIBUTES);
    setAttributeAdvances({});
    applyRacePreset('human', true);
    if (value === 'dnd-5.5e') toast.info('D&D 5.5e: Der vollständige Erstellungsflow folgt demnächst in diesem Editor.');
  };

  const handleArchetypeChange = (value: string) => {
    if (!isSagaDriveArchetypeKey(value)) return;
    const next = getSagaDriveArchetype(value);
    setCharacterArchetype(value);
    if (archetypeTrainingSkill && !next?.skills.includes(archetypeTrainingSkill)) setArchetypeTrainingSkill(undefined);
  };

  const handleEssenceChange = (value: string) => { if (isSagaDriveEssenceKey(value)) setEssenceProfile(value); };

  const applyBackgroundSpecialization = (skill: SkillSlot, name: string) => {
    setSpecializationSkill(skill);
    setSpecializationName(name);
    setSpecializations((current) => syncBackgroundSpecialization(current, skill, name));
  };

  const handleBackgroundTemplateSelect = (templateId: string | null) => {
    setBackgroundTemplateId(templateId);
    setSelectedSkill(undefined);
    if (templateId === null) {
      resetBackgroundMechanics();
      return;
    }
    const template = getSagaDriveBackgroundTemplate(templateId);
    if (!template) {
      setBackgroundTemplateId(null);
      resetBackgroundMechanics();
      return;
    }
    setBackgroundName(template.name);
    setBackgroundSkillPool([template.skillPool[0], template.skillPool[1], template.skillPool[2], template.skillPool[3]]);
    setBackgroundSkillPoints({});
    setSpecializationSkill('');
    setSpecializationName('');
    setSpecializations((current) => current.filter((entry) => entry.source !== 'background'));
  };

  const handleBackgroundSkillPointsChange = (points: SagaDriveBackgroundSkillPoints) => {
    setBackgroundSkillPoints(points);
    if (isSagaDriveSkillKey(specializationSkill) && (points[specializationSkill] ?? 0) <= 0) {
      setSpecializationSkill('');
      setSpecializationName('');
      setSpecializations((current) => current.filter((entry) => entry.source !== 'background'));
    }
  };

  const updateBackgroundPool = (index: number, value: string) => {
    if (!isSagaDriveSkillKey(value) || index < 0 || index > 3) return;
    const previous = backgroundSkillPool[index];
    const next: BackgroundSkillPool = [backgroundSkillPool[0], backgroundSkillPool[1], backgroundSkillPool[2], backgroundSkillPool[3]];
    next[index] = value;
    setBackgroundSkillPool(next);
    if (previous && previous !== value) {
      setBackgroundSkillPoints((current) => {
        const nextPoints = { ...current };
        if (nextPoints[previous]) delete nextPoints[previous];
        if (!next.includes(previous)) {
          if (specializationSkill === previous) {
            setSpecializationSkill('');
            setSpecializationName('');
            setSpecializations((specs) => specs.filter((entry) => entry.source !== 'background'));
          }
        }
        return nextPoints;
      });
    }
  };

  const setAttribute = (attribute: SagaDriveAttributeKey, value: string) => setBaseAttributes((current) => ({ ...current, [attribute]: parseStartAttribute(value) }));
  const setAttributeAdvance = (advanceLevel: SagaDriveAttributeAdvanceLevel, attribute: SagaDriveAttributeKey) => {
    if (!canAssignSagaDriveAttributeAdvance(baseAttributes, attributeAdvances, characterLevel, advanceLevel, attribute)) return;
    setAttributeAdvances((current) => ({ ...current, [advanceLevel]: attribute }));
  };

  // --- Attribute -> abgeleitete Werte (Bracket-Tree im Attribute-Tab) ---
  const [connectedAttribute, setConnectedAttribute] = useState<SagaDriveAttributeKey | null>(null);
  const [hoveredAttribute, setHoveredAttribute] = useState<SagaDriveAttributeKey | null>(null);
  const activeAttribute = hoveredAttribute ?? connectedAttribute;
  const attributeConnectorAnimated = activeAttribute !== null && activeAttribute === connectedAttribute;

  // Ziel-Selektoren pro Attribut. Manöverwiderstand dynamically targets the attribute that
  // currently dominates max(STÄ + Athletik, GES + Akrobatik) — handled separately below.
  const attributeDerivedTargets: Partial<Record<SagaDriveAttributeKey, string[]>> = useMemo(() => {
    const maneuverUsesStrength = attributes.strength + finalSkillRanks.athletics >= attributes.dexterity + finalSkillRanks.acrobatics;
    const targets: Partial<Record<SagaDriveAttributeKey, string[]>> = {
      // Bewegung hängt indirekt an STÄ (Überlastung bei Last > Traglast).
      strength: ['carry-capacity', 'movement', ...(maneuverUsesStrength ? ['maneuver-resistance'] : [])],
      dexterity: ['reflex-resistance', 'defense', ...(maneuverUsesStrength ? [] : ['maneuver-resistance'])],
      endurance: ['health', 'body-resistance', 'recovery'],
      mind: ['mind-resistance'],
      perception: ['initiative'],
      charisma: [],
    };
    return targets;
  }, [attributes.dexterity, attributes.strength, finalSkillRanks.acrobatics, finalSkillRanks.athletics]);
  const connectedTargetSelectors = useMemo(
    () => (activeAttribute ? attributeDerivedTargets[activeAttribute] ?? [] : []),
    [activeAttribute, attributeDerivedTargets],
  );
  const connectedDerivedCards = useMemo(() => {
    if (!activeAttribute || connectedTargetSelectors.length === 0) return [];
    return connectedTargetSelectors
      .map((selector) => derivedStatCards.find((entry) => DERIVED_SELECTOR_BY_LABEL[entry.label] === selector))
      .filter((entry): entry is (typeof derivedStatCards)[number] => entry !== undefined);
  }, [activeAttribute, connectedTargetSelectors, derivedStatCards]);
  const dimmedDerivedCards = useMemo(() => {
    if (!activeAttribute) return [];
    const connected = new Set(connectedTargetSelectors);
    return derivedStatCards.filter((entry) => !connected.has(DERIVED_SELECTOR_BY_LABEL[entry.label]));
  }, [activeAttribute, connectedTargetSelectors, derivedStatCards]);
  const visibleDerivedCards = activeAttribute ? connectedDerivedCards : derivedStatCards;
  useEffect(() => {
    if (!connectedAttribute) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-attr-card]')) return;
      if (target.closest('[data-derived-card]')) return;
      if (target.closest('[data-attr-connector]')) return;
      if (target.closest('[data-slot="select-content"]')) return;
      if (target.closest('[data-radix-popper-content-wrapper]')) return;
      if (target.closest('[role="listbox"]')) return;
      setConnectedAttribute(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [connectedAttribute]);

  const uploadPortrait = async (file: File) => {
    setUploading(true);
    try { const url = await characterService.uploadPortrait(file); setPortraitUrl(url); toast.success('Portrait gespeichert'); }
    catch (error) { console.error('Portrait upload error:', error); toast.error(error instanceof Error ? error.message : 'Portrait konnte nicht gespeichert werden'); }
    finally { setUploading(false); }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Bitte wähle eine Bilddatei aus'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Bild ist zu groß. Maximum 5 MB'); return; }
    await uploadPortrait(file);
  };

  const handleGeneratePortrait = async () => {
    const canvas = avatarCanvasRef.current; if (!canvas) { toast.error('3D-Vorschau ist noch nicht bereit'); return; }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92)); if (!blob) { toast.error('Portrait konnte nicht erzeugt werden'); return; }
    const safeName = characterName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'character';
    await uploadPortrait(new File([blob], `${safeName}-portrait.png`, { type: 'image/png' }));
  };

  const handleSaveCharacter = async () => {
    const problems = collectValidationProblems();
    const firstProblem = problems[0];
    if (firstProblem) {
      setValidationAttempted(true);
      setActiveTab(firstProblem.tab);
      if (firstProblem.valuesSubTab) setActiveValuesSubTab(firstProblem.valuesSubTab);
      toast.error(firstProblem.message);
      return;
    }
    if (!characterArchetype || !essenceProfile || !archetypeTrainingSkill || !isSagaDriveSkillKey(specializationSkill) || !genderReading || !speciesTraitsComplete) {
      setValidationAttempted(true);
      toast.error('Bitte vervollständige Archetyp, Essenz, Spezies, Hintergrund und Fertigkeiten vor dem Speichern.');
      return;
    }

    const sagaDriveProfile: SagaDriveProfileDto = {
      archetype: characterArchetype,
      essence: essenceProfile,
      speciesTraitInstances: speciesTraitInstances.map((instance) => ({
        trait: instance.trait,
        ...(instance.option ? { option: instance.option } : {}),
        source: 'species-creation',
        acquiredAtLevel: 1,
      })),
      speciesProfile: characterRace === 'alien' ? { name: speciesProfileName.trim(), bodyDescription: speciesBodyDescription.trim() } : undefined,
      backgroundTemplateId: backgroundTemplateId ?? null,
      background: {
        name: backgroundName.trim(),
        skillPool: selectedBackgroundPool,
        trainedSkills: backgroundSkillPointsToTrainedSkills(backgroundSkillPoints),
        backgroundSkillPoints,
        specialization: { skill: specializationSkill, name: specializationName.trim(), source: 'background', acquiredAtLevel: 1 },
        milieuAccess: milieuAccess.trim(),
        contact: contact.trim(),
        complication: complication.trim(),
        communication: communication.trim(),
      },
      archetypeTrainingSkill,
      freeSkillRanks,
      skillAdvances: skillAdvances.length > 0 ? skillAdvances : undefined,
      specializations,
      baseAttributes,
      attributeAdvances,
      presetReleaseMode,
      drive: 3,
      momentum: 0,
    };

    const savePayload = {
      name: characterName.trim(), description: description.trim(), class: characterArchetype, race: characterRace, ruleset_key: ruleset, dnd_background: null as null, level: characterLevel,
      background_story: backgroundStory.trim() || undefined, notes: notes.trim(), personality_traits: personalityTraits.length > 0 ? personalityTraits : undefined, ideals: ideals.length > 0 ? ideals : undefined, bonds: bonds.length > 0 ? bonds : undefined, flaws: flaws.length > 0 ? flaws : undefined,
      appearance: { body_size: currentAvatar.body.size, height: currentAvatar.body.height, face_features: currentAvatar.traits.head ?? headStyle, hair_style: currentAvatar.traits.hair ?? hairStyle, hair_color: currentAvatar.colors.hair, skin_tone: currentAvatar.colors.skin, clothing: currentAvatar.traits.clothing ?? clothing, gender_reading: genderReading, avatar: currentAvatar },
      attributes, skills: finalSkillRanks, sagadrive_profile: sagaDriveProfile, abilities, inventory, portrait_url: portraitUrl || undefined,
    };

    setSaving(true);
    try {
      trackActivity(`Character Editor: Charakter "${characterName}" wird gespeichert`);
      const previousLevel = persistedLevel ?? characterLevel;
      const savedCharacter = savedCharacterId
        ? await characterService.updateCharacter(savedCharacterId, savePayload)
        : await characterService.createCharacter(savePayload);
      setSavedCharacterId(savedCharacter.id);
      setPersistedLevel(savedCharacter.level);
      // Round-trip through service normalize so editor state matches persisted base vs advances.
      const resolved = resolveSagaDriveAttributeBuildState(savedCharacter.attributes, savedCharacter.sagaDriveProfile);
      setBaseAttributes(resolved.baseAttributes);
      setAttributeAdvances(resolved.attributeAdvances);
      if (savedCharacter.sagaDriveProfile.presetReleaseMode === 'auto' || savedCharacter.sagaDriveProfile.presetReleaseMode === 'manual') {
        setPresetReleaseMode(savedCharacter.sagaDriveProfile.presetReleaseMode);
      }

      if (presetReleaseMode === 'auto' && savedCharacter.level > previousLevel) {
        const autoReleased = await characterPresetService.maybeAutoReleaseVersion({
          characterId: savedCharacter.id,
          previousLevel,
          snapshot: buildPresetSnapshot(),
          releaseMode: 'auto',
        });
        if (autoReleased) {
          toast.success(`Charakter gespeichert · Preset Level ${savedCharacter.level} freigegeben`);
        } else {
          toast.success('Charakter erfolgreich gespeichert');
        }
      } else {
        toast.success('Charakter erfolgreich gespeichert');
      }
      trackActivity(`Character Editor: Charakter "${characterName}" gespeichert (ID: ${savedCharacter.id})`);
    } catch (error) {
      console.error('Character save error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = (event: MouseEvent) => { event.stopPropagation(); setPortraitUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleTabChange = (value: string) => {
    if (!isEditorTab(value)) return;
    setActiveTab(value);
    if (value === 'values') setActiveValuesSubTab('archetype');
    setConnectedAttribute(null);
    setHoveredAttribute(null);
  };
  const handleValuesSubTabChange = (value: string) => { if (isValuesSubTab(value)) { setActiveValuesSubTab(value); setConnectedAttribute(null); setHoveredAttribute(null); } };
  const handleSettingsSubTabChange = (value: string) => { if (isSettingsSubTab(value)) setActiveSettingsSubTab(value); };
  const showIdentityPills = Boolean(essence?.label || archetype?.label);
  const totalStartSkillPoints = freeSkillPointsUsed + backgroundPointsUsed + (archetypeTrainingSkill ? 1 : 0);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-4 p-4 md:space-y-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h1 className="text-xl md:text-2xl">Charakter Editor</h1></div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={ruleset} onValueChange={handleRulesetChange}>
              <SelectTrigger id="ruleset" size="sm" className="w-[10.5rem] sm:w-52" aria-label="Regelset"><SelectValue /></SelectTrigger>
              <SelectContent>{characterRulesetOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            <CharacterAssistantButton />
            <Button variant="outline" onClick={() => trackActivity('Character Editor: Vorschau fokussiert')}><Eye className="mr-2 h-4 w-4" />Vorschau</Button>
            <Button onClick={handleSaveCharacter} disabled={saving || uploading}><Save className="mr-2 h-4 w-4" />{saving ? 'Speichert...' : 'Speichern'}</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          <Card className="lg:sticky lg:top-4 lg:col-span-1 lg:self-start">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-start justify-between gap-2"><p className="text-xs text-muted-foreground">{rulesetLabel}</p><Badge variant="outline">Drive 3 / 5</Badge></div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <div className="flex items-center gap-2">
                    <Input id="name" className="min-w-0 flex-1" placeholder="Charaktername" value={characterName} onChange={(event) => setCharacterName(event.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="gender-reading">Geschlecht</Label><GenderReadingSelect id="gender-reading" value={genderReading} onValueChange={setGenderReading} className="w-full" invalid={validationAttempted && !genderReadingComplete} /></div>
                  <div className="w-[4.5rem] shrink-0 space-y-1.5 sm:w-20"><Label htmlFor="level">Stufe</Label><Select value={String(characterLevel)} onValueChange={(value) => setCharacterLevel(Number.parseInt(value, 10))}><SelectTrigger id="level" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 20 }, (_, index) => index + 1).map((level) => <SelectItem key={level} value={String(level)}>{level}</SelectItem>)}</SelectContent></Select></div>
                </div>
                {validationAttempted && !genderReadingComplete && <p className="text-xs text-destructive">Bitte wähle eine Lesart: männlich, weiblich oder divers.</p>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-[4/5] overflow-hidden rounded-lg border border-border bg-[#0B1220] shadow-inner"><AvatarCanvas avatar={currentAvatar} canvasRef={avatarCanvasRef} /></div>
              {showIdentityPills ? (
                <IdentityPreviewPills
                  essenceKey={essenceProfile}
                  essenceLabel={essence?.label}
                  archetypeKey={characterArchetype}
                  archetypeLabel={archetype?.label}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Wähle Archetyp und Essenz</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Gesundheit</p><p className="mt-1 text-lg font-semibold">{health}</p></div>
                <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Verteidigung</p><p className="mt-1 text-lg font-semibold">{defense}</p></div>
                <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Bewegung</p><p className="mt-1 text-lg font-semibold">{movement} m</p></div>
                <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Erholung</p><p className="mt-1 text-lg font-semibold">{recovery}</p></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{sagaDriveAttributeDefinitions.map((attribute) => <div key={attribute.key} className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{attribute.shortLabel}</span><span className="font-semibold">+{attributes[attribute.key]}</span></div>)}</div>
              <Separator />
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Start-Fertigkeiten</span><span className="font-semibold">{totalStartSkillPoints} / 10</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Inventarlast</span><span className={overloaded ? 'font-semibold text-destructive' : 'font-semibold'}>{inventoryLoad} / {carryCapacity}</span></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><Button variant="outline" onClick={handleGeneratePortrait} disabled={uploading}><Camera className="mr-2 h-4 w-4" />Portrait erzeugen</Button><Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Upload className="mr-2 h-4 w-4" />Portrait hochladen</Button><input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /></div>
              {portraitUrl && <div className="flex items-center gap-3 rounded-lg border border-border p-2"><img src={portraitUrl} alt="Portrait-Fallback" className="h-14 w-14 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">Portrait</p><p className="truncate text-xs text-muted-foreground">Fallback für kompakte Ansichten</p></div><Button size="sm" variant="ghost" onClick={handleRemoveImage} aria-label="Portrait entfernen"><X className="h-4 w-4" /></Button></div>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5">
                  <TabsTrigger value="info" className="px-1 py-2 text-xs md:px-2 md:text-sm">Spezies</TabsTrigger>
                  <TabsTrigger value="values" className="px-1 py-2 text-xs md:px-2 md:text-sm">Charakter</TabsTrigger>
                  <TabsTrigger value="appearance" className="px-1 py-2 text-xs md:px-2 md:text-sm">Look</TabsTrigger>
                  <TabsTrigger value="inventory" className="px-1 py-2 text-xs md:px-2 md:text-sm">Inventar</TabsTrigger>
                  <TabsTrigger value="settings" className="px-1 py-2 text-xs md:px-2 md:text-sm">Einstellungen</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                  <div className="space-y-2"><Label id="species-label">Spezies</Label><SpeciesCarousel selectedRace={characterRace} onSelect={applyRacePreset} labelledBy="species-label" /></div>
                  <SpeciesTraitsPanel species={characterRace} traitInstances={speciesTraitInstances} speciesProfileName={speciesProfileName} speciesBodyDescription={speciesBodyDescription} validationAttempted={validationAttempted} onTraitInstancesChange={setSpeciesTraitInstances} onSpeciesProfileNameChange={setSpeciesProfileName} onSpeciesBodyDescriptionChange={setSpeciesBodyDescription} />
                </TabsContent>

                <TabsContent value="values" className="space-y-6">
                  <Tabs value={activeValuesSubTab} onValueChange={handleValuesSubTabChange}>
                    <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5">
                      <TabsTrigger value="archetype" className="px-2 py-2 text-xs md:px-3 md:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          Archetype
                          {valuesSubTabComplete.archetype ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /> : null}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="essenz" className="px-2 py-2 text-xs md:px-3 md:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          Essenz
                          {valuesSubTabComplete.essenz ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /> : null}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="attributes" className="px-2 py-2 text-xs md:px-3 md:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          Attribute
                          {valuesSubTabComplete.attributes ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /> : null}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="background" className="px-2 py-2 text-xs md:px-3 md:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          Hintergrund
                          {valuesSubTabComplete.background ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /> : null}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger value="details" className="px-2 py-2 text-xs md:px-3 md:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          Details
                          {valuesSubTabComplete.details ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /> : null}
                        </span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="attributes" className="mt-4 space-y-7">
                      <section className="space-y-4">
                        <h3 className="font-semibold">Attribute</h3>
                        {!characterArchetype ? <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">Der Archetyp-Punkt ist noch offen. Wähle unter <strong>Archetype</strong> zuerst eine Rolle und eine typische Fertigkeit.</div> : null}
                        <CharacterSkillsPanel
                          characterLevel={characterLevel}
                          attributes={attributes}
                          freeRanks={freeSkillRanks}
                          onFreeRanksChange={setFreeSkillRanks}
                          backgroundPoolSkills={selectedBackgroundPool}
                          backgroundSkillPoints={backgroundSkillPoints}
                          archetypeTrainingSkill={archetypeTrainingSkill}
                          skillAdvances={skillAdvances}
                          onSkillAdvancesChange={setSkillAdvances}
                          specializations={specializations}
                          onSpecializationsChange={setSpecializations}
                          selectedSkill={selectedSkill}
                          onSelectedSkillChange={setSelectedSkill}
                        />
                      </section>

                      <Separator />

                      <section className="space-y-4" data-attr-connector-section>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold">Attributsbonus (=D20 + Bonus)</h3>
                              <RuleHelp label="Attributbonus" contentClassName="max-h-[min(24rem,70vh)] max-w-[min(22rem,90vw)] overflow-y-auto">
                                <div className="space-y-2 text-xs leading-relaxed">
                                  <p>
                                    Für jedes Grundattribut werden Bonuspunkte verteilt. Diese werden bei Attributschecks dem D20 Wurf dazu gerechnet. Auf Level 1 kannst du insgesamt {SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET} Punkte verteilen. Je Attribut kann ein Bonus auf Level 1 maximal +{SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP} geben. Die Basisverteilung wird beim Levelaufstieg nicht neu verteilt. Auf Level {SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS[0]} wird das Cap auf +{SAGA_DRIVE_ATTRIBUTE_BONUS_CAP} angehoben und du kannst einen weiteren Bonuspunkt auf ein Attribut deiner Wahl verteilen. Auf Level {SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS[1]} erhältst du einen weiteren Bonuspunkt welchen du wieder auf ein Grundattribut deiner Wahl verteilen kannst.
                                  </p>
                                  <p>
                                    +0 bedeutet keinen positiven Bonus, nicht Handlungsunfähigkeit. Das bedeutet bei einem Check für dieses Attribut wird nur ein D20 gewürfelt und kein Bonus dazu gerechnet. Boni welche durch andere Mechaniken ausgelöst werden, sind davon nicht betroffen.
                                  </p>
                                  <p className="font-medium">Bonus-Obergrenzen nach Level:</p>
                                  <ul className="list-disc space-y-0.5 pl-4">
                                    {getSagaDriveAttributeBonusLevelGuide().map(({ levelLabel, maxBonus, description }) => (
                                      <li key={levelLabel}>
                                        Level {levelLabel}: Bonus max. +{maxBonus} ({description})
                                      </li>
                                    ))}
                                  </ul>
                                  <p>
                                    Wird ein Charakter auf einem höheren Level mit Bonuspunktveränderung erstellt gelten die entsprechenden Bonuspunkte-Regeln. Beispiel Charakter wird auf Level {SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS[0]} erstellt -&gt; Grundattribute können jeweils einen Bonus +{SAGA_DRIVE_ATTRIBUTE_BONUS_CAP} bekommen. Es bleiben {SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET} Basis-Bonuspunkte (+0 bis +{SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP}) plus {getSagaDriveAttributeAdvanceBudget(SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS[0])} separater Entwicklungsslot — nicht {SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET + getSagaDriveAttributeAdvanceBudget(SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS[0])} frei verteilbare Punkte.
                                  </p>
                                </div>
                              </RuleHelp>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">Verteile {SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET} Bonuspunkte auf Level 1. Diese werden immer als Bonus dem D20 Wurf dazugerechnet. Für weitere Infos klick auf das Fragezeichen.</p>
                          </div>
                          <div className="flex flex-wrap gap-2"><Badge variant={attributePointsUsed === SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET ? 'default' : 'destructive'}>{attributePointsUsed} / {SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET} Bonuspunkte</Badge>{attributeAdvanceBudget > 0 ? <Badge variant={attributeAdvancesUsed === attributeAdvanceBudget ? 'default' : 'destructive'}>{attributeAdvancesUsed} / {attributeAdvanceBudget} Entwicklung</Badge> : null}</div>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                          <div className="rounded-lg border border-border bg-muted/10 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Attributscheck</p>
                            <p className="mt-1 text-base font-semibold">1W20 + Attributbonus</p>
                            <p className="mt-2 text-sm text-muted-foreground">Ein Bonus von +0 bedeutet: nur der W20 zaehlt. Situative Boni und Mali kommen erst im eigentlichen Check dazu.</p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/10 p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Startverteilung</p>
                            <p className="mt-1 text-sm font-medium">Level 1: {SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET} Bonuspunkte gesamt, maximal +{SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP} pro Attribut.</p>
                            {attributeAdvanceBudget > 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">Auf Level {attributeAdvanceLevels.join(' und ')} kommt {attributeAdvanceBudget === 1 ? 'ein separater Entwicklungsslot' : `${attributeAdvanceBudget} separate Entwicklungsslots`} dazu. Diese Slots erhoehen bestehende Werte und sind keine freie Neuverteilung.</p>
                            ) : (
                              <p className="mt-2 text-sm text-muted-foreground">Spaeter kommen auf Level {SAGA_DRIVE_ATTRIBUTE_ADVANCE_LEVELS.join(' und ')} separate Entwicklungsslots dazu. Diese erhoehen bestehende Werte und sind keine freie Neuverteilung.</p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                          {sagaDriveAttributeDefinitions.map((attribute) => {
                            return (
                            <div
                              key={attribute.key}
                              data-attr-card={attribute.key}
                              role="button"
                              tabIndex={0}
                              onClick={() => setConnectedAttribute(attribute.key)}
                              onMouseEnter={() => setHoveredAttribute(attribute.key)}
                              onMouseLeave={() => setHoveredAttribute((current) => (current === attribute.key ? null : current))}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                const target = event.target;
                                if (!(target instanceof Element)) return;
                                if (target.closest('button, a, input, textarea, select, [role="combobox"], [role="listbox"], [data-slot="select-trigger"]')) return;
                                if (target !== event.currentTarget && target.closest('[data-attr-card]') !== event.currentTarget) return;
                                event.preventDefault();
                                setConnectedAttribute(attribute.key);
                              }}
                              className={`relative flex h-full cursor-pointer flex-col pt-0.5 items-center justify-center gap-2 rounded-lg border bg-card p-3 text-center transition-colors ${connectedAttribute === attribute.key ? 'border-primary bg-primary/5' : selectedSkill && sagaDriveSkillDefinitions.find((skill) => skill.key === selectedSkill)?.attribute === attribute.key ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/60'}`}
                            >
                              <div className="flex w-full items-start justify-center"><span className="opacity-60 [&_svg]:size-3" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}><RuleHelp label={attribute.label}>{attribute.description}</RuleHelp></span></div>
                              <div className="flex w-full flex-col items-center gap-1">
                                <p className="text-sm font-semibold leading-tight">{attribute.label}</p>
                                <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{attribute.shortLabel}</span>
                              </div>
                              <AttributeD20Icon className="my-0.5" />
                              <Select value={String(baseAttributes[attribute.key])} onValueChange={(value) => { setAttribute(attribute.key, value); setConnectedAttribute(attribute.key); }}><SelectTrigger className="w-full min-h-11 min-w-[4.75rem] justify-center gap-1 px-2 text-xs font-medium *:data-[slot=select-value]:line-clamp-none [&_svg:not([class*='size-'])]:size-3.5" aria-label={`${attribute.label} Grundbonus`} onClick={(event) => { event.stopPropagation(); setConnectedAttribute(attribute.key); }} onPointerDown={(event) => event.stopPropagation()}><SelectValue>+{baseAttributes[attribute.key]} Bonus</SelectValue></SelectTrigger><SelectContent>{[0, 1, 2, 3, 4].map((value) => {
                                  const advanceCount = attributeAdvanceLevels.filter((advanceLevel) => attributeAdvances[advanceLevel] === attribute.key).length;
                                  const finalValue = value + advanceCount;
                                  const extraHint = getAttributeOptionExtraDerivedHint(attribute.key, finalValue, attributes, finalSkillRanks.athletics, finalSkillRanks.acrobatics);
                                  return (
                                    <SelectItem key={value} value={String(value)} textValue={`+${value} Bonus`} disabled={finalValue > SAGA_DRIVE_ATTRIBUTE_BONUS_CAP} className={extraHint ? 'pr-10' : undefined}>
                                      <SelectItemText>+{value} Bonus</SelectItemText>
                                      {extraHint ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              aria-label="Zusätzlichen abgeleiteten Wert erklären"
                                              className="pointer-events-auto ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-primary hover:bg-primary/10"
                                              onClick={(event) => event.stopPropagation()}
                                              onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
                                            >
                                              <CircleHelp className="pointer-events-none size-3.5" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="right" sideOffset={8} className="max-w-[260px] text-left leading-relaxed">
                                            {extraHint}
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : null}
                                    </SelectItem>
                                  );
                                })}</SelectContent></Select>
                            </div>
                            );
                          })}
                        </div>
                        {attributeAdvanceLevels.length > 0 ? (
                          <div className="rounded-lg border border-border bg-muted/10 p-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="font-medium">Permanente Attributentwicklung</h4><p className="text-sm text-muted-foreground">Ab Level 8 und 16 kannst du jeweils ein Attribut dauerhaft weiterentwickeln. Die Wahl erhöht deine bestehende Basis; sie erlaubt keine kostenlose Neuverteilung. Reguläres Maximum: +5.</p></div><Badge variant="outline">{attributeAdvanceBudget} Entwicklung durch Level</Badge></div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {attributeAdvanceLevels.map((advanceLevel) => (
                                <div key={advanceLevel} className="space-y-1.5"><Label>Permanente Entwicklung (Level {advanceLevel})</Label><Select value={attributeAdvances[advanceLevel]} onValueChange={(value) => { if (sagaDriveAttributeDefinitions.some((entry) => entry.key === value)) setAttributeAdvance(advanceLevel, value as SagaDriveAttributeKey); }}><SelectTrigger className="min-h-11"><SelectValue placeholder="Attribut wählen" /></SelectTrigger><SelectContent>{sagaDriveAttributeDefinitions.map((entry) => <SelectItem key={entry.key} value={entry.key} disabled={!canAssignSagaDriveAttributeAdvance(baseAttributes, attributeAdvances, characterLevel, advanceLevel, entry.key)}>{entry.label} · aktuell +{attributes[entry.key]}</SelectItem>)}</SelectContent></Select></div>
                              ))}
                            </div>
                            {!attributeDistributionValid && attributePointsUsed === SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET ? <p className="mt-3 text-xs text-destructive">Vergib alle verfügbaren Entwicklungspunkte und achte darauf, dass kein Endwert +5 überschreitet.</p> : null}
                          </div>
                        ) : null}
                        {activeAttribute === 'charisma' ? (
                          <p className="text-center text-[11px] text-muted-foreground">Charisma fließt in keinen abgeleiteten Wert ein.</p>
                        ) : null}
                        <div className="space-y-1">
                          {!activeAttribute ? (
                            <div className="mb-3"><h3 className="font-semibold">Abgeleitete Werte</h3><p className="text-sm text-muted-foreground">Diese Werte werden aus Attributen, Fertigkeiten und Erfahrungsbonus berechnet und nicht direkt bearbeitet. Klicke auf eine Attributkarte, um nur die relevanten Werte zu sehen.</p></div>
                          ) : null}
                          <AttributeDerivedConnector
                            sourceAttribute={activeAttribute}
                            animated={attributeConnectorAnimated}
                            targetSelectors={connectedTargetSelectors}
                          />
                          <div className={activeAttribute ? (visibleDerivedCards.length <= 1 ? 'grid gap-3 grid-cols-1 max-w-md' : visibleDerivedCards.length === 2 ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-3') : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
                            {visibleDerivedCards.map((entry) => (
                              <div key={entry.label} data-derived-card={DERIVED_SELECTOR_BY_LABEL[entry.label]} className="[&>div]:h-full">
                                <DerivedStatCard {...entry} highlighted={Boolean(activeAttribute)} />
                              </div>
                            ))}
                          </div>
                          {activeAttribute && dimmedDerivedCards.length > 0 ? (
                            <div className="mt-4 grid gap-3 opacity-40 sm:grid-cols-2 xl:grid-cols-3">
                              {dimmedDerivedCards.map((entry) => (
                                <div key={entry.label} data-derived-card={DERIVED_SELECTOR_BY_LABEL[entry.label]} className="[&>div]:h-full">
                                  <DerivedStatCard {...entry} />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </section>
                    </TabsContent>

                    <TabsContent value="background" className="mt-4 space-y-7">
                      <CharacterBackgroundPanel
                        backgroundTemplateId={backgroundTemplateId}
                        backgroundName={backgroundName}
                        skillPool={backgroundSkillPool}
                        backgroundSkillPoints={backgroundSkillPoints}
                        onBackgroundSkillPointsChange={handleBackgroundSkillPointsChange}
                        specializationSkill={specializationSkill}
                        specializationName={specializationName}
                        milieuAccess={milieuAccess}
                        contact={contact}
                        complication={complication}
                        communication={communication}
                        complete={backgroundComplete}
                        onTemplateSelect={handleBackgroundTemplateSelect}
                        onBackgroundNameChange={setBackgroundName}
                        onPoolSkillChange={updateBackgroundPool}
                        onSpecializationSkillChange={(skill) => {
                          if (!skill) {
                            applyBackgroundSpecialization('', '');
                            return;
                          }
                          const keepName = isSagaDriveSkillKey(specializationSkill) && specializationSkill === skill ? specializationName : '';
                          applyBackgroundSpecialization(skill, keepName);
                        }}
                        onSpecializationNameChange={(name) => {
                          applyBackgroundSpecialization(specializationSkill, name);
                        }}
                        onSpecializationApply={(skill, name) => applyBackgroundSpecialization(skill, name)}
                        onMilieuAccessChange={setMilieuAccess}
                        onContactChange={setContact}
                        onComplicationChange={setComplication}
                        onCommunicationChange={setCommunication}
                      />

                      <Separator />

                      <section className="space-y-4">
                        <div><h3 className="font-semibold">Hintergrundgeschichte</h3><p className="text-sm text-muted-foreground">Optionaler Lore-Teil. Er verändert weder Attributwerte noch die mechanischen Hintergrund-Punkte.</p></div>
                        <CharacterBackgroundComposer value={backgroundStory} context={loreContext} onChange={setBackgroundStory} />
                      </section>
                    </TabsContent>

                    <TabsContent value="details" className="mt-4 space-y-7">
                      <details className="rounded-lg border border-border bg-muted/10 p-4"><summary className="cursor-pointer font-medium">Weitere Charakterdetails · optional</summary><div className="mt-5 space-y-5"><CharacterTraitEditor id="personality" label="Persönlichkeitsmerkmale" category="personality" values={personalityTraits} context={loreContext} onChange={setPersonalityTraits} /><CharacterTraitEditor id="ideals" label="Ideale" category="ideals" values={ideals} context={loreContext} onChange={setIdeals} /><CharacterTraitEditor id="bonds" label="Bindungen" category="bonds" values={bonds} context={loreContext} onChange={setBonds} /><CharacterTraitEditor id="flaws" label="Schwächen" category="flaws" values={flaws} context={loreContext} onChange={setFlaws} /></div></details>
                      <CharacterNotesSection value={notes} onChange={setNotes} />
                    </TabsContent>

                    <TabsContent value="archetype" className="mt-4">
                      <CharacterArchetypePanel
                        selectedArchetype={characterArchetype}
                        onArchetypeChange={handleArchetypeChange}
                        archetypeTrainingSkill={archetypeTrainingSkill}
                        onArchetypeTrainingSkillChange={setArchetypeTrainingSkill}
                        freeRanks={freeSkillRanks}
                        backgroundSkillPoints={backgroundSkillPoints}
                        attributes={attributes}
                        experienceBonus={experienceBonus}
                      />
                    </TabsContent>
                    <TabsContent value="essenz" className="mt-4"><CharacterEssencePanel selectedEssence={essenceProfile} onEssenceChange={handleEssenceChange} /></TabsContent>
                  </Tabs>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">Look ist kosmetisch</p><p className="mt-1 text-sm text-muted-foreground">Körperbau, Gesicht, Haare und Kleidung verändern keine Charakterwerte. Spezies und Speziesmerkmale wählst du im Spezies-Tab.</p></div><Badge variant="outline">Keine Werte</Badge></div></div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2"><div className="space-y-2"><Label>Körperbau</Label><Slider aria-label="Körperbau" value={bodySize} onValueChange={setBodySize} min={0} max={100} step={1} /><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Schmal</span><span>{bodySize[0]}</span><span>Massiv</span></div></div><div className="space-y-2"><Label>Größe</Label><Slider aria-label="Größe" value={height} onValueChange={setHeight} min={0} max={100} step={1} /><div className="flex items-center justify-between text-xs text-muted-foreground"><span>Klein</span><span>{height[0]}</span><span>Groß</span></div></div></div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="headStyle">Gesicht</Label><Select value={headStyle} onValueChange={setHeadStyle}><SelectTrigger id="headStyle"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="human-balanced">Ausgewogen</SelectItem><SelectItem value="elf-angular">Fein / kantig</SelectItem><SelectItem value="dwarf-broad">Breit</SelectItem><SelectItem value="halfling-soft">Weich</SelectItem><SelectItem value="orc-heavy">Massiv</SelectItem><SelectItem value="cyborg-angular">Synthetisch</SelectItem><SelectItem value="alien-oval">Oval</SelectItem><SelectItem value="neutral-soft">Neutral</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="ears">Ohren</Label><Select value={ears} onValueChange={setEars}><SelectTrigger id="ears"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="round">Rund</SelectItem><SelectItem value="elf-long">Lang</SelectItem><SelectItem value="orc-pointed">Spitz</SelectItem><SelectItem value="synthetic">Synthetisch</SelectItem><SelectItem value="none">Keine sichtbar</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="hairStyle">Frisur</Label><Select value={hairStyle} onValueChange={setHairStyle}><SelectTrigger id="hairStyle"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="short">Kurz</SelectItem><SelectItem value="long">Lang</SelectItem><SelectItem value="bald">Kahl</SelectItem><SelectItem value="braided">Geflochten</SelectItem><SelectItem value="wild">Wild</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="clothing">Kleidung</Label><Select value={clothing} onValueChange={setClothing}><SelectTrigger id="clothing"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="robe">Robe</SelectItem><SelectItem value="armor">Rüstungslook</SelectItem><SelectItem value="leather">Leder</SelectItem><SelectItem value="casual">Alltag</SelectItem><SelectItem value="noble">Edel</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="accessory">Accessoire</Label><Select value={accessory} onValueChange={setAccessory}><SelectTrigger id="accessory"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Keins</SelectItem><SelectItem value="optic-implant">Optik-Implantat</SelectItem><SelectItem value="earring">Ohrring</SelectItem><SelectItem value="scar">Narbe</SelectItem></SelectContent></Select></div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="hairColor">Haarfarbe</Label><div className="flex gap-2"><Input id="hairColor" type="color" value={/^#[0-9a-fA-F]{6}$/.test(hairColor) ? hairColor : '#000000'} onChange={(event) => setHairColor(event.target.value)} className="h-10 w-20" /><Input value={hairColor} onChange={(event) => setHairColor(event.target.value)} aria-label="Haarfarbe als Hexwert" /></div></div><div className="space-y-2"><Label htmlFor="skinTone">Hautfarbe</Label><div className="flex gap-2"><Input id="skinTone" type="color" value={/^#[0-9a-fA-F]{6}$/.test(skinTone) ? skinTone : '#F5E6D3'} onChange={(event) => setSkinTone(event.target.value)} className="h-10 w-20" /><Input value={skinTone} onChange={(event) => setSkinTone(event.target.value)} aria-label="Hautfarbe als Hexwert" /></div></div></div>
                </TabsContent>

                <TabsContent value="inventory"><CharacterInventoryPanel items={inventory} onChange={setInventory} strength={attributes.strength} /></TabsContent>
                <TabsContent value="settings" className="space-y-4">
                  <Tabs value={activeSettingsSubTab} onValueChange={handleSettingsSubTabChange}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="statistics" className="px-3 py-2 text-xs md:text-sm">Statistik</TabsTrigger>
                      <TabsTrigger value="preset" className="px-3 py-2 text-xs md:text-sm">Preset</TabsTrigger>
                    </TabsList>
                    <TabsContent value="statistics" className="mt-4 space-y-4">
                      <CharacterStatisticsPanel characterId={savedCharacterId} />
                    </TabsContent>
                    <TabsContent value="preset" className="mt-4 space-y-4">
                      <CharacterPresetPanel
                        characterId={savedCharacterId}
                        characterName={characterName}
                        characterLevel={characterLevel}
                        ruleset={ruleset}
                        releaseMode={presetReleaseMode}
                        onReleaseModeChange={setPresetReleaseMode}
                        validateForPreset={() => collectValidationProblems()[0]?.message ?? null}
                        buildSnapshot={buildPresetSnapshot}
                      />
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
