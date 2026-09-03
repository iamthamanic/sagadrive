/**
 * SkillCheckFormulaPanel — Full skill check breakdown from domain rules (#90).
 * Location: src/app/character/progression/SkillCheckFormulaPanel.tsx
 */
import { Badge } from '../../../components/ui/badge';
import {
  getSagaDriveAttribute,
  getSagaDriveSkill,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import type { CharacterAttributesDto } from '../../../modules/characters/types/character.types';
import {
  SAGA_DRIVE_SPECIALIZATION_BONUS,
  getSagaDriveAppliedExperienceBonus,
  getSagaDriveExperienceBonus,
  type SagaDriveBackgroundSkillPoints,
} from '../../../modules/rulesets/skillProgression';

interface SkillCheckFormulaPanelProps {
  skillKey: SagaDriveSkillKey;
  characterLevel: number;
  attributes: CharacterAttributesDto;
  finalRank: number;
  freeRank: number;
  backgroundPoints: SagaDriveBackgroundSkillPoints;
  archetypePoint: boolean;
  specializationName?: string;
}

function rankLabel(rank: number): string {
  if (rank <= 0) return 'Untrainiert';
  if (rank === 1) return 'Trainiert';
  if (rank === 2) return 'Geübt';
  if (rank === 3) return 'Fachkundig';
  if (rank === 4) return 'Meisterlich';
  return 'Weltklasse';
}

export function SkillCheckFormulaPanel({
  skillKey,
  characterLevel,
  attributes,
  finalRank,
  freeRank,
  backgroundPoints,
  archetypePoint,
  specializationName,
}: SkillCheckFormulaPanelProps) {
  const skill = getSagaDriveSkill(skillKey);
  const attribute = getSagaDriveAttribute(skill.attribute);
  const attributeValue = attributes[skill.attribute];
  const backgroundValue = backgroundPoints[skillKey] ?? 0;
  const globalEb = getSagaDriveExperienceBonus(characterLevel);
  const appliedEb = getSagaDriveAppliedExperienceBonus(finalRank, characterLevel);
  const hasSpecialization = Boolean(specializationName?.trim());
  // §5.2: the specialization bonus is situational and never part of the normal check.
  const checkTotal = attributeValue + finalRank + appliedEb;
  const specializedCheckTotal = checkTotal + SAGA_DRIVE_SPECIALIZATION_BONUS;

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{skill.label.toUpperCase()}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{finalRank}</p>
        <p className="text-muted-foreground">{rankLabel(finalRank)}</p>
      </div>

      <div className="rounded-lg border border-border bg-muted/10 p-3">
        <p className="font-medium">Standardattribut: {attribute.label} +{attributeValue}</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Herkunft</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Hintergrund</span><strong>{backgroundValue > 0 ? `+${backgroundValue}` : '—'}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Archetyp</span><strong>{archetypePoint ? '+1' : '—'}</strong></div>
          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Frei</span><strong>{freeRank > 0 ? `+${freeRank}` : '—'}</strong></div>
          <div className="border-t border-border pt-2 flex justify-between gap-3"><span className="text-muted-foreground">Fertigkeitsrang</span><strong>{finalRank}</strong></div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Erfahrung</p>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Globaler EB</span><strong>+{globalEb}</strong></div>
        <div className="flex justify-between gap-3"><span className="text-muted-foreground">Durch Rang {finalRank} anwendbar</span><strong>+{appliedEb}</strong></div>
      </div>

      {hasSpecialization ? (
        <Badge variant="secondary">{specializationName} +{SAGA_DRIVE_SPECIALIZATION_BONUS} (situationsgebunden)</Badge>
      ) : null}

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 font-mono text-xs leading-relaxed">
        <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">Normaler {skill.label}-Check</p>
        <p>d20</p>
        <p>+{attributeValue} {attribute.shortLabel}</p>
        <p>+{finalRank} {skill.label}</p>
        <p>+{appliedEb} anwendbarer Erfahrungsbonus</p>
        <p className="mt-2 border-t border-primary/20 pt-2 font-semibold">d20 +{checkTotal}</p>
      </div>

      {hasSpecialization ? (
        <div className="rounded-lg border border-border bg-muted/10 p-3 font-mono text-xs leading-relaxed" data-testid="specialization-situational-bonus">
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">Passende Spezialisierung</p>
          <p>Bei passender Spezialisierung „{specializationName}“: +{SAGA_DRIVE_SPECIALIZATION_BONUS}</p>
          <p className="mt-1 font-semibold">Gesamt in passender Situation: d20 +{specializedCheckTotal}</p>
        </div>
      ) : null}
    </div>
  );
}
