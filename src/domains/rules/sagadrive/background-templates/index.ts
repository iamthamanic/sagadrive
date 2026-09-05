import {
  getSagaDriveSkill,
  sagaDriveSkillDefinitions,
  type SagaDriveSkillKey,
} from '../character-creation';

export interface SagaDriveBackgroundSpecializationSuggestion {
  skillId: SagaDriveSkillKey;
  name: string;
}

/**
 * A Core background framework is a setting-neutral scaffold for a character's past.
 * The persisted character background remains the concrete biography; the framework
 * supplies a four-skill pool and world-facing prompts. Training choices stay neutral
 * and are made by the player; recommendations belong to the Build-Assistent layer.
 */
export interface SagaDriveBackgroundTemplate {
  id: string;
  name: string;
  description: string;
  playstyle: string;
  examples: readonly string[];
  skillPool: readonly [SagaDriveSkillKey, SagaDriveSkillKey, SagaDriveSkillKey, SagaDriveSkillKey];
  specializationSuggestions: readonly SagaDriveBackgroundSpecializationSuggestion[];
  milieuSuggestions: readonly string[];
  contactSuggestions: readonly string[];
  complicationSuggestions: readonly string[];
  communicationSuggestions?: readonly string[];
  /** Optional allow-list for world profiles. Missing means universally available as a Core framework. */
  worldProfileIds?: readonly string[];
}

