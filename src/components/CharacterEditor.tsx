import { useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { AlertCircle, Camera, CheckCircle2, Circle, Eye, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  AvatarCanvas,
  characterService,
  createCharacterStudioAvatar,
  getAvatarRacePreset,
} from '../modules/characters';
import type {
  AbilityDto,
  CharacterAttributesDto,
  CharacterLoreContext,
  ItemDto,
  SagaDriveProfileDto,
} from '../modules/characters';
import { CharacterAbilitiesPanel } from '../modules/characters/components/CharacterAbilitiesPanel';
import { CharacterBackgroundComposer } from '../modules/characters/components/CharacterBackgroundComposer';
import { CharacterInventoryPanel, getInventoryLoad } from '../modules/characters/components/CharacterInventoryPanel';
import { RuleHelp } from '../modules/characters/components/RuleHelp';
import { CharacterSkillsPanel, getSagaDriveFinalSkillRanks } from '../modules/characters/components/CharacterSkillsPanel';
import { CharacterTraitEditor } from '../modules/characters/components/CharacterTraitEditor';
import {
  SAGA_DRIVE_START_ATTRIBUTE_ARRAY,
  SAGA_DRIVE_START_FREE_SKILL_POINTS,
  SAGA_DRIVE_START_MIN_TRAINED_SKILLS,
  SAGA_DRIVE_START_SKILL_CAP,
  createEmptySagaDriveSkillRanks,
  getCharacterCreationOptionLabel,
  getSagaDriveArchetype,
  getSagaDriveEssence,
  getSagaDriveSkill,
  isSagaDriveArchetypeKey,
  isSagaDriveEssenceKey,
  isSagaDriveSkillKey,
  sagaDriveArchetypeOptions,
  sagaDriveAttributeDefinitions,
  sagaDriveEssenceOptions,
  sagaDriveRaceOptions,
  sagaDriveSkillDefinitions,
  sagaDriveSpeciesTraitDefinitions,
  type CharacterRulesetKey,
  type SagaDriveArchetypeKey,
  type SagaDriveAttributeKey,
  type SagaDriveEssenceKey,
  type SagaDriveSkillKey,
  type SagaDriveSpeciesTraitKey,
} from '../modules/rulesets/characterCreation';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';

type ActivityTrackingWindow = Window & { trackActivity?: (description: string) => void };
type EditorTab = 'info' | 'background' | 'values' | 'skills' | 'abilities' | 'appearance' | 'inventory' | 'notes';
type SkillSlot = SagaDriveSkillKey | '';
type BackgroundSkillPool = [SkillSlot, SkillSlot, SkillSlot, SkillSlot];
type BackgroundTraining = [SkillSlot, SkillSlot];
type TabStatusProps = { label: string; complete: boolean; attempted: boolean; optional?: boolean };

const RULESET: CharacterRulesetKey = 'sagadrive-core';
const LEVEL = 1;
const INITIAL_ATTRIBUTES: CharacterAttributesDto = { strength: 4, dexterity: 3, endurance: 3, mind: 2, perception: 2, charisma: 1 };

const trackActivity = (description: string) => {
  if (typeof window === 'undefined') return;
  (window as ActivityTrackingWindow).trackActivity?.(description);
};

function TabStatus({ label, complete, attempted, optional = false }: TabStatusProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      {!optional && (complete ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : attempted ? <AlertCircle className="h-3.5 w-3.5 text-destructive" /> : <Circle className="h-2.5 w-2.5 fill-current text-muted-foreground/50" />)}
    </span>
  );
}

function isEditorTab(value: string): value is EditorTab {
  return value === 'info' || value === 'background' || value === 'values' || value === 'skills' || value === 'abilities' || value === 'appearance' || value === 'inventory' || value === 'notes';
}

function parseStartAttribute(value: string): 1 | 2 | 3 | 4 { if (value === '1') return 1; if (value === '2') return 2; if (value === '4') return 4; return 3; }

function isValidStartAttributeDistribution(attributes: CharacterAttributesDto): boolean {
  const current = Object.values(attributes).slice().sort((left, right) => right - left);
  return current.length === SAGA_DRIVE_START_ATTRIBUTE_ARRAY.length && current.every((value, index) => value === SAGA_DRIVE_START_ATTRIBUTE_ARRAY[index]);
}

function uniqueSkills(values: readonly SkillSlot[]): SagaDriveSkillKey[] { return Array.from(new Set(values.filter(isSagaDriveSkillKey))); }

