import { useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Camera, Eye, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  AvatarCanvas,
  characterService,
  createCharacterStudioAvatar,
  getAvatarRacePreset,
  getAvatarPresetForRace,
} from '../modules/characters';
import type { AbilityDto, CharacterLoreContext, ItemDto } from '../modules/characters';
import { CharacterAbilitiesPanel } from '../modules/characters/components/CharacterAbilitiesPanel';
import { CharacterBackgroundComposer } from '../modules/characters/components/CharacterBackgroundComposer';
import { CharacterInventoryPanel } from '../modules/characters/components/CharacterInventoryPanel';
import { CharacterTraitEditor } from '../modules/characters/components/CharacterTraitEditor';
import {
  characterRulesetOptions,
  dnd55BackgroundOptions,
  dnd55ClassOptions,
  dnd55SpeciesOptions,
  getCharacterCreationOptionLabel,
  isCharacterRulesetKey,
  sagaDriveArchetypeOptions,
  sagaDriveEssenceOptions,
  sagaDriveRaceOptions,
  sagaDriveSettingOptions,
  type CharacterRulesetKey,
} from '../modules/rulesets/characterCreation';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';

type ActivityTrackingWindow = Window & {
  trackActivity?: (description: string) => void;
};

const trackActivity = (description: string) => {
  if (typeof window === 'undefined') return;
  (window as ActivityTrackingWindow).trackActivity?.(description);
};

const initialAbilities: AbilityDto[] = [
  {
    id: 'starter-fireball',
    name: 'Feuerball',
    description: 'Ein konzentrierter Feuerzauber.',
    type: 'magic',
    cost: 10,
    effect: 'Feuerschaden',
  },
];

function clampLevel(value: string): number {
  return Math.max(1, Math.min(20, Number.parseInt(value, 10) || 1));
}

