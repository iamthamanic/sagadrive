export type CharacterRulesetKey = 'sagadrive-core' | 'dnd-5.5e';

export type SagaDriveAttributeKey =
  | 'strength'
  | 'dexterity'
  | 'endurance'
  | 'mind'
  | 'perception'
  | 'charisma';

export type SagaDriveArchetypeKey = 'fighter' | 'thinker' | 'healer' | 'rebel' | 'diplomat';
export type SagaDriveEssenceKey = 'physical' | 'mental' | 'spiritual' | 'bound' | 'technological';
export type SagaDriveRaceKey = 'human' | 'elf' | 'dwarf' | 'halfling' | 'orc' | 'cyborg' | 'alien';
export type SagaDriveSkillKey =
  | 'athletics'
  | 'acrobatics'
  | 'sleight'
  | 'stealth'
  | 'melee'
  | 'ranged'
  | 'awareness'
  | 'insight'
  | 'survival'
  | 'investigation'
  | 'knowledge'
  | 'technology'
  | 'medicine'
  | 'driving'
  | 'persuasion'
  | 'deception'
  | 'intimidation'
  | 'performance';

export type SagaDriveSpeciesTraitKey =
  | 'sharpened-sense'
  | 'natural-weapon'
  | 'narrow-resistance'
  | 'environment-adaptation'
  | 'enduring-organism'
  | 'low-rest-need'
  | 'natural-protection'
  | 'enhanced-climbing'
  | 'enhanced-swimming'
  | 'amphibious'
  | 'enhanced-sight'
  | 'flight'
  | 'extreme-environment'
  | 'exceptional-body';

export interface CharacterCreationOption {
  value: string;
  label: string;
}

export interface SagaDriveRaceOption extends CharacterCreationOption {
  value: SagaDriveRaceKey;
  description: string;
}

export interface SagaDriveAttributeDefinition {
  key: SagaDriveAttributeKey;
  label: string;
  shortLabel: string;
  description: string;
}

export interface SagaDriveCoreAbilityDefinition {
  name: string;
  rank: 'I';
  actionType: 'Passiv' | 'Hauptaktion';
  description: string;
  effect: string;
}

export interface SagaDriveArchetypeOption extends CharacterCreationOption {
  value: SagaDriveArchetypeKey;
  summary: string;
  skills: readonly SagaDriveSkillKey[];
  coreAbility: SagaDriveCoreAbilityDefinition;
}

export interface SagaDriveEssenceOption extends CharacterCreationOption {
  value: SagaDriveEssenceKey;
  summary: string;
  description: string;
}

export interface SagaDriveSkillDefinition {
  key: SagaDriveSkillKey;
  label: string;
  attribute: SagaDriveAttributeKey;
  summary: string;
  excludes?: string;
  specializations: readonly string[];
}

export interface SagaDriveSpeciesTraitDefinition {
  key: SagaDriveSpeciesTraitKey;
  label: string;
  cost: 1 | 2 | 3;
  description: string;
  detailLabel?: string;
  detailPlaceholder?: string;
  detailRequired?: boolean;
  available?: boolean;
  unavailableReason?: string;
}

export const SAGA_DRIVE_START_ATTRIBUTE_ARRAY = [4, 3, 3, 2, 2, 1] as const;
export const SAGA_DRIVE_START_FREE_SKILL_POINTS = 7;
export const SAGA_DRIVE_START_TOTAL_SKILL_POINTS = 10;
export const SAGA_DRIVE_START_MIN_TRAINED_SKILLS = 6;
export const SAGA_DRIVE_START_SKILL_CAP = 3;
export const SAGA_DRIVE_EXPERIENCE_BONUS_LEVEL_1 = 1;
export const SAGA_DRIVE_SPECIES_TRAIT_BUDGET = 3;

export const characterRulesetOptions: readonly CharacterCreationOption[] = [
  { value: 'sagadrive-core', label: 'SagaDrive Core' },
  { value: 'dnd-5.5e', label: 'Dungeons & Dragons 5.5e' },
];

