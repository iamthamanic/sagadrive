export type SagaDriveNarrowResistanceHazardKey =
  | 'poison-toxins'
  | 'disease-infection'
  | 'radiation'
  | 'heat-burning'
  | 'cold-frostbite'
  | 'electricity'
  | 'acid-corrosives'
  | 'sound-shockwaves'
  | 'pressure-changes'
  | 'supernatural-changes';

export interface SagaDriveNarrowResistanceHazardOption {
  value: SagaDriveNarrowResistanceHazardKey;
  label: string;
  description: string;
}

export const sagaDriveNarrowResistanceHazardOptions: readonly SagaDriveNarrowResistanceHazardOption[] = [
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
    description: 'Überdruck, Unterdruck, große Tauchtiefen und Dekompression; Vakuum als dauerhaft bewohnbare Extremumwelt fällt unter Extremumwelt.',
  },
  {
    value: 'supernatural-changes',
    label: 'Übernatürliche Veränderungen',
    description: 'Übernatürliche Effekte, die Körper, Form oder grundlegende Natur verändern, etwa Verwandlung, Versteinerung, übernatürliche Mutation oder magisch beschleunigtes Altern. Keine allgemeine Magieresistenz, keine Illusionen und keine Gedankenkontrolle.',
  },
];

export function isSagaDriveNarrowResistanceHazardKey(value: string): value is SagaDriveNarrowResistanceHazardKey {
  return sagaDriveNarrowResistanceHazardOptions.some((option) => option.value === value);
}
