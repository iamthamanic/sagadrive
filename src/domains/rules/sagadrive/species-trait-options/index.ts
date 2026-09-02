import type { SagaDriveSpeciesTraitKey } from '../character-creation';

export type SagaDriveSpeciesTraitOptionKey =
  | 'sense-sight'
  | 'sense-hearing'
  | 'sense-smell-chemical'
  | 'sense-touch'
  | 'poison-toxins'
  | 'disease-infection'
  | 'radiation'
  | 'heat-burning'
  | 'cold-frostbite'
  | 'electricity'
  | 'acid-corrosives'
  | 'sound-shockwaves'
  | 'pressure-changes'
  | 'supernatural-changes'
  | 'heat-dryness'
  | 'cold-snow'
  | 'tropics-humidity'
  | 'high-altitude-thin-air'
  | 'underground-caves'
  | 'swamp-wetlands'
  | 'darkvision'
  | 'thermal-vision'
  | 'long-range-vision'
  | 'vacuum-anoxia'
  | 'extreme-cold'
  | 'extreme-heat'
  | 'extreme-pressure-deep-sea'
  | 'toxic-atmosphere'
  | 'high-radiation';

export interface SagaDriveSpeciesTraitOption {
  value: SagaDriveSpeciesTraitOptionKey;
  label: string;
  description: string;
}

export interface SagaDriveSpeciesTraitOptionCatalog {
  label: string;
  placeholder: string;
  helpIntro: string;
  options: readonly SagaDriveSpeciesTraitOption[];
}

const SHARPENED_SENSE_OPTIONS: readonly SagaDriveSpeciesTraitOption[] = [
  {
    value: 'sense-sight',
    label: 'Sehen',
    description: 'Vorteil auf Wahrnehmungschecks, bei denen sichtbare Details entscheidend sind. Dies verleiht keine Dunkelsicht oder andere neue Sichtform.',
  },
  {
    value: 'sense-hearing',
    label: 'Hören',
    description: 'Vorteil auf Wahrnehmungschecks, bei denen Geräusche entscheidend sind. Dies verleiht keine Echoortung.',
  },
  {
    value: 'sense-smell-chemical',
    label: 'Geruch / chemische Wahrnehmung',
    description: 'Vorteil beim Wahrnehmen von Gerüchen, Spuren und wahrnehmbaren chemischen Eigenschaften. Dies ist keine Analyse unbekannter Stoffe ohne passende Fertigkeit.',
  },
  {
    value: 'sense-touch',
    label: 'Tastsinn',
    description: 'Vorteil, wenn Berührung, Oberflächenstruktur, Druck oder unmittelbar übertragene Vibration entscheidend ist. Dies verleiht keinen Fernsinn durch Boden oder Wände.',
  },
];

export const sagaDriveNarrowResistanceHazardOptions: readonly SagaDriveSpeciesTraitOption[] = [
  {
    value: 'poison-toxins',
    label: 'Gift / Toxine',
    description: 'Gifte, Toxine, Tiergifte und giftige Gase.',
  },
  {
    value: 'disease-infection',
    label: 'Krankheit / Infektion',
    description: 'Viren, Bakterien, Parasiten, Seuchen und vergleichbare Infektionen.',
  },
  {
    value: 'radiation',
    label: 'Strahlung',
    description: 'Ionisierende oder settingtypische physikalische Strahlung; nicht pauschal Magie.',
  },
  {
    value: 'heat-burning',
    label: 'Hitze / Verbrennung',
    description: 'Feuer, extreme Hitze und Verbrennungen, unabhängig davon, ob die Quelle natürlich, technisch oder magisch ist.',
  },
  {
    value: 'cold-frostbite',
    label: 'Kälte / Erfrierung',
    description: 'Extreme Kälte, Frost, Unterkühlung und Erfrierungen.',
  },
  {
    value: 'electricity',
    label: 'Elektrizität',
    description: 'Stromschläge, elektrische Entladungen und Blitze, unabhängig von ihrer Quelle.',
  },
  {
    value: 'acid-corrosives',
    label: 'Säure / Ätzstoffe',
    description: 'Säuren, Laugen und andere korrosive oder ätzende Stoffe.',
  },
  {
    value: 'sound-shockwaves',
    label: 'Schall / Druckwellen',
    description: 'Extreme Lautstärke, Schockwellen und vergleichbare impulsartige Druckbelastungen.',
  },
  {
    value: 'pressure-changes',
    label: 'Druckveränderungen',
    description: 'Überdruck, Unterdruck, große Tauchtiefen und Dekompression; dauerhaftes Überleben in Extremdruck fällt unter Extremumwelt.',
  },
  {
    value: 'supernatural-changes',
    label: 'Übernatürliche Veränderungen',
    description: 'Übernatürliche Effekte, die Körper, Form oder grundlegende Natur verändern, etwa Verwandlung, Versteinerung, übernatürliche Mutation oder magisch beschleunigtes Altern. Keine allgemeine Magieresistenz, keine Illusionen und keine Gedankenkontrolle.',
  },
];