export const sagaDriveAttributeDefinitions: readonly SagaDriveAttributeDefinition[] = [
  { key: 'strength', label: 'Stärke', shortLabel: 'STÄ', description: 'Körperkraft, unmittelbare physische Leistung und Kraftübertragung.' },
  { key: 'dexterity', label: 'Geschicklichkeit', shortLabel: 'GES', description: 'Koordination, Präzision, Beweglichkeit und Reaktionskontrolle.' },
  { key: 'endurance', label: 'Ausdauer', shortLabel: 'AUS', description: 'Körperliche Widerstandsfähigkeit, Belastbarkeit und Durchhaltevermögen.' },
  { key: 'mind', label: 'Verstand', shortLabel: 'VER', description: 'Analyse, Wissen, Planung und methodische Problemlösung.' },
  { key: 'perception', label: 'Wahrnehmung', shortLabel: 'WAH', description: 'Aufmerksamkeit, Intuition, Orientierung und das Erkennen relevanter Details.' },
  { key: 'charisma', label: 'Charisma', shortLabel: 'CHA', description: 'Präsenz, Ausdruck, Einfluss und soziale Durchsetzung.' },
];

export const sagaDriveArchetypeOptions: readonly SagaDriveArchetypeOption[] = [
  {
    value: 'fighter', label: 'Kämpfer', summary: 'Konflikt · Schutz · Druck', skills: ['athletics', 'melee', 'ranged', 'intimidation'],
    coreAbility: { name: 'Kampfroutine', rank: 'I', actionType: 'Passiv', description: 'Du nutzt einen gelungenen Angriff oder ein Manöver sofort taktisch weiter.', effect: 'Einmal pro Zug nach einem erfolgreichen Angriff oder Kampfmanöver: +2 Schaden oder 1,5 m Bewegung ohne Gelegenheitsangriff.' },
  },
  {
    value: 'thinker', label: 'Denker', summary: 'Analyse · Planung · Systeme', skills: ['investigation', 'knowledge', 'technology', 'awareness'],
    coreAbility: { name: 'Analyse', rank: 'I', actionType: 'Hauptaktion', description: 'Du zerlegst ein Problem in verwertbare mechanische Informationen für die Gruppe.', effect: 'Ermitteln gegen Zielwert/Widerstand. Erfolg: eine mechanische Eigenschaft aufdecken und Vorteil für die nächste passende Probe eines Verbündeten. Kritisch: zusätzlich +1 Momentum, höchstens einmal pro Runde.' },
  },
  {
    value: 'healer', label: 'Heiler', summary: 'Versorgung · Stabilisierung · Fürsorge', skills: ['medicine', 'insight', 'knowledge', 'survival'],
    coreAbility: { name: 'Feldversorgung', rank: 'I', actionType: 'Hauptaktion', description: 'Du behandelst Verletzungen auch unter unmittelbarem Zeitdruck.', effect: 'Mit medizinischem Set: Medizin ZW 15. Erfolg heilt Erholung, kritischer Erfolg 2 × Erholung. Dasselbe Ziel höchstens einmal pro Szene.' },
  },
  {
    value: 'rebel', label: 'Rebell', summary: 'Infiltration · Beweglichkeit · Improvisation', skills: ['acrobatics', 'sleight', 'stealth', 'deception'],
    coreAbility: { name: 'Improvisation', rank: 'I', actionType: 'Passiv', description: 'Du kommst mit schlechtem Werkzeug und ungünstigen Umständen besser zurecht.', effect: 'Einmal pro Zug eine Nachteilsquelle ignorieren, wenn sie ausschließlich aus improvisierter Ausrüstung, ungünstiger körperlicher Position oder unvollständigem Werkzeug stammt.' },
  },
  {
    value: 'diplomat', label: 'Diplomat', summary: 'Einfluss · Führung · Koordination', skills: ['persuasion', 'insight', 'performance', 'intimidation'],
    coreAbility: { name: 'Koordination', rank: 'I', actionType: 'Passiv', description: 'Du koordinierst Verbündete auch auf Distanz, solange sinnvolle Kommunikation möglich ist.', effect: 'Helfen funktioniert auf sinnvoller Kommunikationsreichweite. Führt die unterstützte Handlung zu einem kritischen Erfolg, entsteht +1 Momentum, höchstens einmal pro Runde.' },
  },
];

