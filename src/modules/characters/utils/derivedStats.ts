/**
 * derivedStats — Berechnet SagaDrive-Core abgeleitete Werte inkl. sichtbarer Formel-Terme.
 * Location: src/modules/characters/utils/derivedStats.ts
 */
import type { DerivedStatCardProps } from '../../../components/DerivedStatCard';
import {
  getSagaDriveSkill,
  sagaDriveAttributeDefinitions,
  type SagaDriveAttributeKey,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';

type AttributeMap = Record<SagaDriveAttributeKey, number>;
type SkillRankMap = Record<SagaDriveSkillKey, number>;

function attributeShortLabel(key: SagaDriveAttributeKey): string {
  return sagaDriveAttributeDefinitions.find((entry) => entry.key === key)?.shortLabel ?? key;
}

function skillShortLabel(key: SagaDriveSkillKey): string {
  return getSagaDriveSkill(key).label;
}

export function buildSagaDriveDerivedStatCards(input: {
  attributes: AttributeMap;
  finalSkillRanks: SkillRankMap;
  experienceBonus: number;
  overloaded: boolean;
}): DerivedStatCardProps[] {
  const { attributes, finalSkillRanks, experienceBonus, overloaded } = input;
  const carryCapacity = 5 + 2 * attributes.strength;
  const movement = overloaded ? 6 : 9;

  const meleeDefense = finalSkillRanks.melee;
  const acrobaticsDefense = finalSkillRanks.acrobatics;
  const defenseSkill = Math.max(meleeDefense, acrobaticsDefense);
  const defenseSkillKey: SagaDriveSkillKey = meleeDefense >= acrobaticsDefense ? 'melee' : 'acrobatics';

  const athleticsManeuver = attributes.strength + finalSkillRanks.athletics;
  const acrobaticsManeuver = attributes.dexterity + finalSkillRanks.acrobatics;
  const maneuverUsesAthletics = athleticsManeuver >= acrobaticsManeuver;

  const awarenessRank = finalSkillRanks.awareness;
  const initiativeBonus = attributes.perception + awarenessRank + (awarenessRank > 0 ? experienceBonus : 0);

  const health = 12 + 2 * attributes.endurance + 2 * experienceBonus;
  const defense = 10 + attributes.dexterity + experienceBonus + defenseSkill;
  const bodyResistance = 10 + attributes.endurance + experienceBonus;
  const reflexResistance = 10 + attributes.dexterity + experienceBonus;
  const mindResistance = 10 + attributes.mind + experienceBonus;
  const maneuverResistance = 10 + experienceBonus + Math.max(athleticsManeuver, acrobaticsManeuver);
  const recovery = attributes.endurance + experienceBonus;

  return [
    {
      label: 'Gesundheit',
      displayValue: String(health),
      base: 12,
      help: '12 + 2 × Ausdauer + 2 × Erfahrungsbonus.',
      terms: [
        { label: `2×${attributeShortLabel('endurance')}`, contribution: 2 * attributes.endurance, detail: `Ausdauer ${attributes.endurance}` },
        { label: `2×EB`, contribution: 2 * experienceBonus, detail: `Erfahrungsbonus ${experienceBonus}` },
      ],
    },
    {
      label: 'Verteidigung',
      displayValue: String(defense),
      base: 10,
      help: '10 + Geschicklichkeit + Erfahrungsbonus + höherer Wert aus Nahkampf oder Akrobatik. Spezialisierungen zählen nicht.',
      terms: [
        { label: attributeShortLabel('dexterity'), contribution: attributes.dexterity, detail: `Geschicklichkeit ${attributes.dexterity}` },
        { label: 'EB', contribution: experienceBonus, detail: `Erfahrungsbonus ${experienceBonus}` },
        {
          label: skillShortLabel(defenseSkillKey),
          contribution: defenseSkill,
          detail: `max(Nahkampf ${meleeDefense}, Akrobatik ${acrobaticsDefense})`,
        },
      ],
    },
    {
      label: 'Initiative',
      displayValue: `d20 + ${initiativeBonus}`,
      prefix: 'd20 +',
      help: 'd20 + Wahrnehmung + Aufmerksamkeit + Erfahrungsbonus, wenn Aufmerksamkeit trainiert ist.',
      terms: [
        { label: attributeShortLabel('perception'), contribution: attributes.perception, detail: `Wahrnehmung ${attributes.perception}` },
        { label: skillShortLabel('awareness'), contribution: awarenessRank, detail: `Aufmerksamkeit ${awarenessRank}` },
        ...(awarenessRank > 0
          ? [{ label: 'EB', contribution: experienceBonus, detail: `Erfahrungsbonus ${experienceBonus}` }]
          : []),
      ],
      footnote: awarenessRank === 0 ? 'Erfahrungsbonus zählt erst ab Aufmerksamkeit 1.' : undefined,
    },
    {
      label: 'Bewegung',
      displayValue: `${movement} m`,
      base: 9,
      help: overloaded ? 'Standard 9 m. Wegen Überlastung derzeit −3 m.' : 'Standardbewegung: 9 m pro Zug.',
      terms: overloaded ? [{ label: 'Überlastung', contribution: -3, detail: 'Last über Traglast' }] : [],
      footnote: overloaded ? 'Aktuell überladen.' : 'Standard 9 m pro Zug.',
    },
    {
      label: 'Körperwiderstand',
      displayValue: String(bodyResistance),
      base: 10,
      help: '10 + Ausdauer + Erfahrungsbonus.',
      terms: [
        { label: attributeShortLabel('endurance'), contribution: attributes.endurance, detail: `Ausdauer ${attributes.endurance}` },
        { label: 'EB', contribution: experienceBonus, detail: `Erfahrungsbonus ${experienceBonus}` },
      ],
    },
    {
      label: 'Reflexwiderstand',
      displayValue: String(reflexResistance),
      base: 10,
      help: '10 + Geschicklichkeit + Erfahrungsbonus.',
      terms: [
        { label: attributeShortLabel('dexterity'), contribution: attributes.dexterity, detail: `Geschicklichkeit ${attributes.dexterity}` },
        { label: 'EB', contribution: experienceBonus, detail: `Erfahrungsbonus ${experienceBonus}` },
      ],
    },
    {
      label: 'Geistwiderstand',
      displayValue: String(mindResistance),
      base: 10,
      help: '10 + Verstand + Erfahrungsbonus.',
      terms: [
        { label: attributeShortLabel('mind'), contribution: attributes.mind, detail: `Verstand ${attributes.mind}` },
        { label: 'EB', contribution: experienceBonus, detail: `Erfahrungsbonus ${experienceBonus}` },
      ],
    },
    {
      label: 'Manöverwiderstand',
      displayValue: String(maneuverResistance),
      base: 10,
      help: '10 + Erfahrungsbonus + höherer Wert aus Stärke + Athletik oder Geschicklichkeit + Akrobatik.',
      terms: [
        { label: 'EB', contribution: experienceBonus, detail: `Erfahrungsbonus ${experienceBonus}` },
        {
          label: maneuverUsesAthletics ? `${attributeShortLabel('strength')}+Athletik` : `${attributeShortLabel('dexterity')}+Akrobatik`,
          contribution: Math.max(athleticsManeuver, acrobaticsManeuver),
          detail: maneuverUsesAthletics
            ? `max(STÄ ${attributes.strength} + Athletik ${finalSkillRanks.athletics}, GES ${attributes.dexterity} + Akrobatik ${finalSkillRanks.acrobatics})`
            : `max(GES ${attributes.dexterity} + Akrobatik ${finalSkillRanks.acrobatics}, STÄ ${attributes.strength} + Athletik ${finalSkillRanks.athletics})`,
          active: true,
        },
      ],
    },
    {
      label: 'Erholung',
      displayValue: String(recovery),
      help: 'Ausdauer + Erfahrungsbonus.',
      terms: [
        { label: attributeShortLabel('endurance'), contribution: attributes.endurance, detail: `Ausdauer ${attributes.endurance}` },
        { label: 'EB', contribution: experienceBonus, detail: `Erfahrungsbonus ${experienceBonus}` },
      ],
    },
    {
      label: 'Traglast',
      displayValue: String(carryCapacity),
      base: 5,
      help: '5 + 2 × Stärke in Lastpunkten.',
      terms: [{ label: `2×${attributeShortLabel('strength')}`, contribution: 2 * attributes.strength, detail: `Stärke ${attributes.strength}` }],
    },
  ];
}
