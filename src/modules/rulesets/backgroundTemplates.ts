import {
  getSagaDriveSkill,
  sagaDriveSkillDefinitions,
  type SagaDriveSkillKey,
} from './characterCreation';

export interface SagaDriveBackgroundSpecializationSuggestion {
  skillId: SagaDriveSkillKey;
  name: string;
}

export interface SagaDriveBackgroundTemplate {
  id: string;
  name: string;
  description: string;
  playstyle: string;
  skillPool: readonly [SagaDriveSkillKey, SagaDriveSkillKey, SagaDriveSkillKey, SagaDriveSkillKey];
  recommendedTraining: readonly [SagaDriveSkillKey, SagaDriveSkillKey];
  specializationSuggestions: readonly SagaDriveBackgroundSpecializationSuggestion[];
  milieuSuggestions: readonly string[];
  contactSuggestions: readonly string[];
  complicationSuggestions: readonly string[];
  communicationSuggestions?: readonly string[];
  /** Optional allow-list for world profiles. Missing means usable as a Core starter template. */
  worldProfileIds?: readonly string[];
}

export const sagaDriveBackgroundTemplates: readonly SagaDriveBackgroundTemplate[] = [
  {
    id: 'street-doctor',
    name: 'Straßenarzt',
    description: 'Versorgt Menschen dort, wo reguläre Hilfe zu spät kommt oder nicht erreichbar ist.',
    playstyle: 'Medizin · Menschen lesen · improvisiertes Überleben',
    skillPool: ['medicine', 'insight', 'survival', 'awareness'],
    recommendedTraining: ['medicine', 'insight'],
    specializationSuggestions: [
      { skillId: 'medicine', name: 'Notfallmedizin' },
      { skillId: 'medicine', name: 'Diagnose' },
      { skillId: 'insight', name: 'Stressreaktionen' },
    ],
    milieuSuggestions: ['Notaufnahmen', 'Untergrundkliniken', 'Rettungsdienste'],
    contactSuggestions: ['Erfahrene Chirurgin', 'Sanitäter im Nachtdienst', 'Apotheker mit guten Verbindungen'],
    complicationSuggestions: ['Alte Schulden', 'Behandlung der falschen Person', 'Verpflichtung gegenüber einer Klinik'],
    communicationSuggestions: ['Gebärdensprache', 'Medizinischer Fachjargon', 'Funkcodes des Rettungsdiensts'],
  },
  {
    id: 'border-scout',
    name: 'Grenzscout',
    description: 'Kennt abgelegene Wege, Gefahrenzonen und die Zeichen, die andere übersehen.',
    playstyle: 'Orientierung · Wachsamkeit · Bewegung · Distanz',
    skillPool: ['survival', 'awareness', 'athletics', 'ranged'],
    recommendedTraining: ['survival', 'awareness'],
    specializationSuggestions: [
      { skillId: 'survival', name: 'Navigation' },
      { skillId: 'survival', name: 'Spuren' },
      { skillId: 'awareness', name: 'Wachsamkeit' },
    ],
    milieuSuggestions: ['Grenzposten', 'Wildnisrouten', 'Schmugglerpfade'],
    contactSuggestions: ['Grenzwächter', 'Karawanenführerin', 'Lokaler Fährtenleser'],
    complicationSuggestions: ['Verbotene Route bekannt', 'Alte Grenzfehde', 'Gesuchter Reisegefährte'],
    communicationSuggestions: ['Handzeichen', 'Funkcodes', 'Regionale Handelssprache'],
  },
  {
    id: 'corporate-technician',
    name: 'Konzerntechniker',
    description: 'Hat Systeme gebaut, gewartet oder umgangen, die eigentlich niemand von außen verstehen soll.',
    playstyle: 'Technik · Analyse · Wissen · Präzision',
    skillPool: ['technology', 'investigation', 'knowledge', 'sleight'],
    recommendedTraining: ['technology', 'investigation'],
    specializationSuggestions: [
      { skillId: 'technology', name: 'Computer' },
      { skillId: 'technology', name: 'Sicherheitssysteme' },
      { skillId: 'investigation', name: 'Digitale Recherche' },
    ],
    milieuSuggestions: ['Forschungsabteilungen', 'Rechenzentren', 'Wartungszugänge'],
    contactSuggestions: ['Ehemalige Kollegin', 'Systemadministrator', 'Einkäufer mit Freigaben'],
    complicationSuggestions: ['Vertrauliche Daten mitgenommen', 'Vertragsbruch', 'Konzerninterne Beobachtung'],
    communicationSuggestions: ['Technischer Fachjargon', 'Wartungscodes', 'Maschinenprotokolle'],
  },
  {
    id: 'investigator',
    name: 'Ermittler',
    description: 'Rekonstruiert Abläufe, findet Widersprüche und weiß, welche Frage als Nächstes gestellt werden muss.',
    playstyle: 'Recherche · Beobachtung · Menschenkenntnis · Gespräch',
    skillPool: ['investigation', 'awareness', 'insight', 'persuasion'],
    recommendedTraining: ['investigation', 'awareness'],
    specializationSuggestions: [
      { skillId: 'investigation', name: 'Tatorte' },
      { skillId: 'investigation', name: 'Forensik' },
      { skillId: 'insight', name: 'Lügen erkennen' },
    ],
    milieuSuggestions: ['Behörden', 'Archive', 'Informationsnetzwerke'],
    contactSuggestions: ['Archivarin', 'Informant', 'Ehemaliger Partner'],
    complicationSuggestions: ['Offener Altfall', 'Falsche Beschuldigung', 'Unbequeme Wahrheit entdeckt'],
    communicationSuggestions: ['Verhörtechnik', 'Behördenjargon', 'Regionale Umgangssprache'],
  },
  {
    id: 'soldier',
    name: 'Soldat',
    description: 'Ist direkte Gefahr, klare Befehlslagen und körperliche Belastung gewohnt.',
    playstyle: 'Athletik · Nahkampf · Fernkampf · Druck',
    skillPool: ['athletics', 'melee', 'ranged', 'intimidation'],
    recommendedTraining: ['athletics', 'ranged'],
    specializationSuggestions: [
      { skillId: 'athletics', name: 'Kraftakt' },
      { skillId: 'ranged', name: 'Schusswaffen' },
      { skillId: 'intimidation', name: 'Autorität' },
    ],
    milieuSuggestions: ['Kasernen', 'Veteranennetzwerke', 'Sicherheitsdienste'],
    contactSuggestions: ['Ehemaliger Truppkamerad', 'Quartiermeisterin', 'Veteranenvertreter'],
    complicationSuggestions: ['Unerledigter Auftrag', 'Schwierige Befehlskette', 'Feind aus einem früheren Einsatz'],
    communicationSuggestions: ['Militärische Handzeichen', 'Funkdisziplin', 'Dienstsprache'],
  },
  {
    id: 'smuggler',
    name: 'Schmuggler',
    description: 'Bewegt Menschen und Waren durch Kontrollen, Grenzen und Situationen, die offiziell nicht existieren.',
    playstyle: 'Steuern · Täuschen · Heimlichkeit · Fingerfertigkeit',
    skillPool: ['driving', 'deception', 'stealth', 'sleight'],
    recommendedTraining: ['driving', 'deception'],
    specializationSuggestions: [
      { skillId: 'driving', name: 'Bodenfahrzeuge' },
      { skillId: 'deception', name: 'Falsche Identität' },
      { skillId: 'stealth', name: 'Urbane Tarnung' },
    ],
    milieuSuggestions: ['Häfen', 'Schwarzmarkt', 'Grenzübergänge'],
    contactSuggestions: ['Frachtvermittlerin', 'Bestochener Kontrolleur', 'Mechaniker ohne Fragen'],
    complicationSuggestions: ['Verlorene Lieferung', 'Offene Rechnung', 'Zwei Auftraggeber für dieselbe Ware'],
    communicationSuggestions: ['Händlercodes', 'Unterweltslang', 'Funkcodes'],
  },
];