export const sagaDriveRaceOptions: readonly SagaDriveRaceOption[] = [
  { value: 'human', label: 'Mensch', description: 'Vielseitige Standardspezies. Menschliche Speziesmerkmale bilden Sinne, Widerstandsfähigkeit, Anpassung und Ruhebedarf ab.' },
  { value: 'elf', label: 'Elf', description: 'Fein und beweglich im Erscheinungsbild. Zusätzlich zu den allgemeinen humanoiden Merkmalen sind erweitertes Klettern und besondere Sichtformen möglich.' },
  { value: 'dwarf', label: 'Zwerg', description: 'Kompakt und widerstandsfähig im Körperbau. Zusätzlich zu den allgemeinen humanoiden Merkmalen sind natürlicher Schutz und besondere Sichtformen möglich.' },
  { value: 'halfling', label: 'Halbling', description: 'Klein und beweglich im Profil. Der Merkmalszugang betont Sinne, Widerstandsfähigkeit, Anpassung, Ausdauer und erweitertes Klettern.' },
  { value: 'orc', label: 'Ork', description: 'Massiv und körperlich präsent. Der Merkmalszugang umfasst unter anderem natürliche Waffen, Schutz und robuste Anpassungen.' },
  { value: 'cyborg', label: 'Cyborg', description: 'Techno-biologische Mischform mit synthetischen Anteilen. Der Körper kann Schutz, besondere Sinne, Bewegungsanpassungen oder Extremumweltverträglichkeit besitzen.' },
  { value: 'alien', label: 'Alien', description: 'Freier Spezies-Builder für nicht-menschliche oder hybride Biologien. Das Speziesprofil wird frei benannt und kann den vollständigen Merkmalskatalog nutzen.' },
];

export const sagaDriveSettingOptions: readonly CharacterCreationOption[] = [
  { value: 'fantasy', label: 'Fantasy' }, { value: 'real', label: 'Gegenwart' }, { value: 'scifi', label: 'Sci-Fi' }, { value: 'custom', label: 'Eigenes Weltprofil' },
];

export const sagaDriveEssenceOptions: readonly SagaDriveEssenceOption[] = [
  { value: 'physical', label: 'Körperlich', summary: 'Körper · Training · Biologie', description: 'Besondere Wirkungen entstehen durch Körper, Biologie, Training oder körperliche Veränderung.' },
  { value: 'mental', label: 'Mental', summary: 'Geist · Fokus · Projektion', description: 'Besondere Wirkungen entstehen durch Geist, Fokus, Wahrnehmung oder mentale Projektion.' },
  { value: 'spiritual', label: 'Spirituell', summary: 'Seele · Glauben · Geister', description: 'Besondere Wirkungen entstehen durch Seele, Glauben, Geister oder metaphysische Verbindung.' },
  { value: 'bound', label: 'Gebunden', summary: 'Pakt · Artefakt · Spezies · externe Quelle', description: 'Besondere Wirkungen entstehen durch die Bindung an Spezies, Artefakte, Pakte, Begleiter oder andere externe Quellen.' },
  { value: 'technological', label: 'Technologisch', summary: 'Geräte · Systeme · Konstruktionen', description: 'Besondere Wirkungen entstehen durch Geräte, Systeme, Konstruktionen oder technische Veränderung.' },
];

