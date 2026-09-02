/**
 * BackgroundSkillPointsAllocator — Stackable 2-point background skill allocator (#91).
 * Location: src/app/character/creation/BackgroundSkillPointsAllocator.tsx
 */
import { Minus, Plus } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  getSagaDriveAttribute,
  getSagaDriveSkill,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import {
  SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS,
  type SagaDriveBackgroundSkillPoints,
} from '../../../modules/rulesets/skillProgression';

interface BackgroundSkillPointsAllocatorProps {
  poolSkills: readonly SagaDriveSkillKey[];
  points: SagaDriveBackgroundSkillPoints;
  onChange: (points: SagaDriveBackgroundSkillPoints) => void;
}

function sumBackgroundPoints(points: SagaDriveBackgroundSkillPoints): number {
  return Object.values(points).reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function BackgroundSkillPointsAllocator({
  poolSkills,
  points,
  onChange,
}: BackgroundSkillPointsAllocatorProps) {
  const used = sumBackgroundPoints(points);

  const adjust = (skill: SagaDriveSkillKey, delta: 1 | -1) => {
    const current = points[skill] ?? 0;
    const nextValue = current + delta;
    if (nextValue < 0 || nextValue > 2) return;
    const next = { ...points };
    if (nextValue === 0) delete next[skill];
    else next[skill] = nextValue as 1 | 2;
    const nextSum = sumBackgroundPoints(next);
    if (nextSum > SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS) return;
    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4" data-background-points-allocator>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">2 Hintergrund-Fertigkeitspunkte</p>
          <p className="text-sm text-muted-foreground">Nur auf die vier Framework-Skills. +2 auf denselben Skill oder +1/+1 verteilen.</p>
        </div>
        <Badge variant={used === SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS ? 'default' : 'outline'}>
          {used} / {SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS} verteilt
        </Badge>
      </div>
      <div className="space-y-2">
        {poolSkills.map((skillKey) => {
          const skill = getSagaDriveSkill(skillKey);
          const attribute = getSagaDriveAttribute(skill.attribute);
          const value = points[skillKey] ?? 0;
          return (
            <div key={skillKey} className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-muted/10 px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">{skill.label}</p>
                <p className="text-xs text-muted-foreground">Standard: {attribute.shortLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="icon" className="size-10" disabled={value <= 0} onClick={() => adjust(skillKey, -1)} aria-label={`${skill.label} Hintergrundpunkt entfernen`}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center text-lg font-semibold tabular-nums">{value}</span>
                <Button type="button" variant="outline" size="icon" className="size-10" disabled={used >= SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS || value >= 2} onClick={() => adjust(skillKey, 1)} aria-label={`${skill.label} Hintergrundpunkt hinzufügen`}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function sumBackgroundSkillPointsUsed(points: SagaDriveBackgroundSkillPoints): number {
  return sumBackgroundPoints(points);
}

export function backgroundSkillsWithPoints(points: SagaDriveBackgroundSkillPoints): SagaDriveSkillKey[] {
  return Object.entries(points)
    .filter(([, value]) => (value ?? 0) > 0)
    .map(([skill]) => skill as SagaDriveSkillKey);
}
