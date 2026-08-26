/**
 * ArchetypeSkillChoice — Auswahl des Archetyp-Fertigkeitspunkts mit sichtbarer Regelwirkung.
 * Location: src/modules/characters/components/ArchetypeSkillChoice.tsx
 */
import { Badge } from '../../../components/ui/badge';
import {
  SAGA_DRIVE_START_SKILL_CAP,
  getSagaDriveAttribute,
  getSagaDriveSkill,
  type SagaDriveAttributeKey,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';
import { RuleHelp } from './RuleHelp';

interface ArchetypeSkillChoiceProps {
  skills: readonly SagaDriveSkillKey[];
  selectedSkill?: SagaDriveSkillKey;
  onSelect: (skill: SagaDriveSkillKey) => void;
  backgroundTrainedSkills: readonly SagaDriveSkillKey[];
  freeRanks: Record<SagaDriveSkillKey, number>;
  attributes: Record<SagaDriveAttributeKey, number>;
  experienceBonus?: number;
}

function getCompetencyLabel(rank: number): string {
  if (rank === 0) return 'Untrainiert';
  if (rank === 1) return 'Trainiert';
  if (rank === 2) return 'Geübt';
  if (rank === 3) return 'Fachkundig';
  return 'Meisterlich';
}

function getProjectedRank(
  skillKey: SagaDriveSkillKey,
  backgroundTrainedSkills: readonly SagaDriveSkillKey[],
  freeRanks: Record<SagaDriveSkillKey, number>,
): number {
  return freeRanks[skillKey] + (backgroundTrainedSkills.includes(skillKey) ? 1 : 0) + 1;
}

function getDerivedStatHints(skillKey: SagaDriveSkillKey): string[] {
  if (skillKey === 'melee' || skillKey === 'acrobatics') {
    return ['Erhöht deine Verteidigung, wenn dieser Wert höher ist als Nahkampf/Akrobatik der Alternative.'];
  }
  if (skillKey === 'awareness') {
    return ['Trainierte Aufmerksamkeit zählt für Initiative (d20 + Wahrnehmung + Aufmerksamkeit + Erfahrungsbonus).'];
  }
  if (skillKey === 'athletics' || skillKey === 'acrobatics') {
    return ['Zählt für Manöverwiderstand zusammen mit Stärke bzw. Geschicklichkeit.'];
  }
  return [];
}

export function ArchetypeSkillChoice({
  skills,
  selectedSkill,
  onSelect,
  backgroundTrainedSkills,
  freeRanks,
  attributes,
  experienceBonus = 1,
}: ArchetypeSkillChoiceProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-muted-foreground">Archetyp-Punkt (1 von 10) · welche typische Fertigkeit?</p>
        <RuleHelp label="Archetyp-Punkt">
          Du legst genau 1 der 10 Start-Fertigkeitspunkte in eine typische Fertigkeit deines Archetyps. Die Wahl bestimmt, welche Proben du ab Stufe 1 trainiert würfeln kannst und welche abgeleiteten Werte sich ändern.
        </RuleHelp>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {skills.map((skillKey) => {
          const skill = getSagaDriveSkill(skillKey);
          const attribute = getSagaDriveAttribute(skill.attribute);
          const selected = selectedSkill === skillKey;
          const projectedRank = getProjectedRank(skillKey, backgroundTrainedSkills, freeRanks);
          const disabled = !selected && projectedRank > SAGA_DRIVE_START_SKILL_CAP;
          const hasBackground = backgroundTrainedSkills.includes(skillKey);
          const freeRank = freeRanks[skillKey];
          const probeModifier = attributes[skill.attribute] + projectedRank + (projectedRank > 0 ? experienceBonus : 0);
          const derivedHints = getDerivedStatHints(skillKey);

          return (
            <button
              key={skillKey}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(skillKey)}
              className={
                selected
                  ? 'rounded-lg border border-primary bg-primary/10 p-3 text-left transition-colors'
                  : 'rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-45'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-medium">{skill.label}</p>
                    <RuleHelp label={skill.label}>
                      <span className="block font-semibold">{skill.label} · {attribute.label}</span>
                      <span className="mt-1 block">{skill.summary}</span>
                      {skill.excludes && <span className="mt-1 block opacity-90">Nicht: {skill.excludes}</span>}
                      <span className="mt-1 block opacity-90">Typische Spezialisierungen: {skill.specializations.join(', ')}.</span>
                    </RuleHelp>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{attribute.shortLabel} · {skill.summary}</p>
                </div>
                <Badge variant={selected ? 'default' : 'outline'}>{projectedRank}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">Archetyp +1</Badge>
                {hasBackground && <Badge variant="outline">Hintergrund +1</Badge>}
                {freeRank > 0 && <Badge variant="secondary">Frei +{freeRank}</Badge>}
              </div>

              <p className="mt-2 text-xs">
                <span className="font-medium">{getCompetencyLabel(projectedRank)}</span>
                <span className="text-muted-foreground"> · Probe typisch d20 + {attribute.shortLabel} + {projectedRank} + {projectedRank > 0 ? experienceBonus : 0} = </span>
                <span className="font-semibold">{probeModifier > 0 ? `+${probeModifier}` : probeModifier}</span>
              </p>

              {derivedHints.length > 0 && (
                <p className="mt-2 text-[11px] leading-relaxed text-primary/90">{derivedHints[0]}</p>
              )}

              {disabled && (
                <p className="mt-2 text-[11px] text-destructive">Würde Startcap {SAGA_DRIVE_START_SKILL_CAP} überschreiten.</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