export const sagaDriveSkillDefinitions: readonly SagaDriveSkillDefinition[] = [
  { key: 'athletics', label: 'Athletik', attribute: 'strength', summary: 'Klettern, Schwimmen, Springen, Sprinten und kontrollierte Kraftanwendung.', excludes: 'Balance und kontrollierte Landungen gehören zu Akrobatik.', specializations: ['Klettern', 'Schwimmen', 'Tauchen', 'Springen', 'Sprinten', 'Kraftakt', 'Rettung'] },
  { key: 'acrobatics', label: 'Akrobatik', attribute: 'dexterity', summary: 'Balance, kontrollierte Stürze, Landungen, Parkour und bewegliches Entkommen.', excludes: 'Kraftakte und Klettern gehören zu Athletik.', specializations: ['Balance', 'Parkour', 'Fallen', 'Entkommen', 'Luftakrobatik'] },
  { key: 'sleight', label: 'Fingerfertigkeit', attribute: 'dexterity', summary: 'Taschendiebstahl, Fingertricks, Verbergen kleiner Gegenstände und manuelle Präzision.', excludes: 'Technische Analyse, Konstruktion und Reparatur gehören zu Technik.', specializations: ['Taschendiebstahl', 'Schlösser', 'Tricks', 'Feinmechanik', 'Verbergen'] },
  { key: 'stealth', label: 'Heimlichkeit', attribute: 'dexterity', summary: 'Schleichen, Verstecken, Beschattung und unbemerkter Zugang.', specializations: ['Schleichen', 'Verstecken', 'Beschattung', 'Infiltration', 'Urbane Tarnung'] },
  { key: 'melee', label: 'Nahkampf', attribute: 'strength', summary: 'Nahkampfangriffe und aktive Kampfmanöver in unmittelbarer Reichweite.', excludes: 'Geschicklichkeit ersetzt Stärke nur bei Finesse oder ausdrücklicher Regel.', specializations: ['Unbewaffnet', 'Klingen', 'Stangenwaffen', 'Greifen', 'Entwaffnen'] },
  { key: 'ranged', label: 'Fernkampf', attribute: 'dexterity', summary: 'Gezielte Angriffe mit Projektilen, Wurfwaffen und direkt bedienten Distanzwaffen.', specializations: ['Bögen', 'Schusswaffen', 'Wurfwaffen', 'Energiewaffen'] },
  { key: 'awareness', label: 'Aufmerksamkeit', attribute: 'perception', summary: 'Hinterhalte, Geräusche, Bewegung und unmittelbare Veränderungen wahrnehmen.', excludes: 'Systematische Rekonstruktion und gezielte Recherche gehören zu Ermitteln.', specializations: ['Hinterhalte', 'Geräusche', 'Visuelle Suche', 'Wachsamkeit', 'Überwachung'] },
  { key: 'insight', label: 'Menschenkenntnis', attribute: 'perception', summary: 'Stimmung, Absicht, Motivation und soziale Dynamik einschätzen.', excludes: 'Menschenkenntnis ist keine Gedankenleserei.', specializations: ['Lügen erkennen', 'Verhandlungspartner', 'Gruppendynamik', 'Motivation', 'Stressreaktionen'] },
  { key: 'survival', label: 'Überleben', attribute: 'perception', summary: 'Navigation, Spuren, Nahrung, Wetter, Lager und sichere Routen.', specializations: ['Navigation', 'Spuren', 'Wildnis', 'Urbane Survival-Situationen', 'Wetter'] },
  { key: 'investigation', label: 'Ermitteln', attribute: 'mind', summary: 'Systematische Suche, Rekonstruktion, Recherche und Informationsgewinnung.', excludes: 'Zwingend notwendige Hinweise hängen nie ausschließlich an einer einzelnen Probe.', specializations: ['Tatorte', 'Archive', 'Digitale Recherche', 'Forensik', 'Befragungsanalyse'] },
  { key: 'knowledge', label: 'Wissen', attribute: 'mind', summary: 'Erlerntes Fachwissen abrufen, einordnen und auf bekannte Zusammenhänge anwenden.', specializations: ['Geschichte', 'Recht', 'Naturwissenschaften', 'Okkultes', 'Kulturen'] },
  { key: 'technology', label: 'Technik', attribute: 'mind', summary: 'Technische und mechanische Systeme bedienen, analysieren, reparieren, bauen oder umgehen.', specializations: ['Elektronik', 'Mechanik', 'Computer', 'Fahrzeuge', 'Robotik', 'Sicherheitssysteme'] },
  { key: 'medicine', label: 'Medizin', attribute: 'mind', summary: 'Diagnose, Stabilisierung, Behandlung, Chirurgie und biologische Gesundheitsversorgung.', excludes: 'Rein technische Spezies und Maschinen werden normalerweise mit Technik repariert.', specializations: ['Notfallmedizin', 'Chirurgie', 'Diagnose', 'Toxikologie', 'Psychiatrie'] },
  { key: 'driving', label: 'Steuern', attribute: 'dexterity', summary: 'Fahrzeuge, Reittiere oder Bewegungssysteme unter schwierigen Bedingungen kontrollieren.', excludes: 'Routinefahrt braucht keine Probe; Navigation verwendet andere passende Fertigkeiten.', specializations: ['Bodenfahrzeuge', 'Motorräder', 'Fluggeräte', 'Wasserfahrzeuge', 'Raumfahrzeuge', 'Reittiere'] },
  { key: 'persuasion', label: 'Überzeugen', attribute: 'charisma', summary: 'Ehrlicher sozialer Einfluss, Verhandlung, Führung und glaubwürdige Argumentation.', excludes: 'Überzeugen ist keine Gedankenkontrolle.', specializations: ['Verhandeln', 'Diplomatie', 'Führung', 'Verkauf', 'Vermittlung'] },
  { key: 'deception', label: 'Täuschen', attribute: 'charisma', summary: 'Lügen, Ablenkungen, falsche Darstellung und bewusste Irreführung.', excludes: 'Physische Fälschungen benötigen zusätzlich die passende praktische Fertigkeit.', specializations: ['Lügen', 'Verkleidung', 'Ablenkung', 'Falsche Identität', 'Betrug'] },
  { key: 'intimidation', label: 'Einschüchtern', attribute: 'charisma', summary: 'Drohung, Dominanz und glaubwürdig vermittelte Gefahr.', excludes: 'Kann niemanden zu offensichtlich selbstzerstörerischem Verhalten zwingen.', specializations: ['Verhör', 'Drohung', 'Körperliche Präsenz', 'Autorität', 'Psychologischer Druck'] },
  { key: 'performance', label: 'Auftreten', attribute: 'charisma', summary: 'Musik, Schauspiel, Rede, Tanz, Unterhaltung und öffentliche Inszenierung.', specializations: ['Musik', 'Schauspiel', 'Rede', 'Tanz', 'Comedy'] },
];