export const sagaDriveBackgroundTemplates: readonly SagaDriveBackgroundTemplate[] = [
  {
    id: 'stage-public',
    name: 'Bühne & Öffentlichkeit',
    description: 'Du bist es gewohnt, vor Menschen aufzutreten, Aufmerksamkeit zu lenken oder öffentlich Wirkung zu erzeugen.',
    playstyle: 'Auftreten · Einfluss · Menschen lesen · Inszenierung',
    examples: ['Barde', 'Schauspielerin', 'Influencer', 'Holostar'],
    skillPool: ['performance', 'persuasion', 'insight', 'deception'],
    specializationSuggestions: [
      { skillId: 'performance', name: 'Musik' },
      { skillId: 'performance', name: 'Rede' },
      { skillId: 'persuasion', name: 'Verkauf' },
      { skillId: 'performance', name: 'Schauspiel' },
      { skillId: 'persuasion', name: 'Verhandeln' },
    ],
    milieuSuggestions: ['Bühnen & Veranstaltungsorte', 'Medienkreise', 'Öffentliche Treffpunkte'],
    contactSuggestions: ['Produzentin oder Mäzen', 'Kollegin aus der Szene', 'Veranstalter oder Agent'],
    complicationSuggestions: ['Öffentlicher Ruf', 'Rivalität', 'Vertragliche Verpflichtung'],
    communicationSuggestions: ['Bühnensprache', 'Regie- oder Produktionscodes', 'Szeneslang'],
  },
  {
    id: 'sport-competition',
    name: 'Sport & Wettkampf',
    description: 'Du hast Körper, Technik und Nerven im Training, in Wettkämpfen oder unter Leistungsdruck geschult.',
    playstyle: 'Athletik · Bewegung · Wachsamkeit · Präsenz',
    examples: ['Gladiatorin', 'Profiboxer', 'Pro-Bender', 'Null-G-Racer'],
    skillPool: ['athletics', 'acrobatics', 'awareness', 'performance'],
    specializationSuggestions: [
      { skillId: 'athletics', name: 'Sprinten' },
      { skillId: 'athletics', name: 'Kraftakt' },
      { skillId: 'acrobatics', name: 'Balance' },
      { skillId: 'athletics', name: 'Klettern' },
      { skillId: 'acrobatics', name: 'Parkour' },
    ],
    milieuSuggestions: ['Trainingsstätten', 'Arenen & Wettbewerbe', 'Vereine oder Teams'],
    contactSuggestions: ['Trainerin', 'Ehemaliger Teamkamerad', 'Rivalin mit Respekt'],
    complicationSuggestions: ['Alte Verletzung', 'Öffentliche Rivalität', 'Verpflichtung gegenüber einem Team'],
    communicationSuggestions: ['Teamzeichen', 'Wettkampfjargon', 'Taktische Kurzbefehle'],
  },
  {
    // Legacy id retained so saved characters continue to resolve their source framework.
    id: 'border-scout',
    name: 'Natur & Wildnis',
    description: 'Du bist durch Natur, abgelegene Regionen oder ein Leben außerhalb dichter gesellschaftlicher Strukturen geprägt.',
    playstyle: 'Überleben · Wachsamkeit · Bewegung · Distanz',
    examples: ['Jäger', 'Nomadin', 'Farmer', 'Kolonist'],
    skillPool: ['survival', 'awareness', 'athletics', 'ranged'],
    specializationSuggestions: [
      { skillId: 'survival', name: 'Navigation' },
      { skillId: 'survival', name: 'Spuren' },
      { skillId: 'awareness', name: 'Wachsamkeit' },
      { skillId: 'survival', name: 'Wildnis' },
      { skillId: 'awareness', name: 'Hinterhalte' },
    ],
    milieuSuggestions: ['Wildnis & Randgebiete', 'Ländliche Siedlungen', 'Abgelegene Routen oder Kolonien'],
    contactSuggestions: ['Fährtenleserin', 'Nachbar oder Familienmitglied', 'Routenführerin'],
    complicationSuggestions: ['Revierkonflikt', 'Umweltbedrohung', 'Verantwortung für eine abgelegene Gemeinschaft'],
    communicationSuggestions: ['Handzeichen', 'Jagd- oder Wegzeichen', 'Regionale Sprache'],
  },
  {
    id: 'academy-research',
    name: 'Akademie & Forschung',
    description: 'Du hast gelernt, Wissen systematisch zu erwerben, Fragen zu untersuchen und Erkenntnisse nachvollziehbar zu begründen.',
    playstyle: 'Wissen · Recherche · Beobachtung · Argumentation',
    examples: ['Gelehrter', 'Magieschülerin', 'Wissenschaftler', 'Xenobiologin'],
    skillPool: ['knowledge', 'investigation', 'awareness', 'persuasion'],
    specializationSuggestions: [
      { skillId: 'knowledge', name: 'Naturwissenschaften' },
      { skillId: 'investigation', name: 'Archive' },
      { skillId: 'persuasion', name: 'Vermittlung' },
      { skillId: 'knowledge', name: 'Geschichte' },
      { skillId: 'investigation', name: 'Tatorte' },
    ],
    milieuSuggestions: ['Akademien & Schulen', 'Archive & Bibliotheken', 'Forschungsstätten'],
    contactSuggestions: ['Mentorin', 'Fachkollege', 'Archivarin oder Laborleitung'],
    complicationSuggestions: ['Umstrittene Theorie', 'Ethischer Konflikt', 'Verlorene oder gestohlene Forschung'],
    communicationSuggestions: ['Akademischer Fachjargon', 'Quellen- und Zitierkonventionen', 'Fachsprache'],
  },
  {
    // Legacy id retained for Konzerntechniker characters.
    id: 'corporate-technician',
    name: 'Handwerk & Technik',
    description: 'Du hast gelernt, Werkzeuge, Maschinen oder gebaute Systeme praktisch zu verstehen, herzustellen, zu warten oder zu umgehen.',
    playstyle: 'Technik · Analyse · Wissen · Präzision',
    examples: ['Schmied', 'Mechanikerin', 'Techniker', 'Raumschiffingenieurin'],
    skillPool: ['technology', 'investigation', 'knowledge', 'sleight'],
    specializationSuggestions: [
      { skillId: 'technology', name: 'Mechanik' },
      { skillId: 'technology', name: 'Sicherheitssysteme' },
      { skillId: 'sleight', name: 'Feinmechanik' },
      { skillId: 'technology', name: 'Elektronik' },
      { skillId: 'investigation', name: 'Tatorte' },
    ],
    milieuSuggestions: ['Werkstätten', 'Bau- oder Produktionsstätten', 'Wartungszugänge'],
    contactSuggestions: ['Meisterin oder Ausbilder', 'Zulieferer', 'Ehemalige Kollegin'],
    complicationSuggestions: ['Fehlerhafte Konstruktion', 'Offene Materialschuld', 'Geschütztes oder verbotenes Wissen'],
    communicationSuggestions: ['Technischer Fachjargon', 'Werkstattzeichen', 'Wartungs- oder Maschinenprotokolle'],
  },
  {
    // Legacy id retained for Straßenarzt characters.
    id: 'street-doctor',
    name: 'Heilung & Fürsorge',
    description: 'Du hast gelernt, Verletzte, Kranke oder Schutzbedürftige zu versorgen und unter Druck Verantwortung für andere zu übernehmen.',
    playstyle: 'Medizin · Menschen lesen · Überleben · Wachsamkeit',
    examples: ['Kräuterheilerin', 'Sanitäter', 'Ärztin', 'Cyberdoc'],
    skillPool: ['medicine', 'insight', 'survival', 'awareness'],
    specializationSuggestions: [
      { skillId: 'medicine', name: 'Notfallmedizin' },
      { skillId: 'medicine', name: 'Diagnose' },
      { skillId: 'insight', name: 'Stressreaktionen' },
      { skillId: 'medicine', name: 'Chirurgie' },
      { skillId: 'insight', name: 'Lügen erkennen' },
    ],
    milieuSuggestions: ['Heilstätten & Kliniken', 'Rettungs- oder Hilfsdienste', 'Orte informeller Versorgung'],
    contactSuggestions: ['Erfahrene Heilerin oder Chirurgin', 'Sanitäter oder Pflegerin', 'Versorger mit guten Verbindungen'],
    complicationSuggestions: ['Alte Schuld', 'Behandlung der falschen Person', 'Verpflichtung gegenüber Schutzbedürftigen'],
    communicationSuggestions: ['Gebärdensprache', 'Medizinischer Fachjargon', 'Rettungs- oder Einsatzcodes'],
  },
  {
    // Legacy id retained for Soldat characters.
    id: 'soldier',
    name: 'Militär & Wachdienst',
    description: 'Du bist klare Befehlslagen, organisierte Gefahrenabwehr und körperliche Belastung im Dienst einer Gruppe oder Institution gewohnt.',
    playstyle: 'Athletik · Nahkampf · Fernkampf · Druck',
    examples: ['Legionär', 'Stadtwache', 'Soldatin', 'Stationssicherheit'],
    skillPool: ['athletics', 'melee', 'ranged', 'intimidation'],
    specializationSuggestions: [
      { skillId: 'athletics', name: 'Kraftakt' },
      { skillId: 'ranged', name: 'Schusswaffen' },
      { skillId: 'intimidation', name: 'Autorität' },
      { skillId: 'athletics', name: 'Klettern' },
      { skillId: 'melee', name: 'Unbewaffnet' },
    ],
    milieuSuggestions: ['Kasernen & Wachposten', 'Veteranen- oder Dienstnetzwerke', 'Sicherheitsbereiche'],
    contactSuggestions: ['Ehemaliger Kamerad', 'Quartiermeisterin', 'Vorgesetzter oder Veteran'],
    complicationSuggestions: ['Unerledigter Auftrag', 'Schwierige Befehlskette', 'Feind aus einem früheren Einsatz'],
    communicationSuggestions: ['Militärische Handzeichen', 'Funkdisziplin', 'Dienstsprache'],
  },
  {
    // Legacy id retained for Schmuggler characters.
    id: 'smuggler',
    name: 'Unterwelt & Grauzone',
    description: 'Du kennst illegale, halblegale oder informelle Wege, um an Informationen, Zugang, Waren oder Gefallen zu kommen.',
    playstyle: 'Täuschen · Heimlichkeit · Fingerfertigkeit · Mobilität',
    examples: ['Diebin', 'Schmuggler', 'Fixerin', 'Betrüger'],
    skillPool: ['driving', 'deception', 'stealth', 'sleight'],
    specializationSuggestions: [
      { skillId: 'driving', name: 'Bodenfahrzeuge' },
      { skillId: 'deception', name: 'Falsche Identität' },
      { skillId: 'stealth', name: 'Urbane Tarnung' },
      { skillId: 'driving', name: 'Motorräder' },
      { skillId: 'deception', name: 'Lügen' },
    ],
    milieuSuggestions: ['Schwarzmärkte', 'Informelle Handelsplätze', 'Kontrollierte Übergänge'],
    contactSuggestions: ['Vermittlerin', 'Bestochener Kontrolleur', 'Kontakt ohne viele Fragen'],
    complicationSuggestions: ['Verlorene Lieferung', 'Offene Rechnung', 'Zwei Parteien mit demselben Anspruch'],
    communicationSuggestions: ['Händlercodes', 'Unterweltslang', 'Verdeckte Zeichen oder Funkcodes'],
  },
  {
    // Legacy id retained for Ermittler characters.
    id: 'investigator',
    name: 'Ermittlung & Information',
    description: 'Du hast gelernt, widersprüchliche Informationen zu ordnen, Spuren zu verfolgen und aus Details belastbare Schlüsse zu ziehen.',
    playstyle: 'Recherche · Beobachtung · Menschenkenntnis · Gespräch',
    examples: ['Detektiv', 'Inquisitorin', 'Journalist', 'Nachrichtenanalystin'],
    skillPool: ['investigation', 'awareness', 'insight', 'persuasion'],
    specializationSuggestions: [
      { skillId: 'investigation', name: 'Tatorte' },
      { skillId: 'investigation', name: 'Forensik' },
      { skillId: 'insight', name: 'Lügen erkennen' },
      { skillId: 'investigation', name: 'Archive' },
      { skillId: 'awareness', name: 'Hinterhalte' },
    ],
    milieuSuggestions: ['Behörden & Archive', 'Informationsnetzwerke', 'Orte systematischer Recherche'],
    contactSuggestions: ['Archivarin', 'Informant', 'Ehemalige Partnerin'],
    complicationSuggestions: ['Offener Altfall', 'Falsche Beschuldigung', 'Unbequeme Wahrheit entdeckt'],
    communicationSuggestions: ['Befragungstechniken', 'Behörden- oder Recherchejargon', 'Regionale Umgangssprache'],
  },
  {
    id: 'trade-networks',
    name: 'Handel & Netzwerke',
    description: 'Du bist geübt darin, Werte auszuhandeln, Beziehungen aufzubauen und Menschen oder Ressourcen miteinander zu verbinden.',
    playstyle: 'Verhandeln · Menschenkenntnis · Wissen · Täuschung',
    examples: ['Kaufmann', 'Händlerin', 'Broker', 'Karawanenvermittlerin'],
    skillPool: ['persuasion', 'insight', 'deception', 'knowledge'],
    specializationSuggestions: [
      { skillId: 'persuasion', name: 'Verhandeln' },
      { skillId: 'persuasion', name: 'Verkauf' },
      { skillId: 'insight', name: 'Verhandlungspartner' },
      { skillId: 'persuasion', name: 'Diplomatie' },
      { skillId: 'insight', name: 'Lügen erkennen' },
    ],
    milieuSuggestions: ['Märkte & Handelsplätze', 'Geschäftsnetzwerke', 'Liefer- und Vermittlungsketten'],
    contactSuggestions: ['Stammkundin', 'Lieferant', 'Vermittlerin mit Reichweite'],
    complicationSuggestions: ['Schlechter Vertrag', 'Abhängigkeit von einem Handelspartner', 'Ruf als harte Verhandlerin'],
    communicationSuggestions: ['Händlerjargon', 'Preis- und Mengencodes', 'Regionale Handelssprache'],
  },
  {
    id: 'privilege-elite',
    name: 'Privileg & Elite',
    description: 'Du bist in Kreisen aufgewachsen oder ausgebildet worden, in denen Status, Zugang, Etikette und gesellschaftlicher Einfluss selbstverständlich sind.',
    playstyle: 'Einfluss · Wissen · Menschen lesen · Auftreten',
    examples: ['Adeliger', 'Patrizierin', 'Konzernspross', 'Diplomatentochter'],
    skillPool: ['persuasion', 'knowledge', 'insight', 'performance'],
    specializationSuggestions: [
      { skillId: 'persuasion', name: 'Diplomatie' },
      { skillId: 'persuasion', name: 'Führung' },
      { skillId: 'knowledge', name: 'Kulturen' },
      { skillId: 'persuasion', name: 'Verhandeln' },
      { skillId: 'knowledge', name: 'Geschichte' },
    ],
    milieuSuggestions: ['Höfe & Führungskreise', 'Exklusive Institutionen', 'Wirtschaftliche oder politische Elite'],
    contactSuggestions: ['Familienmitglied mit Einfluss', 'Ehemalige Hauslehrerin', 'Vertrauter aus gehobenen Kreisen'],
    complicationSuggestions: ['Familienpflicht', 'Öffentlicher Erwartungsdruck', 'Erbe oder Titel mit Bedingungen'],
    communicationSuggestions: ['Etikette', 'Diplomatische Umgangsformen', 'Standes- oder Führungssprache'],
  },
  {
    id: 'faith-order',
    name: 'Glaube & Orden',
    description: 'Du wurdest durch eine Glaubensgemeinschaft, einen Orden, eine philosophische Schule oder eine vergleichbar bindende Tradition geprägt.',
    playstyle: 'Wissen · Menschenkenntnis · Wachsamkeit · Einfluss',
    examples: ['Akolyth', 'Mönchin', 'Jedi-Schüler', 'Ordensmitglied'],
    skillPool: ['knowledge', 'insight', 'awareness', 'persuasion'],
    specializationSuggestions: [
      { skillId: 'knowledge', name: 'Okkultes' },
      { skillId: 'knowledge', name: 'Kulturen' },
      { skillId: 'insight', name: 'Motivation' },
      { skillId: 'knowledge', name: 'Geschichte' },
      { skillId: 'insight', name: 'Lügen erkennen' },
    ],
    milieuSuggestions: ['Tempel, Klöster oder Ordenshäuser', 'Spirituelle Gemeinschaften', 'Philosophische oder ideologische Schulen'],
    contactSuggestions: ['Mentorin', 'Ordensgeschwister', 'Gemeindemitglied mit Vertrauen'],
    complicationSuggestions: ['Gelübde oder Pflicht', 'Glaubenszweifel', 'Konflikt mit einer Autorität des Ordens'],
    communicationSuggestions: ['Ritualsprache', 'Ordenszeichen', 'Philosophischer oder theologischer Jargon'],
  },
  {
    id: 'travel-transport',
    name: 'Reise & Transport',
    description: 'Du hast Menschen, Güter oder dich selbst regelmäßig über schwierige Strecken, Fahrzeuge oder Reiserouten bewegt.',
    playstyle: 'Fortbewegungsmittel · Navigation · Wachsamkeit · Technik',
    examples: ['Seefahrerin', 'Kurier', 'Kutscherin', 'Raumpilot'],
    skillPool: ['driving', 'survival', 'awareness', 'technology'],
    specializationSuggestions: [
      { skillId: 'driving', name: 'Raumfahrzeuge' },
      { skillId: 'driving', name: 'Reittiere' },
      { skillId: 'survival', name: 'Navigation' },
      { skillId: 'driving', name: 'Bodenfahrzeuge' },
      { skillId: 'survival', name: 'Spuren' },
    ],
    milieuSuggestions: ['Häfen, Stationen & Umschlagplätze', 'Fernrouten', 'Fahr- oder Reisedienste'],
    contactSuggestions: ['Navigatorin', 'Fahrzeugmechaniker', 'Stammkunde oder Auftraggeberin'],
    complicationSuggestions: ['Verlorene Fracht', 'Gefährliche Route', 'Verpflichtung gegenüber einer Crew'],
    communicationSuggestions: ['Navigationsjargon', 'Funk- oder Signalprotokolle', 'Hafen- oder Reiseslang'],
  },
  {
    id: 'organization-administration',
    name: 'Organisation & Verwaltung',
    description: 'Du hast gelernt, Informationen, Abläufe, Ressourcen oder Menschen innerhalb einer Organisation zuverlässig zu koordinieren.',
    playstyle: 'Wissen · Recherche · Systeme · Koordination',
    examples: ['Schreiber', 'Buchhalterin', 'Office Manager', 'Stationsadministratorin'],
    skillPool: ['knowledge', 'investigation', 'technology', 'persuasion'],
    specializationSuggestions: [
      { skillId: 'investigation', name: 'Archive' },
      { skillId: 'technology', name: 'Computer' },
      { skillId: 'persuasion', name: 'Vermittlung' },
      { skillId: 'knowledge', name: 'Geschichte' },
      { skillId: 'investigation', name: 'Tatorte' },
    ],
    milieuSuggestions: ['Verwaltungen', 'Büros & Kanzleien', 'Logistik- oder Leitstellen'],
    contactSuggestions: ['Langjährige Kollegin', 'Vorgesetzter', 'Sachbearbeiterin mit Überblick'],
    complicationSuggestions: ['Vertrauliche Akte', 'Organisatorischer Fehler mit Folgen', 'Loyalitätskonflikt innerhalb der Organisation'],
    communicationSuggestions: ['Verwaltungsjargon', 'Formale Korrespondenz', 'Interne Kürzel oder Prozesscodes'],
  },
  {
    id: 'service-supply',
    name: 'Service & Versorgung',
    description: 'Du bist darin erfahren, Bedürfnisse schnell zu erkennen, Menschen praktisch zu versorgen und auch in hektischen Situationen den Betrieb am Laufen zu halten.',
    playstyle: 'Menschen lesen · Einfluss · Wachsamkeit · Präzision',
    examples: ['Wirtin', 'Koch', 'Kellnerin', 'Bordsteward'],
    skillPool: ['insight', 'persuasion', 'awareness', 'sleight'],
    specializationSuggestions: [
      { skillId: 'insight', name: 'Motivation' },
      { skillId: 'persuasion', name: 'Vermittlung' },
      { skillId: 'sleight', name: 'Feinmechanik' },
      { skillId: 'insight', name: 'Lügen erkennen' },
      { skillId: 'persuasion', name: 'Verhandeln' },
    ],
    milieuSuggestions: ['Gasthäuser, Hotels & Gastronomie', 'Versorgungsbetriebe', 'Servicebereiche von Schiffen oder Stationen'],
    contactSuggestions: ['Stammgast', 'Lieferantin', 'Kollege aus dem Schichtbetrieb'],
    complicationSuggestions: ['Anspruchsvoller Stammkunde', 'Versorgungsengpass', 'Verantwortung für einen laufenden Betrieb'],
    communicationSuggestions: ['Servicejargon', 'Küchen- oder Schichtcodes', 'Regionale Umgangssprache'],
  },
  {
    id: 'family-community',
    name: 'Familie & Gemeinschaft',
    description: 'Deine wichtigsten Fähigkeiten stammen aus dem Aufwachsen in einer Familie, Nachbarschaft oder engen Gemeinschaft und aus Verantwortung füreinander.',
    playstyle: 'Menschen lesen · Einfluss · Wachsamkeit · Überleben',
    examples: ['Großfamilie', 'Straßenviertel', 'Dorfkind', 'Koloniegemeinschaft'],
    skillPool: ['insight', 'persuasion', 'awareness', 'survival'],
    specializationSuggestions: [
      { skillId: 'insight', name: 'Gruppendynamik' },
      { skillId: 'persuasion', name: 'Vermittlung' },
      { skillId: 'survival', name: 'Urbane Survival-Situationen' },
      { skillId: 'insight', name: 'Lügen erkennen' },
      { skillId: 'persuasion', name: 'Verhandeln' },
    ],
    milieuSuggestions: ['Familie & Haushalt', 'Nachbarschaft oder Dorf', 'Enge Gemeinschaft oder Kolonie'],
    contactSuggestions: ['Geschwister oder Cousine', 'Nachbar mit langer Geschichte', 'Vertrauensperson der Gemeinschaft'],
    complicationSuggestions: ['Familiäre Verpflichtung', 'Alter Konflikt in der Gemeinschaft', 'Jemand ist auf deine Hilfe angewiesen'],
    communicationSuggestions: ['Familiäre Kurzzeichen', 'Lokaler Slang', 'Gemeinschaftssprache'],
  },
  {
    id: 'law-institutions',
    name: 'Recht & Institutionen',
    description: 'Du kennst Regeln, Verfahren und die Institutionen, durch die Gesellschaften Entscheidungen treffen, Streit klären oder Macht ausüben.',
    playstyle: 'Wissen · Recherche · Einfluss · Menschen lesen',
    examples: ['Anwältin', 'Magistrat', 'Senatorin', 'Konzernjurist'],
    skillPool: ['knowledge', 'investigation', 'persuasion', 'insight'],
    specializationSuggestions: [
      { skillId: 'knowledge', name: 'Recht' },
      { skillId: 'persuasion', name: 'Verhandeln' },
      { skillId: 'investigation', name: 'Befragungsanalyse' },
      { skillId: 'knowledge', name: 'Geschichte' },
      { skillId: 'investigation', name: 'Tatorte' },
    ],
    milieuSuggestions: ['Gerichte & Behörden', 'Politische Gremien', 'Institutionelle Entscheidungsräume'],
    contactSuggestions: ['Ehemalige Kollegin', 'Sachverständiger', 'Politische oder juristische Mentorin'],
    complicationSuggestions: ['Interessenkonflikt', 'Unbequemer Präzedenzfall', 'Verpflichtung gegenüber einer Institution'],
    communicationSuggestions: ['Rechts- oder Amtsjargon', 'Formelle Verhandlungsführung', 'Verfahrenssprache'],
  },
];