const ENVIRONMENT_ADAPTATION_OPTIONS: readonly SagaDriveSpeciesTraitOption[] = [
  {
    value: 'heat-dryness',
    label: 'Hitze & Trockenheit',
    description: 'Gewöhnliche Belastungen trockener Hitze, Wüsten und Steppen verursachen keine normalen umgebungsbedingten Nachteile. Extreme Hitze bleibt davon unberührt.',
  },
  {
    value: 'cold-snow',
    label: 'Kälte & Schnee',
    description: 'Gewöhnliche Belastungen kalter Klimazonen, Schnee und Winter verursachen keine normalen umgebungsbedingten Nachteile. Extreme Kälte bleibt davon unberührt.',
  },
  {
    value: 'tropics-humidity',
    label: 'Tropen & hohe Luftfeuchtigkeit',
    description: 'Gewöhnliche Belastungen tropischer Hitze und hoher Luftfeuchtigkeit verursachen keine normalen umgebungsbedingten Nachteile.',
  },
  {
    value: 'high-altitude-thin-air',
    label: 'Hochgebirge & dünne Luft',
    description: 'Gewöhnliche Belastungen großer Höhe und dünner Luft verursachen keine normalen umgebungsbedingten Nachteile. Sauerstofflose Extremumgebungen bleiben davon unberührt.',
  },
  {
    value: 'underground-caves',
    label: 'Unterirdisch & Höhlen',
    description: 'Gewöhnliche Belastungen langer Aufenthalte unter Tage, etwa Enge, Staub oder feuchte Höhlenbedingungen, verursachen keine normalen umgebungsbedingten Nachteile. Sichtregeln ändern sich nicht.',
  },
  {
    value: 'swamp-wetlands',
    label: 'Sumpf & Feuchtgebiet',
    description: 'Gewöhnliche Belastungen durch dauerhafte Nässe, Schlamm und feuchte Lebensräume verursachen keine normalen umgebungsbedingten Nachteile.',
  },
];

const ENHANCED_SIGHT_OPTIONS: readonly SagaDriveSpeciesTraitOption[] = [
  {
    value: 'darkvision',
    label: 'Dunkelsicht',
    description: 'Natürliche Dunkelheit allein verursacht keinen Nachteil auf visuelle Wahrnehmung. Feste optische Hindernisse und ausdrücklich übernatürliche Dunkelheit bleiben wirksam.',
  },
  {
    value: 'thermal-vision',
    label: 'Wärmesicht',
    description: 'Wärmequellen und Temperaturunterschiede können unabhängig von sichtbarem Licht wahrgenommen werden. Farben, Schrift und feste Hindernisse werden dadurch nicht sichtbar.',
  },
  {
    value: 'long-range-vision',
    label: 'Fernsicht',
    description: 'Für die Frage, ob visuelle Details aufgrund ihrer Entfernung erkannt werden können, wird die Entfernung als halbiert behandelt.',
  },
];

const EXTREME_ENVIRONMENT_OPTIONS: readonly SagaDriveSpeciesTraitOption[] = [
  {
    value: 'vacuum-anoxia',
    label: 'Vakuum & Sauerstofflosigkeit',
    description: 'Du kannst ohne Atemluft und ohne den normalerweise erforderlichen Schutz gegen fehlenden atmosphärischen Druck überleben. Andere Extrembedingungen bleiben getrennt.',
  },
  {
    value: 'extreme-cold',
    label: 'Extreme Kälte',
    description: 'Du kannst in extrem niedrigen Umgebungstemperaturen ohne die normalerweise erforderlichen Schutzmittel überleben.',
  },
  {
    value: 'extreme-heat',
    label: 'Extreme Hitze',
    description: 'Du kannst in extrem hohen Umgebungstemperaturen ohne die normalerweise erforderlichen Schutzmittel überleben.',
  },
  {
    value: 'extreme-pressure-deep-sea',
    label: 'Extremdruck / Tiefsee',
    description: 'Du kannst unter extremem Umgebungsdruck ohne die normalerweise erforderlichen Druckschutzmittel überleben. Wasseratmung wird dadurch nicht automatisch verliehen.',
  },
  {
    value: 'toxic-atmosphere',
    label: 'Toxische Atmosphäre',
    description: 'Du kannst in einer für normale Lebewesen nicht atembaren oder dauerhaft toxischen Atmosphäre ohne die normalerweise erforderlichen Atemschutzmittel überleben.',
  },
  {
    value: 'high-radiation',
    label: 'Hohe Strahlung',
    description: 'Du kannst in einer dauerhaft hochradioaktiven oder vergleichbar strahlungsbelasteten Umgebung ohne den normalerweise erforderlichen Strahlenschutz überleben.',
  },
];