export const sagaDriveSpeciesTraitDefinitions: readonly SagaDriveSpeciesTraitDefinition[] = [
  { key: 'sharpened-sense', label: 'Geschärfter Sinn', cost: 1, description: 'Wähle einen Sinn. Du erhältst Vorteil auf Wahrnehmungsproben, bei denen dieser Sinn entscheidend ist.', detailLabel: 'Geschärfter Sinn', detailPlaceholder: 'z. B. Gehör, Geruch, Tastsinn', detailRequired: true },
  { key: 'natural-weapon', label: 'Natürliche Waffe', cost: 1, description: 'Unbewaffneter Schaden steigt von d4+1 auf d6+1. Die Form kann z. B. Klauen, Zähne oder Hörner sein.' },
  { key: 'narrow-resistance', label: 'Enge Resistenz', cost: 1, description: 'Wähle eine klar eingegrenzte Gefahrenart. Du erhältst Vorteil auf passende Proben und Widerstände gegen diese Gefahr.', detailLabel: 'Gefahrenart', detailPlaceholder: 'z. B. Gift, Krankheit, Strahlung', detailRequired: true },
  { key: 'environment-adaptation', label: 'Umweltanpassung', cost: 1, description: 'Wähle eine gewöhnliche Umgebung. Normale Nachteile, die ausschließlich aus dieser Umgebung entstehen, entfallen.', detailLabel: 'Umgebung', detailPlaceholder: 'z. B. Hochgebirge, Wüste, arktisches Klima', detailRequired: true },
  { key: 'enduring-organism', label: 'Ausdauernder Organismus', cost: 1, description: 'Du erhältst Vorteil auf Proben gegen langandauernde körperliche Erschöpfung.' },
  { key: 'low-rest-need', label: 'Geringer Ruhebedarf', cost: 1, description: 'Du benötigst nur die Hälfte der für deine Spezies üblichen Schlaf- oder Ruhezeit. Heilung und Erholung werden dadurch nicht beschleunigt.' },
  { key: 'natural-protection', label: 'Natürlicher Schutz', cost: 2, description: 'Du besitzt natürliche Schutzwirkung 1 nach den normalen Schutzregeln.' },
  { key: 'enhanced-climbing', label: 'Erweitertes Klettern', cost: 2, description: 'Beim Klettern kostet 1 Meter Bewegung nur 1 Meter statt 2 Meter. Schwierige Oberflächen, Gefahr oder Zeitdruck können weiterhin eine Athletikprobe verlangen.' },
  { key: 'enhanced-swimming', label: 'Erweitertes Schwimmen', cost: 2, description: 'Beim Schwimmen kostet 1 Meter Bewegung nur 1 Meter statt 2 Meter. Strömung, Gefahr oder andere schwierige Bedingungen können weiterhin eine Athletikprobe verlangen.' },
  { key: 'amphibious', label: 'Amphibisch', cost: 2, description: 'Du kannst an Land und unter Wasser normal atmen und leben. Normale Atemeinschränkungen durch Wasser entfallen.' },
  { key: 'enhanced-sight', label: 'Erweiterte Sicht', cost: 2, description: 'Wähle eine klar definierte besondere Sichtform. Sie gilt nur in ihrem festgelegten Anwendungsbereich.', detailLabel: 'Sichtform', detailPlaceholder: 'z. B. Dunkelsicht, Wärmesicht, Fernsicht', detailRequired: true },
  { key: 'flight', label: 'Flugfähig', cost: 3, description: 'Du besitzt eine natürliche Flugbewegung in Höhe deiner normalen Bewegungsrate.' },
  { key: 'extreme-environment', label: 'Extremumwelt', cost: 3, description: 'Wähle eine Extremumwelt. Du kannst dort ohne die normalerweise erforderlichen Schutzmittel überleben.', detailLabel: 'Extremumwelt', detailPlaceholder: 'z. B. Vakuum, extreme Kälte, toxische Atmosphäre', detailRequired: true },
  { key: 'exceptional-body', label: 'Außergewöhnlicher Körperbau', cost: 3, description: 'Stark abweichende Anatomie mit einer fest definierten mechanischen Wirkung. Die zulässigen Varianten werden noch festgelegt.', available: false, unavailableReason: 'Noch nicht verfügbar' },
];