export function validateSagaDriveBackgroundTemplate(template: SagaDriveBackgroundTemplate): string[] {
  const errors: string[] = [];
  const pool = new Set(template.skillPool);
  const knownSkills = new Set(sagaDriveSkillDefinitions.map((skill) => skill.key));

  if (template.skillPool.length !== 4 || pool.size !== 4) errors.push('skillPool must contain exactly four distinct skills');
  if (template.recommendedTraining.length !== 2 || new Set(template.recommendedTraining).size !== 2) errors.push('recommendedTraining must contain exactly two distinct skills');

  for (const skill of template.skillPool) {
    if (!knownSkills.has(skill)) errors.push(`unknown pool skill: ${skill}`);
  }
  for (const skill of template.recommendedTraining) {
    if (!pool.has(skill)) errors.push(`recommended training is outside pool: ${skill}`);
  }
  for (const suggestion of template.specializationSuggestions) {
    if (!pool.has(suggestion.skillId)) errors.push(`specialization skill is outside pool: ${suggestion.skillId}`);
    if (!getSagaDriveSkill(suggestion.skillId).specializations.includes(suggestion.name)) {
      errors.push(`unknown specialization for ${suggestion.skillId}: ${suggestion.name}`);
    }
  }

  return errors;
}

export function validateSagaDriveBackgroundTemplateCatalog(
  templates: readonly SagaDriveBackgroundTemplate[] = sagaDriveBackgroundTemplates,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const template of templates) {
    if (!template.id.trim()) errors.push('template id must not be empty');
    if (ids.has(template.id)) errors.push(`duplicate template id: ${template.id}`);
    ids.add(template.id);
    for (const error of validateSagaDriveBackgroundTemplate(template)) errors.push(`${template.id}: ${error}`);
  }
  return errors;
}

const catalogErrors = validateSagaDriveBackgroundTemplateCatalog();
if (catalogErrors.length > 0) throw new Error(`Invalid SagaDrive background template catalog: ${catalogErrors.join('; ')}`);

export function getSagaDriveBackgroundTemplate(id: string | null | undefined): SagaDriveBackgroundTemplate | undefined {
  if (!id) return undefined;
  return sagaDriveBackgroundTemplates.find((template) => template.id === id);
}

export function getSagaDriveBackgroundTemplatesForWorldProfile(worldProfileId?: string | null): readonly SagaDriveBackgroundTemplate[] {
  if (!worldProfileId) return sagaDriveBackgroundTemplates;
  return sagaDriveBackgroundTemplates.filter((template) => !template.worldProfileIds || template.worldProfileIds.includes(worldProfileId));
}
