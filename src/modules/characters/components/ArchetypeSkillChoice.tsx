/**
 * ArchetypeSkillChoice — Auswahl des Archetyp-Fertigkeitspunkts mit sichtbarer Regelwirkung.
 * Location: src/modules/characters/components/ArchetypeSkillChoice.tsx
 */
import { useState } from 'react';
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
  if (skillKey === 'athletics') {
    return ['Zählt für Manöverwiderstand zusammen mit Stärke bzw. Geschicklichkeit.'];
  }
  return [];
}

/**
 * Orthogonale Bracket-Verbindungen (kantig, wie ein Organigramm): kurzer Abwärtstiel
 * aus der Kartenmitte, horizontal verlaufende Sammelschiene, senkrechte Abfälle auf
 * die Spaltenzentren des Grids. Rein dekorativ (aria-hidden), Breakpoint-Varianten
 * sind rein CSS-gecoupelt, keine DOM-Messung nötig.
 */
interface ConnectorVariant {
  key: string;
  className: string;
  height: number;
  targets: readonly number[];
  railY: number | null;
}

const CONNECTOR_VARIANTS: readonly ConnectorVariant[] = [
  { key: 'mobile', className: 'md:hidden', height: 14, targets: [50], railY: null },
  { key: 'tablet', className: 'hidden md:block lg:hidden', height: 18, targets: [25, 75], railY: 6 },
  { key: 'desktop', className: 'hidden lg:block', height: 18, targets: [12.5, 37.5, 62.5, 87.5], railY: 6 },
];

interface ArchetypeConnectorProps {
  skills: readonly SagaDriveSkillKey[];
  activeSkill: SagaDriveSkillKey | null;
}

function ArchetypeConnector({ skills, activeSkill }: ArchetypeConnectorProps) {
  const activeIndex = activeSkill ? skills.indexOf(activeSkill) : -1;

  return (
    <div className="relative h-[14px] md:h-[18px] -mt-px" aria-hidden="true">
      {CONNECTOR_VARIANTS.map((variant) => (
        <svg
          key={variant.key}
          className={`absolute inset-0 h-full w-full text-primary ${variant.className}`}
          viewBox={`0 0 100 ${variant.height}`}
          preserveAspectRatio="none"
          fill="none"
        >
          {variant.railY !== null && (
            <line
              x1={variant.targets[0]}
              y1={variant.railY}
              x2={variant.targets[variant.targets.length - 1]}
              y2={variant.railY}
              stroke="currentColor"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              className="opacity-40 transition-opacity duration-200"
            />
          )}
          {variant.targets.map((targetX) => {
            const pathIndex = variant.targets.indexOf(targetX);
            const active = variant.targets.length === 1 ? activeIndex >= 0 : pathIndex === activeIndex;
            const railY = variant.railY;
            const path = railY === null
              ? `M 50 0 L ${targetX} ${variant.height}`
              : `M 50 0 L 50 ${railY} L ${targetX} ${railY} L ${targetX} ${variant.height}`;
            return (
              <path
                key={targetX}
                d={path}
                stroke="currentColor"
                strokeWidth={active ? 2.5 : 1.5}
                strokeLinecap="square"
                strokeLinejoin="miter"
                vectorEffect="non-scaling-stroke"
                className={`transition-all duration-200 ${active ? 'opacity-100' : 'opacity-40'}`}
              />
            );
          })}
        </svg>
      ))}
    </div>
  );
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
  const [activeSkill, setActiveSkill] = useState<SagaDriveSkillKey | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-muted-foreground">Archetyp-Punkt (1 von 10) · welche typische Fertigkeit?</p>
        <RuleHelp label="Archetyp-Punkt">
          Du legst genau 1 der 10 Start-Fertigkeitspunkte in eine typische Fertigkeit deines Archetyps. Die Wahl bestimmt, welche Proben du ab Stufe 1 trainiert würfeln kannst und welche abgeleiteten Werte sich ändern.
        </RuleHelp>
      </div>

      <ArchetypeConnector skills={skills} activeSkill={activeSkill} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              onMouseEnter={() => setActiveSkill(skillKey)}
              onMouseLeave={() => setActiveSkill((current) => (current === skillKey ? null : current))}
              onFocus={() => setActiveSkill(skillKey)}
              onBlur={() => setActiveSkill((current) => (current === skillKey ? null : current))}
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