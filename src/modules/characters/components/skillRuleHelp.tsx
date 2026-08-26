/**
 * skillRuleHelp — Gemeinsame Tooltip-Inhalte und abgeleitete Hinweise für SagaDrive-Fertigkeiten.
 * Location: src/modules/characters/components/skillRuleHelp.tsx
 */
import {
  getSagaDriveAttribute,
  getSagaDriveSkill,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';

export function getSkillDerivedHints(skillKey: SagaDriveSkillKey): string[] {
  if (skillKey === 'melee' || skillKey === 'acrobatics') {
    return ['Erhöht die Verteidigung, wenn dieser Wert höher ist als die jeweilige Alternative.'];
  }
  if (skillKey === 'awareness') {
    return ['Trainierte Aufmerksamkeit zählt für Initiative (d20 + Wahrnehmung + Aufmerksamkeit + Erfahrungsbonus).'];
  }
  if (skillKey === 'athletics' || skillKey === 'acrobatics') {
    return ['Zählt für Manöverwiderstand zusammen mit Stärke bzw. Geschicklichkeit.'];
  }
  return [];
}

export function SkillRuleHelpContent({ skillKey }: { skillKey: SagaDriveSkillKey }) {
  const skill = getSagaDriveSkill(skillKey);
  const attribute = getSagaDriveAttribute(skill.attribute);
  const derivedHints = getSkillDerivedHints(skillKey);

  return (
    <>
      <span className="block font-semibold">{skill.label} · {attribute.label}</span>
      <span className="mt-1 block">{skill.summary}</span>
      <span className="mt-1 block opacity-90">Standardattribut: {attribute.label} ({attribute.shortLabel})</span>
      {skill.excludes ? <span className="mt-1 block opacity-90">Nicht: {skill.excludes}</span> : null}
      <span className="mt-1 block opacity-90">Typische Spezialisierungen: {skill.specializations.join(', ')}.</span>
      {derivedHints.map((hint) => (
        <span key={hint} className="mt-1 block text-primary/90">{hint}</span>
      ))}
    </>
  );
}