export function CharacterEditor() {
  const [characterName, setCharacterName] = useState('');
  const [ruleset, setRuleset] = useState<CharacterRulesetKey>('sagadrive-core');
  const [characterArchetype, setCharacterArchetype] = useState('');
  const [characterRace, setCharacterRace] = useState('human');
  const [dndBackground, setDndBackground] = useState('');
  const [essenceProfile, setEssenceProfile] = useState('');
  const [setting, setSetting] = useState('');
  const [customSetting, setCustomSetting] = useState('');
  const [description, setDescription] = useState('');

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

  const [strength, setStrength] = useState([10]);
  const [dexterity, setDexterity] = useState([10]);
  const [constitution, setConstitution] = useState([10]);
  const [intelligence, setIntelligence] = useState([10]);
  const [wisdom, setWisdom] = useState([10]);
  const [charisma, setCharisma] = useState([10]);
  const [level, setLevel] = useState(1);
  const [abilities, setAbilities] = useState<AbilityDto[]>(initialAbilities);
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

  const isDnd55 = ruleset === 'dnd-5.5e';
  const avatarPreset = getAvatarPresetForRace(characterRace);
  const currentAvatar = useMemo(
    () =>
      createCharacterStudioAvatar({
        race: characterRace,
        head: headStyle,
        ears,
        hairStyle,
        clothing,
        accessory: accessory === 'none' ? undefined : accessory,
        hairColor,
        skinTone,
        bodySize: bodySize[0] ?? 50,
        height: height[0] ?? 50,
      }),
    [
      accessory,
      bodySize,
      characterRace,
      clothing,
      ears,
      hairColor,
      hairStyle,
      headStyle,
      height,
      skinTone,
    ],
  );

  const loreContext = useMemo<CharacterLoreContext>(() => {
    const classLabel = characterArchetype
      ? getCharacterCreationOptionLabel(
          isDnd55 ? dnd55ClassOptions : sagaDriveArchetypeOptions,
          characterArchetype,
        )
      : '';
    const raceLabel = characterRace
      ? getCharacterCreationOptionLabel(
          isDnd55 ? dnd55SpeciesOptions : sagaDriveRaceOptions,
          characterRace,
        )
      : '';
    const settingLabel = !isDnd55
      ? setting === 'custom'
        ? customSetting.trim()
        : setting
          ? getCharacterCreationOptionLabel(sagaDriveSettingOptions, setting)
          : ''
      : '';
    const essenceLabel = !isDnd55 && essenceProfile
      ? getCharacterCreationOptionLabel(sagaDriveEssenceOptions, essenceProfile)
      : '';
    const backgroundLabel = isDnd55 && dndBackground
      ? getCharacterCreationOptionLabel(dnd55BackgroundOptions, dndBackground)
      : '';

    return {
      ruleset,
      name: characterName.trim(),
      description: description.trim(),
      characterClass: classLabel,
      raceOrSpecies: raceLabel,
      setting: settingLabel || undefined,
      essenceProfile: essenceLabel || undefined,
      dndBackground: backgroundLabel || undefined,
      level,
      attributes: {
        strength: strength[0] ?? 10,
        dexterity: dexterity[0] ?? 10,
        constitution: constitution[0] ?? 10,
        intelligence: intelligence[0] ?? 10,
        wisdom: wisdom[0] ?? 10,
        charisma: charisma[0] ?? 10,
      },
      abilities: abilities.map(({ name, description: abilityDescription, type, cost, effect }) => ({
        name,
        description: abilityDescription,
        type,
        cost,
        effect,
      })),
      inventory: inventory.map(({ name, description: itemDescription, type, quantity }) => ({
        name,
        description: itemDescription,
        type,
        quantity,
      })),
      appearance: {
        bodySize: currentAvatar.body.size,
        height: currentAvatar.body.height,
        face: currentAvatar.traits.head ?? headStyle,
        hairStyle: currentAvatar.traits.hair ?? hairStyle,
        hairColor: currentAvatar.colors.hair,
        skinTone: currentAvatar.colors.skin,
        clothing: currentAvatar.traits.clothing ?? clothing,
        accessory: currentAvatar.traits.accessory,
      },
      traits: {
        personality: personalityTraits,
        ideals,
        bonds,
        flaws,
      },
    };
  }, [
    abilities,
    bonds,
    characterArchetype,
    characterName,
    characterRace,
    charisma,
    clothing,
    constitution,
    currentAvatar,
    customSetting,
    description,
    dexterity,
    dndBackground,
    essenceProfile,
    flaws,
    hairStyle,
    ideals,
    intelligence,
    inventory,
    isDnd55,
    level,
    personalityTraits,
    ruleset,
    setting,
    strength,
    wisdom,
    headStyle,
  ]);

  const getPreviewSubtitle = () => {
    if (isDnd55) {
      const classLabel = characterArchetype
        ? getCharacterCreationOptionLabel(dnd55ClassOptions, characterArchetype)
        : '';
      const speciesLabel = characterRace
        ? getCharacterCreationOptionLabel(dnd55SpeciesOptions, characterRace)
        : '';
      const backgroundLabel = dndBackground
        ? getCharacterCreationOptionLabel(dnd55BackgroundOptions, dndBackground)
        : '';
      const details = [classLabel, speciesLabel, backgroundLabel].filter((value) => value.length > 0);
      return details.length > 0 ? details.join(', ') : 'Noch keine Details gewählt';
    }

    const archetypeLabel = characterArchetype
      ? getCharacterCreationOptionLabel(sagaDriveArchetypeOptions, characterArchetype)
      : '';
    const essenceLabel = essenceProfile
      ? getCharacterCreationOptionLabel(sagaDriveEssenceOptions, essenceProfile)
      : '';
    const settingLabel = setting === 'custom'
      ? customSetting.trim()
      : setting
        ? getCharacterCreationOptionLabel(sagaDriveSettingOptions, setting)
        : '';
    const details = [archetypeLabel, essenceLabel, settingLabel].filter((value) => value.length > 0);
    return details.length > 0 ? details.join(', ') : 'Noch keine Details gewählt';
  };

  const applyRacePreset = (race: string) => {
    const preset = getAvatarRacePreset(race);
    setCharacterRace(race);
    setBodySize([preset.bodySize]);
    setHeight([preset.height]);
    setHeadStyle(preset.head);
    setEars(preset.ears);
    setHairStyle(preset.hair);
    setHairColor(preset.hairColor);
    setSkinTone(preset.skinTone);
    setClothing(preset.clothing);
    setAccessory(preset.accessory ?? 'none');
  };

  const handleRulesetChange = (value: string) => {
    if (!isCharacterRulesetKey(value) || value === ruleset) return;

    setRuleset(value);
    setCharacterArchetype('');
    setDndBackground('');
    setSetting('');
    setCustomSetting('');
    setEssenceProfile('');
    applyRacePreset('human');
  };

  const uploadPortrait = async (file: File) => {
    setUploading(true);
    try {
      const url = await characterService.uploadPortrait(file);
      setPortraitUrl(url);
      toast.success('Portrait gespeichert');
    } catch (error) {
      console.error('Portrait upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Portrait konnte nicht gespeichert werden');
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wähle eine Bilddatei aus');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bild ist zu groß. Maximum 5 MB');
      return;
    }
    await uploadPortrait(file);
  };

  const handleGeneratePortrait = async () => {
    const canvas = avatarCanvasRef.current;
    if (!canvas) {
      toast.error('3D-Vorschau ist noch nicht bereit');
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/png', 0.92);
    });
    if (!blob) {
      toast.error('Portrait konnte nicht erzeugt werden');
      return;
    }

    const safeName = characterName.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'character';
    await uploadPortrait(new File([blob], `${safeName}-portrait.png`, { type: 'image/png' }));
  };

  const handleSaveCharacter = async () => {
    if (!characterName.trim()) {
      toast.error('Bitte gib einen Charakternamen ein');
      return;
    }
    if (!characterArchetype) {
      toast.error(isDnd55 ? 'Bitte wähle eine Klasse' : 'Bitte wähle einen Archetyp');
      return;
    }
    if (!characterRace) {
      toast.error(isDnd55 ? 'Bitte wähle eine Spezies' : 'Bitte wähle eine Rasse');
      return;
    }
    if (isDnd55 && !dndBackground) {
      toast.error('Bitte wähle einen Hintergrund');
      return;
    }

    setSaving(true);
    try {
      trackActivity(`Character Editor: Charakter "${characterName}" wird gespeichert`);
      const savedCharacter = await characterService.createCharacter({
        name: characterName.trim(),
        description: description.trim(),
        class: characterArchetype,
        race: characterRace,
        level,
        background_story: backgroundStory.trim() || undefined,
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
          avatar: currentAvatar,
        },
        attributes: {
          strength: strength[0] ?? 10,
          dexterity: dexterity[0] ?? 10,
          constitution: constitution[0] ?? 10,
          intelligence: intelligence[0] ?? 10,
          wisdom: wisdom[0] ?? 10,
          charisma: charisma[0] ?? 10,
        },
        abilities,
        inventory,
        portrait_url: portraitUrl || undefined,
      });

      trackActivity(`Character Editor: Charakter "${characterName}" gespeichert (ID: ${savedCharacter.id})`);
      toast.success('Charakter erfolgreich gespeichert');
    } catch (error) {
      console.error('Character save error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = (event: MouseEvent) => {
    event.stopPropagation();
    setPortraitUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const attributeSliders = [
    { label: 'Stärke (STR)', value: strength, onValueChange: setStrength },
    { label: 'Geschicklichkeit (DEX)', value: dexterity, onValueChange: setDexterity },
    { label: 'Konstitution (CON)', value: constitution, onValueChange: setConstitution },
    { label: 'Intelligenz (INT)', value: intelligence, onValueChange: setIntelligence },
    { label: 'Weisheit (WIS)', value: wisdom, onValueChange: setWisdom },
    { label: 'Charisma (CHA)', value: charisma, onValueChange: setCharisma },
  ];

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-4 p-4 md:space-y-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl">Charakter Editor</h1>
            <p className="text-sm text-muted-foreground">Baue deinen Charakter direkt in der Live-Vorschau.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => trackActivity('Character Editor: Vorschau fokussiert')}>
              <Eye className="mr-2 h-4 w-4" />
              Vorschau
            </Button>
            <Button onClick={handleSaveCharacter} disabled={saving || uploading}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          <Card className="lg:sticky lg:top-4 lg:col-span-1 lg:self-start">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="truncate text-base md:text-lg" title={characterName || 'Unbenannt'}>
                  {characterName || 'Unbenannt'}
                </CardTitle>
                <div className="achievement-badge shrink-0 rounded-full px-3 py-1 text-sm">Lvl {level}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-[4/5] overflow-hidden rounded-lg border border-border bg-[#0B1220] shadow-inner">
                <AvatarCanvas avatar={currentAvatar} canvasRef={avatarCanvasRef} />
              </div>

              <p className="text-sm text-muted-foreground">{getPreviewSubtitle()}</p>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">{isDnd55 ? 'Spezies' : 'Rasse'}</p>
                  <p className="mt-1 font-medium">
                    {characterRace
                      ? getCharacterCreationOptionLabel(
                          isDnd55 ? dnd55SpeciesOptions : sagaDriveRaceOptions,
                          characterRace,
                        )
                      : 'Neutral'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avatar-Preset</p>
                  <p className="mt-1 font-medium">{avatarPreset}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Button variant="outline" onClick={handleGeneratePortrait} disabled={uploading}>
                  <Camera className="mr-2 h-4 w-4" />
                  Portrait erzeugen
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  Portrait hochladen
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {portraitUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-border p-2">
                  <img src={portraitUrl} alt="Portrait-Fallback" className="h-14 w-14 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Portrait-Fallback</p>
                    <p className="truncate text-xs text-muted-foreground">Für Library, Token und ältere Ansichten</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleRemoveImage} aria-label="Portrait entfernen">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Separator />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <p>STR {strength[0]}</p>
                <p>DEX {dexterity[0]}</p>
                <p>CON {constitution[0]}</p>
                <p>INT {intelligence[0]}</p>
                <p>WIS {wisdom[0]}</p>
                <p>CHA {charisma[0]}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Charakter Details</CardTitle>
              <CardDescription className="text-xs md:text-sm">Änderungen am Look erscheinen sofort links.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic">
                <TabsList className="grid h-auto w-full grid-cols-4 gap-1 md:grid-cols-7">
                  <TabsTrigger value="basic" className="px-1 py-2 text-xs md:px-3 md:text-sm">Info</TabsTrigger>
                  <TabsTrigger value="appearance" className="px-1 py-2 text-xs md:px-3 md:text-sm">Look</TabsTrigger>
                  <TabsTrigger value="attributes" className="px-1 py-2 text-xs md:px-3 md:text-sm">Stats</TabsTrigger>
                  <TabsTrigger value="abilities" className="px-1 py-2 text-xs md:px-3 md:text-sm">Skills</TabsTrigger>
                  <TabsTrigger value="background" className="px-1 py-2 text-xs md:px-3 md:text-sm">BG</TabsTrigger>
                  <TabsTrigger value="inventory" className="px-1 py-2 text-xs md:px-3 md:text-sm">Inv</TabsTrigger>
                  <TabsTrigger value="notes" className="px-1 py-2 text-xs md:px-3 md:text-sm">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Charakter Name" value={characterName} onChange={(event) => setCharacterName(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="level">Level</Label>
                      <Input id="level" type="number" min="1" max="20" value={level} onChange={(event) => setLevel(clampLevel(event.target.value))} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea id="description" placeholder="Beschreibe deinen Charakter..." rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ruleset">Regelset</Label>
                    <Select value={ruleset} onValueChange={handleRulesetChange}>
                      <SelectTrigger id="ruleset"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {characterRulesetOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {isDnd55
                        ? 'D&D 5.5e nutzt Klasse, Spezies und Hintergrund. Setting und Essenzprofil werden hier nicht verwendet.'
                        : 'SagaDrive Core nutzt Archetyp, Rasse, Setting und Essenzprofil.'}
                    </p>
                  </div>

                  {isDnd55 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="dnd-class">Klasse</Label>
                        <Select value={characterArchetype} onValueChange={setCharacterArchetype}>
                          <SelectTrigger id="dnd-class"><SelectValue placeholder="Wähle Klasse" /></SelectTrigger>
                          <SelectContent>
                            {dnd55ClassOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dnd-species">Spezies</Label>
                        <Select value={characterRace} onValueChange={applyRacePreset}>
                          <SelectTrigger id="dnd-species"><SelectValue placeholder="Wähle Spezies" /></SelectTrigger>
                          <SelectContent>
                            {dnd55SpeciesOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Spezies ohne eigenes 3D-Preset verwenden vorerst den neutralen Humanoid-Fallback.</p>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="dnd-background">Hintergrund</Label>
                        <Select value={dndBackground} onValueChange={setDndBackground}>
                          <SelectTrigger id="dnd-background"><SelectValue placeholder="Wähle Hintergrund" /></SelectTrigger>
                          <SelectContent>
                            {dnd55BackgroundOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="archetype">Archetyp</Label>
                        <Select value={characterArchetype} onValueChange={setCharacterArchetype}>
                          <SelectTrigger id="archetype"><SelectValue placeholder="Wähle Archetyp" /></SelectTrigger>
                          <SelectContent>
                            {sagaDriveArchetypeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="race">Rasse</Label>
                        <Select value={characterRace} onValueChange={applyRacePreset}>
                          <SelectTrigger id="race"><SelectValue placeholder="Wähle Rasse" /></SelectTrigger>
                          <SelectContent>
                            {sagaDriveRaceOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Setzt nur visuelle Startwerte. Die Gameplay-Rasse bleibt separat gespeichert.</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="setting">Setting</Label>
                        <Select value={setting} onValueChange={(value) => { setSetting(value); if (value !== 'custom') setCustomSetting(''); }}>
                          <SelectTrigger id="setting"><SelectValue placeholder="Wähle Setting" /></SelectTrigger>
                          <SelectContent>
                            {sagaDriveSettingOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {setting === 'custom' && (
                        <div className="space-y-2">
                          <Label htmlFor="customSetting">Custom Setting</Label>
                          <Input id="customSetting" value={customSetting} onChange={(event) => setCustomSetting(event.target.value)} placeholder="Eigenes Setting" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="essenceProfile">Essenzprofil</Label>
                        <Select value={essenceProfile} onValueChange={setEssenceProfile}>
                          <SelectTrigger id="essenceProfile"><SelectValue placeholder="Wähle Essenzprofil" /></SelectTrigger>
                          <SelectContent>
                            {sagaDriveEssenceOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Label>Race Preset</Label>
                        <p className="text-xs text-muted-foreground">CharacterStudio-kompatibler Look-State ohne iframe oder Web3-Abhängigkeiten.</p>
                      </div>
                      <code className="text-sm font-medium">{avatarPreset}</code>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Körperbau</Label>
                      <Slider aria-label="Körperbau" value={bodySize} onValueChange={setBodySize} min={0} max={100} step={1} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>0</span><span>Wert: {bodySize[0]}</span><span>100</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Größe</Label>
                      <Slider aria-label="Größe" value={height} onValueChange={setHeight} min={0} max={100} step={1} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>0</span><span>Wert: {height[0]}</span><span>100</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="headStyle">Gesicht</Label>
                      <Select value={headStyle} onValueChange={setHeadStyle}>
                        <SelectTrigger id="headStyle"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="human-balanced">Ausgewogen</SelectItem>
                          <SelectItem value="elf-angular">Fein / kantig</SelectItem>
                          <SelectItem value="dwarf-broad">Breit</SelectItem>
                          <SelectItem value="halfling-soft">Weich</SelectItem>
                          <SelectItem value="orc-heavy">Massiv</SelectItem>
                          <SelectItem value="cyborg-angular">Synthetisch</SelectItem>
                          <SelectItem value="alien-oval">Oval</SelectItem>
                          <SelectItem value="neutral-soft">Neutral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ears">Ohren</Label>
                      <Select value={ears} onValueChange={setEars}>
                        <SelectTrigger id="ears"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="round">Rund</SelectItem>
                          <SelectItem value="elf-long">Elfisch lang</SelectItem>
                          <SelectItem value="orc-pointed">Orkisch spitz</SelectItem>
                          <SelectItem value="synthetic">Synthetisch</SelectItem>
                          <SelectItem value="none">Keine sichtbar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hairStyle">Frisur</Label>
                      <Select value={hairStyle} onValueChange={setHairStyle}>
                        <SelectTrigger id="hairStyle"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Kurz</SelectItem>
                          <SelectItem value="long">Lang</SelectItem>
                          <SelectItem value="bald">Kahl</SelectItem>
                          <SelectItem value="braided">Geflochten</SelectItem>
                          <SelectItem value="wild">Wild</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clothing">Kleidung</Label>
                      <Select value={clothing} onValueChange={setClothing}>
                        <SelectTrigger id="clothing"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="robe">Robe</SelectItem>
                          <SelectItem value="armor">Rüstung</SelectItem>
                          <SelectItem value="leather">Leder</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="noble">Edel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accessory">Accessoire</Label>
                      <Select value={accessory} onValueChange={setAccessory}>
                        <SelectTrigger id="accessory"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Keins</SelectItem>
                          <SelectItem value="optic-implant">Optik-Implantat</SelectItem>
                          <SelectItem value="earring">Ohrring</SelectItem>
                          <SelectItem value="scar">Narbe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hairColor">Haarfarbe</Label>
                      <div className="flex gap-2">
                        <Input id="hairColor" type="color" value={/^#[0-9a-fA-F]{6}$/.test(hairColor) ? hairColor : '#000000'} onChange={(event) => setHairColor(event.target.value)} className="h-10 w-20" />
                        <Input value={hairColor} onChange={(event) => setHairColor(event.target.value)} aria-label="Haarfarbe als Hexwert" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skinTone">Hautfarbe</Label>
                      <div className="flex gap-2">
                        <Input id="skinTone" type="color" value={/^#[0-9a-fA-F]{6}$/.test(skinTone) ? skinTone : '#F5E6D3'} onChange={(event) => setSkinTone(event.target.value)} className="h-10 w-20" />
                        <Input value={skinTone} onChange={(event) => setSkinTone(event.target.value)} aria-label="Hautfarbe als Hexwert" />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attributes" className="space-y-6">
                  {attributeSliders.map(({ label, value, onValueChange }) => (
                    <div className="space-y-2" key={label}>
                      <Label>{label}</Label>
                      <Slider aria-label={label} value={value} onValueChange={onValueChange} max={20} min={1} step={1} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>1</span><span>Wert: {value[0]}</span><span>20</span>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="abilities">
                  <CharacterAbilitiesPanel abilities={abilities} onChange={setAbilities} />
                </TabsContent>

                <TabsContent value="background" className="space-y-5">
                  <CharacterBackgroundComposer
                    value={backgroundStory}
                    context={loreContext}
                    onChange={setBackgroundStory}
                  />
                  <CharacterTraitEditor
                    id="personality"
                    label="Persönlichkeitsmerkmale"
                    category="personality"
                    values={personalityTraits}
                    context={loreContext}
                    onChange={setPersonalityTraits}
                  />
                  <CharacterTraitEditor
                    id="ideals"
                    label="Ideale"
                    category="ideals"
                    values={ideals}
                    context={loreContext}
                    onChange={setIdeals}
                  />
                  <CharacterTraitEditor
                    id="bonds"
                    label="Bindungen"
                    category="bonds"
                    values={bonds}
                    context={loreContext}
                    onChange={setBonds}
                  />
                  <CharacterTraitEditor
                    id="flaws"
                    label="Schwächen"
                    category="flaws"
                    values={flaws}
                    context={loreContext}
                    onChange={setFlaws}
                  />
                </TabsContent>

                <TabsContent value="inventory">
                  <CharacterInventoryPanel items={inventory} onChange={setInventory} />
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notizen</Label>
                    <Textarea id="notes" rows={15} value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-[400px]" />
                  </div>
                  <p className="text-xs text-muted-foreground">Notizen bleiben aktuell lokal im Editor, da die Character-Tabelle noch kein persistentes Notizfeld hat.</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