export function CharacterEditor() {
  const [activeTab, setActiveTab] = useState<EditorTab>('info');
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [description, setDescription] = useState('');
  const [characterArchetype, setCharacterArchetype] = useState<SagaDriveArchetypeKey | undefined>();
  const [characterRace, setCharacterRace] = useState('human');
  const [essenceProfile, setEssenceProfile] = useState<SagaDriveEssenceKey | undefined>();
  const [speciesTraits, setSpeciesTraits] = useState<SagaDriveSpeciesTraitKey[]>([]);
  const [speciesTraitDetails, setSpeciesTraitDetails] = useState('');

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

  const [attributes, setAttributes] = useState<CharacterAttributesDto>(INITIAL_ATTRIBUTES);
  const [freeSkillRanks, setFreeSkillRanks] = useState(createEmptySagaDriveSkillRanks);
  const [archetypeTrainingSkill, setArchetypeTrainingSkill] = useState<SagaDriveSkillKey | undefined>();
  const [backgroundName, setBackgroundName] = useState('');
  const [backgroundSkillPool, setBackgroundSkillPool] = useState<BackgroundSkillPool>(['', '', '', '']);
  const [backgroundTraining, setBackgroundTraining] = useState<BackgroundTraining>(['', '']);
  const [specializationSkill, setSpecializationSkill] = useState<SkillSlot>('');
  const [specializationName, setSpecializationName] = useState('');
  const [milieuAccess, setMilieuAccess] = useState('');
  const [contact, setContact] = useState('');
  const [complication, setComplication] = useState('');
  const [communication, setCommunication] = useState('');
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

  const currentAvatar = useMemo(() => createCharacterStudioAvatar({
    race: characterRace, head: headStyle, ears, hairStyle, clothing, accessory: accessory === 'none' ? undefined : accessory,
    hairColor, skinTone, bodySize: bodySize[0] ?? 50, height: height[0] ?? 50,
  }), [accessory, bodySize, characterRace, clothing, ears, hairColor, hairStyle, headStyle, height, skinTone]);

  const archetype = characterArchetype ? getSagaDriveArchetype(characterArchetype) : undefined;
  const essence = essenceProfile ? getSagaDriveEssence(essenceProfile) : undefined;
  const selectedBackgroundPool = useMemo(() => uniqueSkills(backgroundSkillPool), [backgroundSkillPool]);
  const selectedBackgroundTraining = useMemo(() => uniqueSkills(backgroundTraining), [backgroundTraining]);
  const finalSkillRanks = useMemo(() => getSagaDriveFinalSkillRanks(freeSkillRanks, selectedBackgroundTraining, archetypeTrainingSkill), [archetypeTrainingSkill, freeSkillRanks, selectedBackgroundTraining]);

  const abilities = useMemo<AbilityDto[]>(() => {
    if (!archetype) return [];
    return [{ id: `sagadrive-core-${archetype.value}`, name: archetype.coreAbility.name, description: archetype.coreAbility.description, type: archetype.value === 'fighter' ? 'combat' : 'skill', cost: 0, effect: archetype.coreAbility.effect, source: archetype.label, rank: archetype.coreAbility.rank, action_type: archetype.coreAbility.actionType }];
  }, [archetype]);

  const freeSkillPointsUsed = useMemo(() => sagaDriveSkillDefinitions.reduce((sum, skill) => sum + freeSkillRanks[skill.key], 0), [freeSkillRanks]);
  const trainedSkillCount = useMemo(() => sagaDriveSkillDefinitions.filter((skill) => finalSkillRanks[skill.key] > 0).length, [finalSkillRanks]);
  const skillOverflow = useMemo(() => sagaDriveSkillDefinitions.some((skill) => finalSkillRanks[skill.key] > SAGA_DRIVE_START_SKILL_CAP), [finalSkillRanks]);
  const attributeDistributionValid = isValidStartAttributeDistribution(attributes);
  const speciesTraitCost = speciesTraits.reduce((sum, traitKey) => sum + (sagaDriveSpeciesTraitDefinitions.find((definition) => definition.key === traitKey)?.cost ?? 0), 0);
  const inventoryLoad = getInventoryLoad(inventory);
  const carryCapacity = 5 + 2 * attributes.strength;
  const overloaded = inventoryLoad > carryCapacity;
  const movement = overloaded ? 6 : 9;
  const experienceBonus = 1;
  const health = 12 + 2 * attributes.endurance + 2 * experienceBonus;
  const defense = 10 + attributes.dexterity + experienceBonus + Math.max(finalSkillRanks.melee, finalSkillRanks.acrobatics);
  const initiativeModifier = attributes.perception + finalSkillRanks.awareness + (finalSkillRanks.awareness > 0 ? experienceBonus : 0);
  const bodyResistance = 10 + attributes.endurance + experienceBonus;
  const reflexResistance = 10 + attributes.dexterity + experienceBonus;
  const mindResistance = 10 + attributes.mind + experienceBonus;
  const maneuverResistance = 10 + experienceBonus + Math.max(attributes.strength + finalSkillRanks.athletics, attributes.dexterity + finalSkillRanks.acrobatics);
  const recovery = attributes.endurance + experienceBonus;

  const backgroundComplete = Boolean(backgroundName.trim()) && selectedBackgroundPool.length === 4 && selectedBackgroundTraining.length === 2 && selectedBackgroundTraining.every((skill) => selectedBackgroundPool.includes(skill)) && isSagaDriveSkillKey(specializationSkill) && selectedBackgroundTraining.includes(specializationSkill) && Boolean(specializationName.trim()) && Boolean(milieuAccess.trim()) && Boolean(contact.trim()) && Boolean(complication.trim()) && Boolean(communication.trim());
  const skillsComplete = Boolean(archetypeTrainingSkill) && freeSkillPointsUsed === SAGA_DRIVE_START_FREE_SKILL_POINTS && trainedSkillCount >= SAGA_DRIVE_START_MIN_TRAINED_SKILLS && !skillOverflow;
  const infoComplete = Boolean(characterName.trim() && characterArchetype && essenceProfile);
  const tabCompletion: Record<EditorTab, boolean> = { info: infoComplete, background: backgroundComplete, values: attributeDistributionValid, skills: skillsComplete, abilities: Boolean(archetype), appearance: true, inventory: true, notes: true };

  const loreContext = useMemo<CharacterLoreContext>(() => ({
    ruleset: RULESET,
    name: characterName.trim(),
    description: [description.trim(), backgroundName.trim() ? `Hintergrund: ${backgroundName.trim()}` : ''].filter(Boolean).join('\n'),
    characterClass: archetype?.label ?? '',
    raceOrSpecies: getCharacterCreationOptionLabel(sagaDriveRaceOptions, characterRace),
    essenceProfile: essence?.label,
    level: LEVEL,
    attributes: { strength: attributes.strength, dexterity: attributes.dexterity, constitution: attributes.endurance, intelligence: attributes.mind, wisdom: attributes.perception, charisma: attributes.charisma },
    abilities: abilities.map((ability) => ({ name: ability.name, description: ability.description, type: ability.type, cost: ability.cost, effect: ability.effect })),
    inventory: inventory.map((item) => ({ name: item.name, description: item.description, type: item.type === 'shield' || item.type === 'tool' ? 'misc' : item.type, quantity: item.quantity })),
    appearance: { bodySize: currentAvatar.body.size, height: currentAvatar.body.height, face: currentAvatar.traits.head ?? headStyle, hairStyle: currentAvatar.traits.hair ?? hairStyle, hairColor: currentAvatar.colors.hair, skinTone: currentAvatar.colors.skin, clothing: currentAvatar.traits.clothing ?? clothing, accessory: currentAvatar.traits.accessory },
    traits: { personality: personalityTraits, ideals, bonds, flaws },
  }), [abilities, archetype, attributes, backgroundName, bonds, characterName, characterRace, clothing, currentAvatar, description, essence, flaws, hairStyle, ideals, inventory, personalityTraits]);

  const applyRacePreset = (race: string) => {
    const preset = getAvatarRacePreset(race);
    setCharacterRace(race); setBodySize([preset.bodySize]); setHeight([preset.height]); setHeadStyle(preset.head); setEars(preset.ears); setHairStyle(preset.hair); setHairColor(preset.hairColor); setSkinTone(preset.skinTone); setClothing(preset.clothing); setAccessory(preset.accessory ?? 'none');
  };
  const handleArchetypeChange = (value: string) => { if (!isSagaDriveArchetypeKey(value)) return; const next = getSagaDriveArchetype(value); setCharacterArchetype(value); if (archetypeTrainingSkill && !next?.skills.includes(archetypeTrainingSkill)) setArchetypeTrainingSkill(undefined); };
  const handleEssenceChange = (value: string) => { if (isSagaDriveEssenceKey(value)) setEssenceProfile(value); };
  const toggleSpeciesTrait = (traitKey: SagaDriveSpeciesTraitKey) => {
    if (speciesTraits.includes(traitKey)) { setSpeciesTraits((current) => current.filter((key) => key !== traitKey)); return; }
    const trait = sagaDriveSpeciesTraitDefinitions.find((definition) => definition.key === traitKey);
    if (!trait || speciesTraitCost + trait.cost > 3) return;
    setSpeciesTraits((current) => [...current, traitKey]);
  };
  const updateBackgroundPool = (index: number, value: string) => {
    if (!isSagaDriveSkillKey(value) || index < 0 || index > 3) return;
    const previous = backgroundSkillPool[index];
    const next: BackgroundSkillPool = [backgroundSkillPool[0], backgroundSkillPool[1], backgroundSkillPool[2], backgroundSkillPool[3]];
    next[index] = value; setBackgroundSkillPool(next);
    if (previous && previous !== value && !next.includes(previous)) {
      const nextTraining: BackgroundTraining = [backgroundTraining[0] === previous ? '' : backgroundTraining[0], backgroundTraining[1] === previous ? '' : backgroundTraining[1]];
      setBackgroundTraining(nextTraining);
      if (specializationSkill === previous) { setSpecializationSkill(''); setSpecializationName(''); }
    }
  };
  const updateBackgroundTraining = (index: number, value: string) => {
    if (!isSagaDriveSkillKey(value) || !selectedBackgroundPool.includes(value) || index < 0 || index > 1) return;
    const next: BackgroundTraining = [backgroundTraining[0], backgroundTraining[1]]; next[index] = value; setBackgroundTraining(next);
    if (isSagaDriveSkillKey(specializationSkill) && !uniqueSkills(next).includes(specializationSkill)) { setSpecializationSkill(''); setSpecializationName(''); }
  };
  const setAttribute = (attribute: SagaDriveAttributeKey, value: string) => setAttributes((current) => ({ ...current, [attribute]: parseStartAttribute(value) }));

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
    const problems: Array<{ tab: EditorTab; message: string }> = [];
    if (!characterName.trim()) problems.push({ tab: 'info', message: 'Bitte gib deinem Charakter einen Namen.' });
    if (!characterArchetype) problems.push({ tab: 'info', message: 'Bitte wähle einen Primärarchetyp.' });
    if (!essenceProfile) problems.push({ tab: 'info', message: 'Bitte wähle eine primäre Essenz.' });
    if (!backgroundComplete) problems.push({ tab: 'background', message: 'Vervollständige die mechanischen Hintergrundangaben.' });
    if (!attributeDistributionValid) problems.push({ tab: 'values', message: 'Die Startattribute müssen genau 4, 3, 3, 2, 2, 1 verwenden.' });
    if (!skillsComplete) problems.push({ tab: 'skills', message: 'Vervollständige die 10 Start-Fertigkeitspunkte und trainiere mindestens sechs Fertigkeiten.' });
    const firstProblem = problems[0];
    if (firstProblem) { setValidationAttempted(true); setActiveTab(firstProblem.tab); toast.error(firstProblem.message); return; }
    if (!characterArchetype || !essenceProfile || !archetypeTrainingSkill || !isSagaDriveSkillKey(specializationSkill)) return;

    const sagaDriveProfile: SagaDriveProfileDto = {
      archetype: characterArchetype, essence: essenceProfile, speciesTraits, speciesTraitDetails: speciesTraitDetails.trim(),
      background: { name: backgroundName.trim(), skillPool: selectedBackgroundPool, trainedSkills: selectedBackgroundTraining, specialization: { skill: specializationSkill, name: specializationName.trim() }, milieuAccess: milieuAccess.trim(), contact: contact.trim(), complication: complication.trim(), communication: communication.trim() },
      archetypeTrainingSkill, drive: 3, momentum: 0,
    };

    setSaving(true);
    try {
      trackActivity(`Character Editor: Charakter "${characterName}" wird gespeichert`);
      const savedCharacter = await characterService.createCharacter({
        name: characterName.trim(), description: description.trim(), class: characterArchetype, race: characterRace, ruleset_key: RULESET, dnd_background: null, level: LEVEL,
        background_story: backgroundStory.trim() || undefined, notes: notes.trim(), personality_traits: personalityTraits.length > 0 ? personalityTraits : undefined, ideals: ideals.length > 0 ? ideals : undefined, bonds: bonds.length > 0 ? bonds : undefined, flaws: flaws.length > 0 ? flaws : undefined,
        appearance: { body_size: currentAvatar.body.size, height: currentAvatar.body.height, face_features: currentAvatar.traits.head ?? headStyle, hair_style: currentAvatar.traits.hair ?? hairStyle, hair_color: currentAvatar.colors.hair, skin_tone: currentAvatar.colors.skin, clothing: currentAvatar.traits.clothing ?? clothing, avatar: currentAvatar },
        attributes, skills: finalSkillRanks, sagadrive_profile: sagaDriveProfile, abilities, inventory, portrait_url: portraitUrl || undefined,
      });
      trackActivity(`Character Editor: Charakter "${characterName}" gespeichert (ID: ${savedCharacter.id})`); toast.success('Charakter erfolgreich gespeichert');
    } catch (error) { console.error('Character save error:', error); toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  const handleRemoveImage = (event: MouseEvent) => { event.stopPropagation(); setPortraitUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const handleTabChange = (value: string) => { if (isEditorTab(value)) setActiveTab(value); };
  const previewSubtitle = [essence?.label, archetype?.label, getCharacterCreationOptionLabel(sagaDriveRaceOptions, characterRace)].filter(Boolean).join(' · ');

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-4 p-4 md:space-y-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl md:text-2xl">Charakter Editor</h1><Badge>SagaDrive Core</Badge><Badge variant="outline">Stufe 1</Badge></div><p className="mt-1 text-sm text-muted-foreground">Der Editor führt dich durch die Core-Regeln und berechnet regelrelevante Werte automatisch.</p></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => trackActivity('Character Editor: Vorschau fokussiert')}><Eye className="mr-2 h-4 w-4" />Vorschau</Button><Button onClick={handleSaveCharacter} disabled={saving || uploading}><Save className="mr-2 h-4 w-4" />{saving ? 'Speichert...' : 'Speichern'}</Button></div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          <Card className="lg:sticky lg:top-4 lg:col-span-1 lg:self-start">
            <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate text-base md:text-lg" title={characterName || 'Unbenannt'}>{characterName || 'Unbenannt'}</CardTitle><p className="mt-1 text-xs text-muted-foreground">Stufe 1 · SagaDrive Core</p></div><Badge variant="outline">Drive 3 / 5</Badge></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-[4/5] overflow-hidden rounded-lg border border-border bg-[#0B1220] shadow-inner"><AvatarCanvas avatar={currentAvatar} canvasRef={avatarCanvasRef} /></div>
              <p className="text-sm text-muted-foreground">{previewSubtitle || 'Wähle Archetyp und Essenz'}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Gesundheit</p><p className="mt-1 text-lg font-semibold">{health}</p></div>
                <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Verteidigung</p><p className="mt-1 text-lg font-semibold">{defense}</p></div>
                <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Bewegung</p><p className="mt-1 text-lg font-semibold">{movement} m</p></div>
                <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Erholung</p><p className="mt-1 text-lg font-semibold">{recovery}</p></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{sagaDriveAttributeDefinitions.map((attribute) => <div key={attribute.key} className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{attribute.shortLabel}</span><span className="font-semibold">{attributes[attribute.key]}</span></div>)}</div>
              <Separator />
              <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Inventarlast</span><span className={overloaded ? 'font-semibold text-destructive' : 'font-semibold'}>{inventoryLoad} / {carryCapacity}</span></div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><Button variant="outline" onClick={handleGeneratePortrait} disabled={uploading}><Camera className="mr-2 h-4 w-4" />Portrait erzeugen</Button><Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Upload className="mr-2 h-4 w-4" />Portrait hochladen</Button><input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /></div>
              {portraitUrl && <div className="flex items-center gap-3 rounded-lg border border-border p-2"><img src={portraitUrl} alt="Portrait-Fallback" className="h-14 w-14 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">Portrait</p><p className="truncate text-xs text-muted-foreground">Fallback für kompakte Ansichten</p></div><Button size="sm" variant="ghost" onClick={handleRemoveImage} aria-label="Portrait entfernen"><X className="h-4 w-4" /></Button></div>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-base md:text-lg">Charakter erstellen</CardTitle><CardDescription className="text-xs md:text-sm">Pflichtangaben werden in den Tabs markiert. Look, Inventar und Notizen bleiben frei bearbeitbar.</CardDescription></CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4 xl:grid-cols-8">
                  <TabsTrigger value="info" className="px-1 py-2 text-xs md:px-2 md:text-sm"><TabStatus label="Info" complete={tabCompletion.info} attempted={validationAttempted} /></TabsTrigger>
                  <TabsTrigger value="background" className="px-1 py-2 text-xs md:px-2 md:text-sm"><TabStatus label="Hintergrund" complete={tabCompletion.background} attempted={validationAttempted} /></TabsTrigger>
                  <TabsTrigger value="values" className="px-1 py-2 text-xs md:px-2 md:text-sm"><TabStatus label="Werte" complete={tabCompletion.values} attempted={validationAttempted} /></TabsTrigger>
                  <TabsTrigger value="skills" className="px-1 py-2 text-xs md:px-2 md:text-sm"><TabStatus label="Fertigkeiten" complete={tabCompletion.skills} attempted={validationAttempted} /></TabsTrigger>
                  <TabsTrigger value="abilities" className="px-1 py-2 text-xs md:px-2 md:text-sm"><TabStatus label="Fähigkeiten" complete={tabCompletion.abilities} attempted={validationAttempted} /></TabsTrigger>
                  <TabsTrigger value="appearance" className="px-1 py-2 text-xs md:px-2 md:text-sm"><TabStatus label="Look" complete optional attempted={validationAttempted} /></TabsTrigger>
                  <TabsTrigger value="inventory" className="px-1 py-2 text-xs md:px-2 md:text-sm"><TabStatus label="Inventar" complete optional attempted={validationAttempted} /></TabsTrigger>
                  <TabsTrigger value="notes" className="px-1 py-2 text-xs md:px-2 md:text-sm"><TabStatus label="Notizen" complete optional attempted={validationAttempted} /></TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">SagaDrive Core</p><p className="mt-1 text-sm text-muted-foreground">Aktives Regelset für diesen Character-Creation-Flow. Andere Regelsets werden hier bewusst nicht eingemischt.</p></div><Badge>Core</Badge></div></div>
                  <div className="grid gap-4 md:grid-cols-3"><div className="space-y-2 md:col-span-2"><Label htmlFor="name">Name</Label><Input id="name" placeholder="Charaktername" value={characterName} onChange={(event) => setCharacterName(event.target.value)} /></div><div className="space-y-2"><Label>Stufe</Label><div className="flex h-10 items-center rounded-md border border-border bg-muted/20 px-3 text-sm">1 · Startcharakter</div></div></div>
                  <div className="space-y-2"><Label htmlFor="description">Kurzbeschreibung</Label><Textarea id="description" placeholder="Wer ist dein Charakter?" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
                  <Separator />
                  <section className="space-y-4">
                    <div className="flex items-center gap-1"><h3 className="font-semibold">Wesenart</h3><RuleHelp label="Wesenart">Wesenart beschreibt körperliche oder strukturelle Besonderheiten. Sie gibt im Core keine allgemeinen Attribut- oder Fertigkeitsboni und verwendet ein Merkmalsbudget von 3 Punkten.</RuleHelp></div>
                    <div className="space-y-2"><Label htmlFor="species">Wesenart</Label><Select value={characterRace} onValueChange={applyRacePreset}><SelectTrigger id="species"><SelectValue /></SelectTrigger><SelectContent>{sagaDriveRaceOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Die Auswahl setzt aktuell den Basislook. Regelwirkung entsteht aus den Wesenartmerkmalen.</p></div>
                    <div className="rounded-lg border border-border bg-muted/15 p-4">
                      <div className="flex items-center justify-between gap-3"><div><p className="font-medium">Merkmalsbudget</p><p className="text-xs text-muted-foreground">Wähle bis zu 3 Punkte. Nachteile geben keine Punkte zurück.</p></div><Badge variant="outline">{speciesTraitCost} / 3</Badge></div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">{sagaDriveSpeciesTraitDefinitions.map((trait) => { const selected = speciesTraits.includes(trait.key); const blocked = !selected && speciesTraitCost + trait.cost > 3; return <button key={trait.key} type="button" disabled={blocked} onClick={() => toggleSpeciesTrait(trait.key)} className={selected ? 'rounded-lg border border-primary bg-primary/10 p-3 text-left transition-colors' : 'rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-45'}><div className="flex items-start justify-between gap-3"><span className="font-medium">{trait.label}</span><Badge variant={selected ? 'default' : 'outline'}>{trait.cost}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{trait.description}</p></button>; })}</div>
                      {speciesTraits.length > 0 && <div className="mt-4 space-y-2"><Label htmlFor="species-trait-details">Merkmalsdetails</Label><Textarea id="species-trait-details" rows={2} value={speciesTraitDetails} onChange={(event) => setSpeciesTraitDetails(event.target.value)} placeholder="z. B. welcher Sinn, welche Umgebung oder welche besondere Körperform" /></div>}
                    </div>
                  </section>
                  <Separator />
                  <section className="space-y-3">
                    <div><div className="flex items-center gap-1"><h3 className="font-semibold">Primärarchetyp</h3><RuleHelp label="Archetyp">Der Archetyp beschreibt, was dein Charakter besonders gut tut. Er bestimmt die Kernfähigkeit und typische Fertigkeiten, aber nicht die Quelle besonderer Kräfte.</RuleHelp></div><p className="text-sm text-muted-foreground">Was tut dein Charakter besonders gut?</p></div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{sagaDriveArchetypeOptions.map((option) => { const selected = characterArchetype === option.value; return <button key={option.value} type="button" onClick={() => handleArchetypeChange(option.value)} className={selected ? 'rounded-lg border border-primary bg-primary/10 p-4 text-left' : 'rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/60'}><p className="font-semibold">{option.label}</p><p className="mt-1 text-xs text-muted-foreground">{option.summary}</p><p className="mt-3 text-xs">Kernfähigkeit: {option.coreAbility.name}</p></button>; })}</div>
                  </section>
                  <section className="space-y-3">
                    <div><div className="flex items-center gap-1"><h3 className="font-semibold">Primäre Essenz</h3><RuleHelp label="Essenz">Die Essenz beschreibt, wie besondere Fähigkeiten entstehen. Sie ist unabhängig vom Archetyp und gibt keine automatischen Attributs- oder Fertigkeitsboni.</RuleHelp></div><p className="text-sm text-muted-foreground">Wie entstehen die besonderen Wirkungen deines Charakters?</p></div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{sagaDriveEssenceOptions.map((option) => { const selected = essenceProfile === option.value; return <button key={option.value} type="button" onClick={() => handleEssenceChange(option.value)} className={selected ? 'rounded-lg border border-primary bg-primary/10 p-4 text-left' : 'rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/60'}><p className="font-semibold">{option.label}</p><p className="mt-1 text-xs text-muted-foreground">{option.summary}</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">{option.description}</p></button>; })}</div>
                    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">Archetyp und Essenz sind unabhängig: Ein mentaler Kämpfer oder technologischer Diplomat ist vollständig regelkonform.</div>
                  </section>
                </TabsContent>

                <TabsContent value="background" className="space-y-6">
                  <section className="space-y-4">
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Mechanischer Hintergrund</h3><p className="text-sm text-muted-foreground">Herkunft und soziale Einbindung deines Charakters. Keine Attributsboni, keine zusätzlichen Kräfte.</p></div><RuleHelp label="Hintergrund">Ein SagaDrive-Hintergrund enthält vier passende Fertigkeiten, Training in zwei davon, eine Spezialisierung, Milieuzugang, Kontakt und eine charakterbezogene Komplikation.</RuleHelp></div>
                    <div className="space-y-2"><Label htmlFor="background-name">Hintergrund</Label><Input id="background-name" value={backgroundName} onChange={(event) => setBackgroundName(event.target.value)} placeholder="z. B. Straßenarzt, Konzerntechnikerin, Grenzscout" /></div>
                    <div className="rounded-lg border border-border bg-muted/15 p-4"><p className="font-medium">Fertigkeitspool · 4 wählen</p><p className="mt-1 text-xs text-muted-foreground">Der Hintergrund definiert vier passende Fertigkeiten. Zwei davon werden trainiert.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{backgroundSkillPool.map((skill, index) => <Select key={index} value={skill} onValueChange={(value) => updateBackgroundPool(index, value)}><SelectTrigger aria-label={`Hintergrund-Fertigkeit ${index + 1}`}><SelectValue placeholder={`Fertigkeit ${index + 1}`} /></SelectTrigger><SelectContent>{sagaDriveSkillDefinitions.map((option) => <SelectItem key={option.key} value={option.key} disabled={backgroundSkillPool.some((current, currentIndex) => currentIndex !== index && current === option.key)}>{option.label}</SelectItem>)}</SelectContent></Select>)}</div></div>
                    <div className="rounded-lg border border-border bg-muted/15 p-4"><p className="font-medium">Training · 2 wählen</p><p className="mt-1 text-xs text-muted-foreground">Jede gewählte Fertigkeit erhält 1 der 10 Start-Fertigkeitspunkte.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{backgroundTraining.map((skill, index) => <Select key={index} value={skill} onValueChange={(value) => updateBackgroundTraining(index, value)} disabled={selectedBackgroundPool.length === 0}><SelectTrigger aria-label={`Hintergrund-Training ${index + 1}`}><SelectValue placeholder={`Training ${index + 1}`} /></SelectTrigger><SelectContent>{selectedBackgroundPool.map((skillKey) => <SelectItem key={skillKey} value={skillKey} disabled={backgroundTraining.some((current, currentIndex) => currentIndex !== index && current === skillKey)}>{getSagaDriveSkill(skillKey).label}</SelectItem>)}</SelectContent></Select>)}</div></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><div className="flex items-center gap-1"><Label htmlFor="specialization-skill">Spezialisierung</Label><RuleHelp label="Spezialisierung">Eine passende Spezialisierung gibt +2 auf eine Probe. Pro Probe gilt höchstens eine Spezialisierung. Die erste Spezialisierung benötigt Fertigkeitswert 1.</RuleHelp></div><Select value={specializationSkill} onValueChange={(value) => { if (isSagaDriveSkillKey(value)) setSpecializationSkill(value); }} disabled={selectedBackgroundTraining.length === 0}><SelectTrigger id="specialization-skill"><SelectValue placeholder="Fertigkeit wählen" /></SelectTrigger><SelectContent>{selectedBackgroundTraining.map((skillKey) => <SelectItem key={skillKey} value={skillKey}>{getSagaDriveSkill(skillKey).label}</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><Label htmlFor="specialization-name">Fachgebiet</Label><Input id="specialization-name" value={specializationName} onChange={(event) => setSpecializationName(event.target.value)} placeholder="z. B. Klettern" /></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><div className="flex items-center gap-1"><Label htmlFor="milieu">Milieuzugang</Label><RuleHelp label="Milieuzugang">Beschreibt ein Umfeld, in dem dein Charakter selbstverständlich Zugang, Orientierung oder soziale Anschlussfähigkeit besitzt. Es ist kein pauschaler Würfelbonus.</RuleHelp></div><Input id="milieu" value={milieuAccess} onChange={(event) => setMilieuAccess(event.target.value)} placeholder="z. B. Notaufnahmen, Unterwelt, Akademien" /></div>
                      <div className="space-y-2"><div className="flex items-center gap-1"><Label htmlFor="contact">Kontakt</Label><RuleHelp label="Kontakt">Ein Kontakt gibt Zugang, Information oder Ressourcen in seinem Bereich, aber keinen allgemeinen Würfelbonus.</RuleHelp></div><Input id="contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Wer kann dir helfen?" /></div>
                      <div className="space-y-2 sm:col-span-2"><div className="flex items-center gap-1"><Label htmlFor="complication">Komplikation</Label><RuleHelp label="Komplikation">Eine persönliche Schwierigkeit, die im Spiel echte Folgen haben kann. Wenn du eine klar benannte charakterbezogene Komplikation freiwillig akzeptierst, kannst du Drive zurückgewinnen.</RuleHelp></div><Input id="complication" value={complication} onChange={(event) => setComplication(event.target.value)} placeholder="z. B. alte Schulden, gesuchte Identität, schwierige Loyalität" /></div>
                      <div className="space-y-2 sm:col-span-2"><Label htmlFor="communication">Zusätzliche Sprache / Kommunikationsform</Label><Input id="communication" value={communication} onChange={(event) => setCommunication(event.target.value)} placeholder="z. B. Gebärdensprache, Handelssprache, Funkcodes" /></div>
                    </div>
                    {validationAttempted && !backgroundComplete && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">Für einen vollständigen Startcharakter brauchst du Hintergrundname, vier unterschiedliche Pool-Fertigkeiten, zwei Trainings, eine passende Spezialisierung, Milieuzugang, Kontakt, Komplikation und eine zusätzliche Kommunikationsform.</div>}
                  </section>
                  <Separator />
                  <section className="space-y-4"><div><h3 className="font-semibold">Hintergrundgeschichte</h3><p className="text-sm text-muted-foreground">Optionaler Lore-Teil. Die mechanischen Hintergrundwerte oben bleiben davon getrennt.</p></div><CharacterBackgroundComposer value={backgroundStory} context={loreContext} onChange={setBackgroundStory} /></section>
                  <details className="rounded-lg border border-border bg-muted/10 p-4"><summary className="cursor-pointer font-medium">Weitere Charakterdetails · optional</summary><div className="mt-5 space-y-5"><CharacterTraitEditor id="personality" label="Persönlichkeitsmerkmale" category="personality" values={personalityTraits} context={loreContext} onChange={setPersonalityTraits} /><CharacterTraitEditor id="ideals" label="Ideale" category="ideals" values={ideals} context={loreContext} onChange={setIdeals} /><CharacterTraitEditor id="bonds" label="Bindungen" category="bonds" values={bonds} context={loreContext} onChange={setBonds} /><CharacterTraitEditor id="flaws" label="Schwächen" category="flaws" values={flaws} context={loreContext} onChange={setFlaws} /></div></details>
                </TabsContent>

                <TabsContent value="values" className="space-y-6">
                  <div className="rounded-lg border border-border bg-muted/15 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">Standardverteilung</p><p className="text-sm text-muted-foreground">Verteile genau 4, 3, 3, 2, 2 und 1. Startwerte liegen zwischen 1 und 4.</p></div><Badge variant={attributeDistributionValid ? 'default' : 'destructive'}>{attributeDistributionValid ? 'Verteilung gültig' : 'Verteilung prüfen'}</Badge></div></div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{sagaDriveAttributeDefinitions.map((attribute) => <div key={attribute.key} className="rounded-lg border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-1"><p className="font-semibold">{attribute.label}</p><RuleHelp label={attribute.label}>{attribute.description}</RuleHelp></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{attribute.description}</p></div><Select value={String(attributes[attribute.key])} onValueChange={(value) => setAttribute(attribute.key, value)}><SelectTrigger className="w-20" aria-label={`${attribute.label} Wert`}><SelectValue /></SelectTrigger><SelectContent>{[1, 2, 3, 4].map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select></div></div>)}</div>
                  <Separator />
                  <div><div className="mb-3"><h3 className="font-semibold">Abgeleitete Werte</h3><p className="text-sm text-muted-foreground">Diese Werte werden aus Attributen, Fertigkeiten und Erfahrungsbonus berechnet und nicht direkt bearbeitet.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
                    { label: 'Gesundheit', value: String(health), help: '12 + 2 × Ausdauer + 2 × Erfahrungsbonus.' },
                    { label: 'Verteidigung', value: String(defense), help: '10 + Geschicklichkeit + Erfahrungsbonus + höherer Wert aus Nahkampf oder Akrobatik. Spezialisierungen zählen nicht.' },
                    { label: 'Initiative', value: `d20 + ${initiativeModifier}`, help: 'd20 + Wahrnehmung + Aufmerksamkeit + Erfahrungsbonus, wenn Aufmerksamkeit trainiert ist.' },
                    { label: 'Bewegung', value: `${movement} m`, help: overloaded ? 'Standard 9 m. Wegen Überlastung derzeit −3 m.' : 'Standardbewegung: 9 m pro Zug.' },
                    { label: 'Körperwiderstand', value: String(bodyResistance), help: '10 + Ausdauer + Erfahrungsbonus.' },
                    { label: 'Reflexwiderstand', value: String(reflexResistance), help: '10 + Geschicklichkeit + Erfahrungsbonus.' },
                    { label: 'Geistwiderstand', value: String(mindResistance), help: '10 + Verstand + Erfahrungsbonus.' },
                    { label: 'Manöverwiderstand', value: String(maneuverResistance), help: '10 + Erfahrungsbonus + höherer Wert aus Stärke + Athletik oder Geschicklichkeit + Akrobatik.' },
                    { label: 'Erholung', value: String(recovery), help: 'Ausdauer + Erfahrungsbonus.' },
                    { label: 'Traglast', value: String(carryCapacity), help: '5 + 2 × Stärke in Lastpunkten.' },
                  ].map((entry) => <div key={entry.label} className="rounded-lg border border-border bg-muted/15 p-3"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">{entry.label}</span><RuleHelp label={entry.label}>{entry.help}</RuleHelp></div><span className="text-lg font-semibold">{entry.value}</span></div></div>)}</div></div>
                </TabsContent>

                <TabsContent value="skills" className="space-y-5">{!archetype ? <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center"><p className="font-medium">Zuerst Primärarchetyp wählen</p><p className="mt-1 text-sm text-muted-foreground">Der Archetyp bestimmt, in welche vier typischen Fertigkeiten dein Archetyp-Punkt gelegt werden kann.</p><Button className="mt-4" variant="outline" onClick={() => setActiveTab('info')}>Zum Info-Tab</Button></div> : <CharacterSkillsPanel freeRanks={freeSkillRanks} onFreeRanksChange={setFreeSkillRanks} backgroundTrainedSkills={selectedBackgroundTraining} archetypeSkills={archetype.skills} archetypeTrainingSkill={archetypeTrainingSkill} onArchetypeTrainingSkillChange={setArchetypeTrainingSkill} specializationSkill={isSagaDriveSkillKey(specializationSkill) ? specializationSkill : undefined} specializationName={specializationName} />}</TabsContent>
                <TabsContent value="abilities" className="space-y-5"><CharacterAbilitiesPanel abilities={abilities} />{essence && <div className="rounded-lg border border-border bg-muted/15 p-4"><div className="flex items-center gap-2"><Badge variant="outline">Essenz</Badge><p className="font-medium">{essence.label}</p></div><p className="mt-2 text-sm text-muted-foreground">{essence.description}</p><p className="mt-3 text-xs text-muted-foreground">Die konkrete Rang-I-Essenzmanifestation wird hier ergänzt, sobald der verbindliche Core-Fähigkeitskatalog dafür vorliegt.</p></div>}</TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">Look ist kosmetisch</p><p className="mt-1 text-sm text-muted-foreground">Körperbau, Gesicht, Haare und Kleidung verändern keine Charakterwerte. Regelrelevante Wesenartmerkmale wählst du im Info-Tab.</p></div><Badge variant="outline">Keine Werte</Badge></div></div>
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
                <TabsContent value="notes" className="space-y-4"><div className="space-y-2"><Label htmlFor="notes">Notizen</Label><Textarea id="notes" rows={15} value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[400px]" placeholder="Freie Spielnotizen, offene Fragen, Ziele oder Erinnerungen ..." /></div><p className="text-xs text-muted-foreground">Notizen werden mit dem Charakter gespeichert und verändern keine Charakterwerte.</p></TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