const HUMAN_TRAITS: readonly SagaDriveSpeciesTraitKey[] = [
  'sharpened-sense',
  'narrow-resistance',
  'environment-adaptation',
  'enduring-organism',
  'low-rest-need',
];

export const sagaDriveSpeciesTraitKeysByRace: Readonly<Record<SagaDriveRaceKey, readonly SagaDriveSpeciesTraitKey[]>> = {
  human: HUMAN_TRAITS,
  elf: [...HUMAN_TRAITS, 'enhanced-climbing', 'enhanced-sight'],
  dwarf: [...HUMAN_TRAITS, 'natural-protection', 'enhanced-sight'],
  halfling: ['sharpened-sense', 'narrow-resistance', 'environment-adaptation', 'enduring-organism', 'enhanced-climbing'],
  orc: ['sharpened-sense', 'natural-weapon', 'narrow-resistance', 'environment-adaptation', 'enduring-organism', 'natural-protection', 'exceptional-body'],
  cyborg: ['sharpened-sense', 'natural-weapon', 'narrow-resistance', 'environment-adaptation', 'low-rest-need', 'natural-protection', 'enhanced-climbing', 'enhanced-swimming', 'enhanced-sight', 'extreme-environment', 'exceptional-body'],
  alien: sagaDriveSpeciesTraitDefinitions.map((trait) => trait.key),
};

export const dnd55ClassOptions: readonly CharacterCreationOption[] = [
  { value: 'barbarian', label: 'Barbarian' }, { value: 'bard', label: 'Bard' }, { value: 'cleric', label: 'Cleric' }, { value: 'druid', label: 'Druid' }, { value: 'fighter', label: 'Fighter' }, { value: 'monk', label: 'Monk' }, { value: 'paladin', label: 'Paladin' }, { value: 'ranger', label: 'Ranger' }, { value: 'rogue', label: 'Rogue' }, { value: 'sorcerer', label: 'Sorcerer' }, { value: 'warlock', label: 'Warlock' }, { value: 'wizard', label: 'Wizard' },
];

export const dnd55SpeciesOptions: readonly CharacterCreationOption[] = [
  { value: 'aasimar', label: 'Aasimar' }, { value: 'dragonborn', label: 'Dragonborn' }, { value: 'dwarf', label: 'Dwarf' }, { value: 'elf', label: 'Elf' }, { value: 'gnome', label: 'Gnome' }, { value: 'goliath', label: 'Goliath' }, { value: 'halfling', label: 'Halfling' }, { value: 'human', label: 'Human' }, { value: 'orc', label: 'Orc' }, { value: 'tiefling', label: 'Tiefling' },
];

export const dnd55BackgroundOptions: readonly CharacterCreationOption[] = [
  { value: 'acolyte', label: 'Acolyte' }, { value: 'artisan', label: 'Artisan' }, { value: 'charlatan', label: 'Charlatan' }, { value: 'criminal', label: 'Criminal' }, { value: 'entertainer', label: 'Entertainer' }, { value: 'farmer', label: 'Farmer' }, { value: 'guard', label: 'Guard' }, { value: 'guide', label: 'Guide' }, { value: 'hermit', label: 'Hermit' }, { value: 'merchant', label: 'Merchant' }, { value: 'noble', label: 'Noble' }, { value: 'sage', label: 'Sage' }, { value: 'sailor', label: 'Sailor' }, { value: 'scribe', label: 'Scribe' }, { value: 'soldier', label: 'Soldier' }, { value: 'wayfarer', label: 'Wayfarer' },
];