export function validateSagaDriveBackgroundTemplate(template: SagaDriveBackgroundTemplate): string[] {
  const errors: string[] = [];
  const pool = new Set(template.skillPool);
  const knownSkills = new Set(sagaDriveSkillDefinitions.map((skill) => skill.key));

  if (!template.name.trim()) errors.push('name must not be empty');
  if (!template.description.trim()) errors.push('description must not be empty');
  if (template.examples.length < 2 || template.examples.some((example) => !example.trim())) errors.push('examples must contain at least two non-empty entries');
  if (template.skillPool.length !== 4 || pool.size !== 4) errors.push('skillPool must contain exactly four distinct skills');

  for (const skill of template.skillPool) {
    if (!knownSkills.has(skill)) errors.push(`unknown pool skill: ${skill}`);
  }
  if (template.specializationSuggestions.length < 5) {
    errors.push('specializationSuggestions must contain at least five entries');
  }
  for (const suggestion of template.specializationSuggestions) {
    if (!pool.has(suggestion.skillId)) errors.push(`specialization skill is outside pool: ${suggestion.skillId}`);
    if (!getSagaDriveSkill(suggestion.skillId).specializations.includes(suggestion.name)) {
      errors.push(`unknown specialization for ${suggestion.skillId}: ${suggestion.name}`);
    }
  }

  return errors;
}

