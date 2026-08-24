import { useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { Eye, Plus, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import {
  CharacterStudioPanel,
  characterService,
  createCharacterStudioAvatar,
  getAvatarPresetForRace,
  normalizeAvatarModelUrl,
} from '../modules/characters';
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

const archetypeLabels: Record<string, string> = {
  fighter: 'Kämpfer',
  thinker: 'Denker',
  healer: 'Heiler',
  rebel: 'Rebell',
  diplomat: 'Diplomat',
};

const essenceLabels: Record<string, string> = {
  physical: 'Körperlich',
  mental: 'Mental',
  spiritual: 'Spirituell',
  practical: 'Paktbasiert',
  technological: 'Technologisch',
};

const settingLabels: Record<string, string> = {
  fantasy: 'Fantasy',
  real: 'Real',
  scifi: 'Sci-Fi',
};

export function CharacterEditor() {
  const [characterName, setCharacterName] = useState('');
  const [characterArchetype, setCharacterArchetype] = useState('');
  const [characterRace, setCharacterRace] = useState('');
  const [essenceProfile, setEssenceProfile] = useState('');
  const [setting, setSetting] = useState('');
  const [customSetting, setCustomSetting] = useState('');
  const [description, setDescription] = useState('');

  const [bodySize, setBodySize] = useState([50]);
  const [height, setHeight] = useState([50]);
  const [hairStyle, setHairStyle] = useState('short');
  const [hairColor, setHairColor] = useState('#000000');
  const [skinTone, setSkinTone] = useState('#F5E6D3');
  const [clothing, setClothing] = useState('casual');
  const [avatarModelUrl, setAvatarModelUrl] = useState('');

  const [strength, setStrength] = useState([10]);
  const [dexterity, setDexterity] = useState([10]);
  const [constitution, setConstitution] = useState([10]);
  const [intelligence, setIntelligence] = useState([10]);
  const [wisdom, setWisdom] = useState([10]);
  const [charisma, setCharisma] = useState([10]);
  const [level, setLevel] = useState(1);

  const [backgroundStory, setBackgroundStory] = useState('');
  const [personality, setPersonality] = useState('');
  const [ideals, setIdeals] = useState('');
  const [bonds, setBonds] = useState('');
  const [flaws, setFlaws] = useState('');
  const [notes, setNotes] = useState('');

  const [portraitUrl, setPortraitUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarPreset = getAvatarPresetForRace(characterRace);
  const normalizedAvatarModelUrl = normalizeAvatarModelUrl(avatarModelUrl);

  const getPreviewSubtitle = () => {
    if (!characterArchetype || !essenceProfile) {
      return 'Keine Details gewählt';
    }

    const archetypeLabel = archetypeLabels[characterArchetype] || characterArchetype;
    const essenceLabel = essenceLabels[essenceProfile] || essenceProfile;
    const settingLabel = setting === 'custom' ? customSetting : settingLabels[setting] || '';

    return `${archetypeLabel} ${essenceLabel}${settingLabel ? ` (${settingLabel})` : ''}`;
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Bitte wähle eine Bilddatei aus');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bild ist zu groß. Maximum 5MB');
      return;
    }

    setUploading(true);
    try {
      const url = await characterService.uploadPortrait(file);
      setPortraitUrl(url);
      toast.success('Bild erfolgreich hochgeladen');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCharacter = async () => {
    if (!characterName.trim()) {
      toast.error('Bitte gib einen Charakternamen ein');
      return;
    }

    if (!characterArchetype) {
      toast.error('Bitte wähle einen Archetyp');
      return;
    }

    if (!characterRace) {
      toast.error('Bitte wähle eine Rasse');
      return;
    }

    if (avatarModelUrl.trim() && !normalizedAvatarModelUrl) {
      toast.error('3D-Modell muss eine HTTPS-URL oder ein interner Pfad sein');
      return;
    }

    setSaving(true);

    try {
      trackActivity(`Character Editor: Charakter "${characterName}" wird gespeichert`);

      const avatar = createCharacterStudioAvatar({
        race: characterRace,
        hairStyle,
        clothing,
        hairColor,
        skinTone,
        modelUrl: normalizedAvatarModelUrl,
      });

      const savedCharacter = await characterService.createCharacter({
        name: characterName.trim(),
        description: description.trim(),
        class: characterArchetype,
        race: characterRace,
        level,
        background_story: backgroundStory.trim() || undefined,
        personality_traits: personality.trim() ? [personality.trim()] : undefined,
        ideals: ideals.trim() || undefined,
        bonds: bonds.trim() || undefined,
        flaws: flaws.trim() || undefined,
        appearance: {
          body_size: bodySize[0] ?? 50,
          height: height[0] ?? 50,
          face_features: 'default',
          hair_style: hairStyle,
          hair_color: avatar.colors.hair,
          skin_tone: avatar.colors.skin,
          clothing,
          avatar,
        },
        attributes: {
          strength: strength[0] ?? 10,
          dexterity: dexterity[0] ?? 10,
          constitution: constitution[0] ?? 10,
          intelligence: intelligence[0] ?? 10,
          wisdom: wisdom[0] ?? 10,
          charisma: charisma[0] ?? 10,
        },
        portrait_url: portraitUrl || undefined,
      });

      trackActivity(
        `Character Editor: Charakter "${characterName}" erfolgreich gespeichert (ID: ${savedCharacter.id})`,
      );
      toast.success('Charakter erfolgreich gespeichert!');
    } catch (error) {
      console.error('Character save error:', error);
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = (event: MouseEvent) => {
    event.stopPropagation();
    setPortraitUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-4 md:space-y-6">
        <div className="md:hidden">
          <h1 className="text-xl">Charakter Editor</h1>
          <p className="text-muted-foreground text-sm">Erstelle deinen Helden</p>
        </div>

        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1>Charakter Editor</h1>
            <p className="text-muted-foreground">
              Erstelle und passe deinen einzigartigen Charakter an
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => trackActivity('Character Editor: Vorschau angezeigt')}
            >
              <Eye className="w-4 h-4 mr-2" />
              Vorschau
            </Button>
            <Button
              variant="accent"
              onClick={handleSaveCharacter}
              disabled={saving || uploading}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        </div>

        <div className="md:hidden flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            size="sm"
            onClick={() => trackActivity('Character Editor: Vorschau angezeigt (Mobile)')}
          >
            <Eye className="w-4 h-4 mr-2" />
            Vorschau
          </Button>
          <Button
            variant="accent"
            className="flex-1"
            size="sm"
            onClick={handleSaveCharacter}
            disabled={saving || uploading}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Speichert...' : 'Speichern'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <Card className="hidden lg:block lg:col-span-1">
            <CardHeader>
              <CardTitle>Vorschau</CardTitle>
              <CardDescription>Charakter Visualisierung</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-4 relative cursor-pointer group overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors"
                onClick={handleImageClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {portraitUrl ? (
                  <>
                    <img
                      src={portraitUrl}
                      alt="Character Portrait"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleImageClick();
                        }}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Ändern
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRemoveImage}
                        disabled={uploading}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Entfernen
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground p-4">
                    {uploading ? (
                      <>
                        <div className="w-16 h-16 mx-auto mb-2 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm">Wird hochgeladen...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-16 h-16 mx-auto mb-2 group-hover:text-primary transition-colors" />
                        <p className="text-sm">Portrait als Fallback hochladen</p>
                        <p className="text-xs mt-1">PNG, JPG, WebP (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{characterName || 'Unbenannt'}</p>
                  <div className="achievement-badge px-3 py-1 rounded-full text-sm">Lvl {level}</div>
                </div>
                <p className="text-sm text-muted-foreground">{getPreviewSubtitle()}</p>
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Avatar-Preset</span>
                    <span className="font-medium">{avatarPreset}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">3D-Modell</span>
                    <span className="font-medium">
                      {normalizedAvatarModelUrl ? 'verknüpft' : 'noch nicht exportiert'}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="text-sm space-y-1">
                  <p>Stärke: {strength[0]}</p>
                  <p>Geschicklichkeit: {dexterity[0]}</p>
                  <p>Konstitution: {constitution[0]}</p>
                  <p>Intelligenz: {intelligence[0]}</p>
                  <p>Weisheit: {wisdom[0]}</p>
                  <p>Charisma: {charisma[0]}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Charakter Details</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Passe alle Eigenschaften an
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="basic">
                <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto gap-1">
                  <TabsTrigger value="basic" className="text-xs md:text-sm py-2 px-1 md:px-3">
                    Info
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="text-xs md:text-sm py-2 px-1 md:px-3">
                    Look
                  </TabsTrigger>
                  <TabsTrigger value="attributes" className="text-xs md:text-sm py-2 px-1 md:px-3">
                    Stats
                  </TabsTrigger>
                  <TabsTrigger value="abilities" className="text-xs md:text-sm py-2 px-1 md:px-3">
                    Skills
                  </TabsTrigger>
                  <TabsTrigger value="background" className="text-xs md:text-sm py-2 px-1 md:px-3">
                    BG
                  </TabsTrigger>
                  <TabsTrigger value="inventory" className="text-xs md:text-sm py-2 px-1 md:px-3">
                    Inv
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs md:text-sm py-2 px-1 md:px-3">
                    Notes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Charakter Name"
                        value={characterName}
                        onChange={(event) => setCharacterName(event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="level">Level</Label>
                      <Input
                        id="level"
                        type="number"
                        min="1"
                        max="20"
                        placeholder="1"
                        value={level}
                        onChange={(event) =>
                          setLevel(Math.max(1, Math.min(20, Number.parseInt(event.target.value, 10) || 1)))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Beschreibung</Label>
                    <Textarea
                      id="description"
                      placeholder="Beschreibe deinen Charakter..."
                      rows={4}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="archetype">Archetyp</Label>
                      <Select value={characterArchetype} onValueChange={setCharacterArchetype}>
                        <SelectTrigger id="archetype">
                          <SelectValue placeholder="Wähle Archetyp" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fighter">Kämpfer</SelectItem>
                          <SelectItem value="thinker">Denker</SelectItem>
                          <SelectItem value="healer">Heiler</SelectItem>
                          <SelectItem value="rebel">Rebell</SelectItem>
                          <SelectItem value="diplomat">Diplomat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="race">Rasse</Label>
                      <Select value={characterRace} onValueChange={setCharacterRace}>
                        <SelectTrigger id="race">
                          <SelectValue placeholder="Wähle Rasse" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="human">Mensch</SelectItem>
                          <SelectItem value="elf">Elf</SelectItem>
                          <SelectItem value="dwarf">Zwerg</SelectItem>
                          <SelectItem value="halfling">Halbling</SelectItem>
                          <SelectItem value="orc">Ork</SelectItem>
                          <SelectItem value="cyborg">Cyborg</SelectItem>
                          <SelectItem value="alien">Alien</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="setting">Setting</Label>
                      <Select
                        value={setting}
                        onValueChange={(value) => {
                          setSetting(value);
                          if (value !== 'custom') setCustomSetting('');
                        }}
                      >
                        <SelectTrigger id="setting">
                          <SelectValue placeholder="Wähle Setting" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fantasy">Fantasy</SelectItem>
                          <SelectItem value="real">Real</SelectItem>
                          <SelectItem value="scifi">Sci-Fi</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {setting === 'custom' && (
                      <div className="space-y-2">
                        <Label htmlFor="customSetting">Custom Setting</Label>
                        <Input
                          id="customSetting"
                          placeholder="Eigenes Setting eingeben..."
                          value={customSetting}
                          onChange={(event) => setCustomSetting(event.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="essenceProfile">Essenzprofil</Label>
                      <Select value={essenceProfile} onValueChange={setEssenceProfile}>
                        <SelectTrigger id="essenceProfile">
                          <SelectValue placeholder="Wähle Essenzprofil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="physical">Körperlich</SelectItem>
                          <SelectItem value="mental">Mental</SelectItem>
                          <SelectItem value="spiritual">Spirituell</SelectItem>
                          <SelectItem value="practical">Paktbasiert</SelectItem>
                          <SelectItem value="technological">Technologisch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="appearance" className="space-y-6">
                  <CharacterStudioPanel />

                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Label>Visuelles Avatar-Preset</Label>
                        <p className="text-xs text-muted-foreground">
                          Wird aus der Rasse abgeleitet, verändert aber keine Gameplay-Regel.
                        </p>
                      </div>
                      <code className="text-sm font-medium">{avatarPreset}</code>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Körperbau (Schlank ← → Kräftig)</Label>
                    <Slider value={bodySize} onValueChange={setBodySize} max={100} step={1} />
                    <p className="text-sm text-muted-foreground">Wert: {bodySize[0]}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Größe (Klein ← → Groß)</Label>
                    <Slider value={height} onValueChange={setHeight} max={100} step={1} />
                    <p className="text-sm text-muted-foreground">Wert: {height[0]}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hairColor">Haarfarbe</Label>
                      <div className="flex gap-2">
                        <Input
                          id="hairColor"
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(hairColor) ? hairColor : '#000000'}
                          onChange={(event) => setHairColor(event.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={hairColor}
                          onChange={(event) => setHairColor(event.target.value)}
                          placeholder="#000000"
                          aria-label="Haarfarbe als Hexwert"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skinTone">Hautfarbe</Label>
                      <div className="flex gap-2">
                        <Input
                          id="skinTone"
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(skinTone) ? skinTone : '#F5E6D3'}
                          onChange={(event) => setSkinTone(event.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          value={skinTone}
                          onChange={(event) => setSkinTone(event.target.value)}
                          placeholder="#F5E6D3"
                          aria-label="Hautfarbe als Hexwert"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hairStyle">Frisur</Label>
                      <Select value={hairStyle} onValueChange={setHairStyle}>
                        <SelectTrigger id="hairStyle">
                          <SelectValue placeholder="Wähle Frisur" />
                        </SelectTrigger>
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
                        <SelectTrigger id="clothing">
                          <SelectValue placeholder="Wähle Kleidung" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="robe">Robe</SelectItem>
                          <SelectItem value="armor">Rüstung</SelectItem>
                          <SelectItem value="leather">Leder</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="noble">Edel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatarModelUrl">Exportiertes 3D-Modell</Label>
                    <Input
                      id="avatarModelUrl"
                      type="url"
                      value={avatarModelUrl}
                      onChange={(event) => setAvatarModelUrl(event.target.value)}
                      placeholder="https://…/character.vrm oder /avatars/character.glb"
                      aria-describedby="avatarModelHelp"
                    />
                    <p id="avatarModelHelp" className="text-xs text-muted-foreground">
                      Optional. Hinterlege nach dem Export aus CharacterStudio eine HTTPS-URL oder einen internen Pfad.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="attributes" className="space-y-6">
                  <div className="space-y-2">
                    <Label>Stärke (STR)</Label>
                    <Slider value={strength} onValueChange={setStrength} max={20} min={1} step={1} />
                    <p className="text-sm text-muted-foreground">Wert: {strength[0]}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Geschicklichkeit (DEX)</Label>
                    <Slider value={dexterity} onValueChange={setDexterity} max={20} min={1} step={1} />
                    <p className="text-sm text-muted-foreground">Wert: {dexterity[0]}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Konstitution (CON)</Label>
                    <Slider value={constitution} onValueChange={setConstitution} max={20} min={1} step={1} />
                    <p className="text-sm text-muted-foreground">Wert: {constitution[0]}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Intelligenz (INT)</Label>
                    <Slider value={intelligence} onValueChange={setIntelligence} max={20} min={1} step={1} />
                    <p className="text-sm text-muted-foreground">Wert: {intelligence[0]}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Weisheit (WIS)</Label>
                    <Slider value={wisdom} onValueChange={setWisdom} max={20} min={1} step={1} />
                    <p className="text-sm text-muted-foreground">Wert: {wisdom[0]}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Charisma (CHA)</Label>
                    <Slider value={charisma} onValueChange={setCharisma} max={20} min={1} step={1} />
                    <p className="text-sm text-muted-foreground">Wert: {charisma[0]}</p>
                  </div>
                </TabsContent>

                <TabsContent value="abilities" className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-medium">Feuerball</p>
                        <p className="text-sm text-muted-foreground">Zauber - 10 Mana</p>
                      </div>
                      <Button size="sm" variant="destructive">
                        Entfernen
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Fähigkeit hinzufügen
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="background" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backgroundStory">Hintergrundgeschichte</Label>
                    <Textarea
                      id="backgroundStory"
                      placeholder="Die Geschichte deines Charakters..."
                      rows={6}
                      value={backgroundStory}
                      onChange={(event) => setBackgroundStory(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personality">Persönlichkeitsmerkmale</Label>
                    <Textarea
                      id="personality"
                      placeholder="Wie verhält sich dein Charakter?"
                      rows={3}
                      value={personality}
                      onChange={(event) => setPersonality(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ideals">Ideale</Label>
                    <Input
                      id="ideals"
                      placeholder="Was ist deinem Charakter wichtig?"
                      value={ideals}
                      onChange={(event) => setIdeals(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonds">Bindungen</Label>
                    <Input
                      id="bonds"
                      placeholder="Woran hängt dein Charakter?"
                      value={bonds}
                      onChange={(event) => setBonds(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flaws">Schwächen</Label>
                    <Input
                      id="flaws"
                      placeholder="Was sind die Fehler deines Charakters?"
                      value={flaws}
                      onChange={(event) => setFlaws(event.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Inventar (0/30)</Label>
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Hinzufügen
                      </Button>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                      {Array.from({ length: 30 }).map((_, index) => (
                        <div
                          key={index}
                          className="aspect-square bg-muted border-2 border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center"
                        >
                          <span className="text-xs text-muted-foreground opacity-50">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Währung</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['Gold', 'Silber', 'Kupfer', 'Platin'].map((currency) => {
                        const id = currency.toLowerCase();
                        return (
                          <div key={currency}>
                            <Label htmlFor={id} className="text-xs text-muted-foreground">
                              {currency}
                            </Label>
                            <Input
                              id={id}
                              type="number"
                              min="0"
                              placeholder="0"
                              defaultValue="0"
                              className="mt-1"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notizen</Label>
                    <Textarea
                      id="notes"
                      placeholder="Deine persönlichen Notizen zum Charakter..."
                      rows={15}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="min-h-[400px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Notizen bleiben aktuell lokal im Editor. Die Character-Tabelle hat dafür noch kein persistentes Feld.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