export function isCharacterRulesetKey(value: string): value is CharacterRulesetKey { return value === 'sagadrive-core' || value === 'dnd-5.5e'; }
export function isSagaDriveArchetypeKey(value: string): value is SagaDriveArchetypeKey { return sagaDriveArchetypeOptions.some((option) => option.value === value); }
export function isSagaDriveEssenceKey(value: string): value is SagaDriveEssenceKey { return sagaDriveEssenceOptions.some((option) => option.value === value); }
export function isSagaDriveRaceKey(value: string): value is SagaDriveRaceKey { return sagaDriveRaceOptions.some((option) => option.value === value); }
export function isSagaDriveSkillKey(value: string): value is SagaDriveSkillKey { return sagaDriveSkillDefinitions.some((skill) => skill.key === value); }
export function isSagaDriveSpeciesTraitKey(value: string): value is SagaDriveSpeciesTraitKey { return sagaDriveSpeciesTraitDefinitions.some((trait) => trait.key === value); }

export function getCharacterCreationOptionLabel(options: readonly CharacterCreationOption[], value: string): string { return options.find((option) => option.value === value)?.label ?? value; }
export function getSagaDriveArchetype(value: string): SagaDriveArchetypeOption | undefined { return sagaDriveArchetypeOptions.find((option) => option.value === value); }
export function getSagaDriveEssence(value: string): SagaDriveEssenceOption | undefined { return sagaDriveEssenceOptions.find((option) => option.value === value); }
export function getSagaDriveSkill(value: SagaDriveSkillKey): SagaDriveSkillDefinition { const skill = sagaDriveSkillDefinitions.find((definition) => definition.key === value); if (!skill) throw new Error(`Unknown SagaDrive skill: ${value}`); return skill; }
export function getSagaDriveAttribute(value: SagaDriveAttributeKey): SagaDriveAttributeDefinition { const attribute = sagaDriveAttributeDefinitions.find((definition) => definition.key === value); if (!attribute) throw new Error(`Unknown SagaDrive attribute: ${value}`); return attribute; }
export function getSagaDriveSpeciesTrait(value: SagaDriveSpeciesTraitKey): SagaDriveSpeciesTraitDefinition { const trait = sagaDriveSpeciesTraitDefinitions.find((definition) => definition.key === value); if (!trait) throw new Error(`Unknown SagaDrive species trait: ${value}`); return trait; }
export function getSagaDriveSpeciesTraitKeysForRace(value: string): readonly SagaDriveSpeciesTraitKey[] { return isSagaDriveRaceKey(value) ? sagaDriveSpeciesTraitKeysByRace[value] : []; }
export function getSagaDriveSpeciesTraitsForRace(value: string): readonly SagaDriveSpeciesTraitDefinition[] { const allowed = new Set(getSagaDriveSpeciesTraitKeysForRace(value)); return sagaDriveSpeciesTraitDefinitions.filter((trait) => allowed.has(trait.key)); }
export function getSagaDriveSpeciesTraitCost(values: readonly SagaDriveSpeciesTraitKey[]): number { return values.reduce((sum, key) => sum + getSagaDriveSpeciesTrait(key).cost, 0); }

export function createEmptySagaDriveSkillRanks(): Record<SagaDriveSkillKey, number> {
  return { athletics: 0, acrobatics: 0, sleight: 0, stealth: 0, melee: 0, ranged: 0, awareness: 0, insight: 0, survival: 0, investigation: 0, knowledge: 0, technology: 0, medicine: 0, driving: 0, persuasion: 0, deception: 0, intimidation: 0, performance: 0 };
}

/** Total attribute points available for standard distribution at a given character level. */
export function getSagaDriveAttributePointBudget(level: number): number {
  const normalizedLevel = Math.min(20, Math.max(1, Math.round(level)));
  const baseTotal = SAGA_DRIVE_START_ATTRIBUTE_ARRAY.reduce((sum, value) => sum + value, 0);
  const levelUpBonuses = (normalizedLevel >= 16 ? 2 : normalizedLevel >= 8 ? 1 : 0);
  return baseTotal + levelUpBonuses;
}