/**
 * Up to `limit` specialization name options for a trained background skill:
 * curated template suggestions first, then padded from the skill catalog.
 */
export function getBackgroundSpecializationSuggestionNames(
  template: SagaDriveBackgroundTemplate | undefined,
  skillId: SagaDriveSkillKey,
  limit = 5,
): string[] {
  const curated =
    template?.specializationSuggestions.filter((entry) => entry.skillId === skillId).map((entry) => entry.name) ?? [];
  const catalog = getSagaDriveSkill(skillId).specializations;
  const merged: string[] = [];
  for (const name of [...curated, ...catalog]) {
    if (merged.includes(name)) continue;
    merged.push(name);
    if (merged.length >= limit) break;
  }
  return merged;
}

export function validateSagaDriveBackgroundTemplateCatalog(
  templates: readonly SagaDriveBackgroundTemplate[] = sagaDriveBackgroundTemplates,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const template of templates) {
    if (!template.id.trim()) errors.push('template id must not be empty');
    if (ids.has(template.id)) errors.push(`duplicate template id: ${template.id}`);
    if (names.has(template.name)) errors.push(`duplicate framework name: ${template.name}`);
    ids.add(template.id);
    names.add(template.name);
    for (const error of validateSagaDriveBackgroundTemplate(template)) errors.push(`${template.id}: ${error}`);
  }
  return errors;
}

const catalogErrors = validateSagaDriveBackgroundTemplateCatalog();
if (catalogErrors.length > 0) throw new Error(`Invalid SagaDrive background framework catalog: ${catalogErrors.join('; ')}`);

export function getSagaDriveBackgroundTemplate(id: string | null | undefined): SagaDriveBackgroundTemplate | undefined {
  if (!id) return undefined;
  return sagaDriveBackgroundTemplates.find((entry) => entry.id === id);
}

export function getSagaDriveBackgroundTemplatesForWorldProfile(worldProfileId?: string | null): readonly SagaDriveBackgroundTemplate[] {
  if (!worldProfileId) return sagaDriveBackgroundTemplates;
  return sagaDriveBackgroundTemplates.filter((template) => !template.worldProfileIds || template.worldProfileIds.includes(worldProfileId));
}