export const sagaDriveSpeciesTraitOptionCatalogs: Readonly<Partial<Record<SagaDriveSpeciesTraitKey, SagaDriveSpeciesTraitOptionCatalog>>> = {
  'sharpened-sense': {
    label: 'Sinn',
    placeholder: 'Sinn wählen',
    helpIntro: 'Geschärfter Sinn verbessert einen vorhandenen natürlichen Sinn. Er verleiht keine neue Sinnesart wie Dunkelsicht, Echoortung oder einen Fernsinn durch feste Flächen.',
    options: SHARPENED_SENSE_OPTIONS,
  },
  'narrow-resistance': {
    label: 'Gefahrenart',
    placeholder: 'Gefahrenart wählen',
    helpIntro: 'Entscheidend ist die konkrete Wirkung, nicht ihre Quelle. Magisches Feuer zählt zum Beispiel als Hitze / Verbrennung. Eine allgemeine Resistenz gegen „Magie“ gibt es nicht.',
    options: sagaDriveNarrowResistanceHazardOptions,
  },
  'environment-adaptation': {
    label: 'Umgebung',
    placeholder: 'Umgebung wählen',
    helpIntro: 'Umweltanpassung entfernt normale Nachteile einer gewöhnlichen Lebensumgebung. Sie gibt keinen Vorteil gegen einzelne Schadens- oder Gefahrwirkungen und ersetzt keine Extremumwelt.',
    options: ENVIRONMENT_ADAPTATION_OPTIONS,
  },
  'enhanced-sight': {
    label: 'Sichtform',
    placeholder: 'Sichtform wählen',
    helpIntro: 'Erweiterte Sicht verleiht eine klar abgegrenzte zusätzliche Sehfähigkeit. Sie ist stärker als Geschärfter Sinn: Sehen und gilt nur im beschriebenen Anwendungsbereich.',
    options: ENHANCED_SIGHT_OPTIONS,
  },
  'extreme-environment': {
    label: 'Extremumwelt',
    placeholder: 'Extremumwelt wählen',
    helpIntro: 'Extremumwelt erlaubt dauerhaftes Überleben in genau einer extremen Umgebung ohne die normalerweise erforderlichen Schutzmittel. Enge Resistenz schützt dagegen nur bei passenden Checks und Widerständen gegen einzelne Gefahrenwirkungen.',
    options: EXTREME_ENVIRONMENT_OPTIONS,
  },
};

const LEGACY_OPTION_ALIASES: Readonly<Partial<Record<SagaDriveSpeciesTraitKey, Readonly<Record<string, SagaDriveSpeciesTraitOptionKey>>>>> = {
  'sharpened-sense': {
    sehen: 'sense-sight',
    sicht: 'sense-sight',
    gehoer: 'sense-hearing',
    hören: 'sense-hearing',
    hoeren: 'sense-hearing',
    geruch: 'sense-smell-chemical',
    geruchssinn: 'sense-smell-chemical',
    tastsinn: 'sense-touch',
  },
  'environment-adaptation': {
    wueste: 'heat-dryness',
    wüste: 'heat-dryness',
    steppe: 'heat-dryness',
    'arktisches klima': 'cold-snow',
    tundra: 'cold-snow',
    tropen: 'tropics-humidity',
    dschungel: 'tropics-humidity',
    hochgebirge: 'high-altitude-thin-air',
    höhle: 'underground-caves',
    hoehle: 'underground-caves',
    höhlen: 'underground-caves',
    hoehlen: 'underground-caves',
    sumpf: 'swamp-wetlands',
  },
  'enhanced-sight': {
    dunkelsicht: 'darkvision',
    wärmesicht: 'thermal-vision',
    waermesicht: 'thermal-vision',
    fernsicht: 'long-range-vision',
  },
  'extreme-environment': {
    vakuum: 'vacuum-anoxia',
    'extreme kälte': 'extreme-cold',
    'extreme kaelte': 'extreme-cold',
    'extreme hitze': 'extreme-heat',
    tiefsee: 'extreme-pressure-deep-sea',
    'toxische atmosphäre': 'toxic-atmosphere',
    'toxische atmosphaere': 'toxic-atmosphere',
    'hohe strahlung': 'high-radiation',
  },
};

function normalizeLookupValue(value: string): string {
  return value.trim().toLocaleLowerCase('de-DE');
}

export function getSagaDriveSpeciesTraitOptionCatalog(trait: SagaDriveSpeciesTraitKey): SagaDriveSpeciesTraitOptionCatalog | undefined {
  return sagaDriveSpeciesTraitOptionCatalogs[trait];
}

export function isSagaDriveSpeciesTraitOptionKeyForTrait(
  trait: SagaDriveSpeciesTraitKey,
  value: string,
): value is SagaDriveSpeciesTraitOptionKey {
  const catalog = getSagaDriveSpeciesTraitOptionCatalog(trait);
  return Boolean(catalog?.options.some((option) => option.value === value));
}

export function normalizeSagaDriveSpeciesTraitOptionKey(
  trait: SagaDriveSpeciesTraitKey,
  value: string,
): SagaDriveSpeciesTraitOptionKey | undefined {
  const normalized = normalizeLookupValue(value);
  const catalog = getSagaDriveSpeciesTraitOptionCatalog(trait);
  if (!catalog) return undefined;

  const direct = catalog.options.find(
    (option) => option.value === value || normalizeLookupValue(option.label) === normalized,
  );
  if (direct) return direct.value;

  return LEGACY_OPTION_ALIASES[trait]?.[normalized];
}
