/**
 * SkillProgressionSlotsPanel — Level 3–19 skill-development slot UX (consumer of #90 rules).
 * Location: src/app/character/progression/SkillProgressionSlotsPanel.tsx
 */
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  getSagaDriveSkill,
  sagaDriveSkillDefinitions,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import {
  getSagaDriveSkillAdvanceLevels,
  getSagaDriveSkillCap,
  isValidSkillAdvanceEntry,
  isValidSpecializationForSkillRank,
  resolveSagaDriveSkillRanks,
  type SagaDriveSkillAdvanceDto,
  type SagaDriveSpecializationRecordDto,
  type SagaDriveStartSkillBuild,
} from '../../../modules/rulesets/skillProgression';
import { RuleHelp } from '../shared/RuleHelp';

type SlotDecisionKind = 'rank-up' | 'learn' | 'specialization' | '';

interface SkillProgressionSlotsPanelProps {
  characterLevel: number;
  startBuild: SagaDriveStartSkillBuild;
  skillAdvances: SagaDriveSkillAdvanceDto[];
  specializations: SagaDriveSpecializationRecordDto[];
  onSkillAdvancesChange: (advances: SagaDriveSkillAdvanceDto[]) => void;
  onSpecializationsChange: (entries: SagaDriveSpecializationRecordDto[]) => void;
}

function getSlotDecision(
  level: number,
  advances: readonly SagaDriveSkillAdvanceDto[],
  specializations: readonly SagaDriveSpecializationRecordDto[],
): { kind: SlotDecisionKind; skill?: SagaDriveSkillKey; name?: string } {
  const advance = advances.find((entry) => entry.level === level);
  if (advance) {
    return { kind: advance.kind, skill: advance.skill };
  }
  const spec = specializations.find((entry) => entry.source === 'skill-development' && entry.acquiredAtLevel === level);
  if (spec) {
    return { kind: 'specialization', skill: spec.skill, name: spec.name };
  }
  return { kind: '' };
}

function ranksBeforeLevel(
  startBuild: SagaDriveStartSkillBuild,
  advances: SagaDriveSkillAdvanceDto[],
  level: number,
): Record<SagaDriveSkillKey, number> {
  const filtered = advances.filter((entry) => entry.level < level);
  return resolveSagaDriveSkillRanks({ ...startBuild, skillAdvances: filtered }, level - 1);
}

export function SkillProgressionSlotsPanel({
  characterLevel,
  startBuild,
  skillAdvances,
  specializations,
  onSkillAdvancesChange,
  onSpecializationsChange,
}: SkillProgressionSlotsPanelProps) {
  const unlockedLevels = getSagaDriveSkillAdvanceLevels(characterLevel);
  if (unlockedLevels.length === 0) return null;

  const applySlot = (
    level: SagaDriveSkillAdvanceDto['level'],
    kind: SlotDecisionKind,
    skill?: SagaDriveSkillKey,
    specName?: string,
  ) => {
    const nextAdvances = skillAdvances.filter((entry) => entry.level !== level);
    const nextSpecs = specializations.filter(
      (entry) => !(entry.source === 'skill-development' && entry.acquiredAtLevel === level),
    );
    if (!kind || !skill) {
      onSkillAdvancesChange(nextAdvances);
      onSpecializationsChange(nextSpecs);
      return;
    }
    if (kind === 'specialization') {
      const ranks = resolveSagaDriveSkillRanks({ ...startBuild, skillAdvances: nextAdvances }, level);
      const existingCount = nextSpecs.filter((entry) => entry.skill === skill).length;
      if (!specName?.trim() || !isValidSpecializationForSkillRank(ranks[skill], existingCount)) return;
      onSkillAdvancesChange(nextAdvances);
      onSpecializationsChange([
        ...nextSpecs,
        { skill, name: specName.trim(), source: 'skill-development', acquiredAtLevel: level },
      ]);
      return;
    }
    const candidate: SagaDriveSkillAdvanceDto = { level, kind, skill };
    const ranksBefore = ranksBeforeLevel(startBuild, nextAdvances, level);
    if (!isValidSkillAdvanceEntry(candidate, ranksBefore)) return;
    onSkillAdvancesChange([...nextAdvances, candidate].sort((a, b) => a.level - b.level));
    onSpecializationsChange(nextSpecs);
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4" data-testid="skill-progression-slots">
      <div className="flex items-center gap-1">
        <h3 className="font-semibold">Fertigkeitsentwicklung (Level 3–19)</h3>
        <RuleHelp label="Fertigkeitsentwicklung">
          Auf Stufe 3, 5, 7, 9, 11, 13, 15, 17 und 19 wählst du genau eine Entwicklung: bestehenden Skill +1, neuen Skill 0→1 oder eine Spezialisierung.
        </RuleHelp>
      </div>

      <div className="space-y-4">
        {unlockedLevels.map((level) => {
          const decision = getSlotDecision(level, skillAdvances, specializations);
          const ranksBefore = ranksBeforeLevel(startBuild, skillAdvances, level);
          const cap = getSagaDriveSkillCap(level);

          return (
            <div key={level} className="space-y-3 rounded-lg border border-border bg-muted/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">Level {level}</Badge>
                <span className="text-xs text-muted-foreground">Cap {cap}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Entwicklung</Label>
                  <Select
                    value={decision.kind || 'unset'}
                    onValueChange={(value) => {
                      if (value === 'unset') applySlot(level, '', undefined);
                      else applySlot(level, value as SlotDecisionKind, decision.skill);
                    }}
                  >
                    <SelectTrigger className="min-h-11"><SelectValue placeholder="Wählen …" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">— zurücksetzen —</SelectItem>
                      <SelectItem value="rank-up">Bestehenden Skill +1</SelectItem>
                      <SelectItem value="learn">Neuen Skill 0→1</SelectItem>
                      <SelectItem value="specialization">Spezialisierung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Fertigkeit</Label>
                  <Select
                    value={decision.skill ?? 'unset'}
                    onValueChange={(value) => {
                      if (value === 'unset') {
                        applySlot(level, '', undefined);
                        return;
                      }
                      applySlot(level, decision.kind || 'rank-up', value as SagaDriveSkillKey, decision.name);
                    }}
                  >
                    <SelectTrigger className="min-h-11"><SelectValue placeholder="Skill …" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">—</SelectItem>
                      {sagaDriveSkillDefinitions.map((skill) => {
                        const rank = ranksBefore[skill.key];
                        const rankUpOk = rank >= 1 && rank + 1 <= cap;
                        const learnOk = rank === 0;
                        const specCount = specializations.filter((entry) => entry.skill === skill.key).length;
                        const specOk = isValidSpecializationForSkillRank(rank, specCount);
                        const disabled = decision.kind === 'learn' ? !learnOk
                          : decision.kind === 'specialization' ? !specOk
                            : decision.kind === 'rank-up' ? !rankUpOk
                              : false;
                        return (
                          <SelectItem key={skill.key} value={skill.key} disabled={disabled}>
                            {skill.label} (Rang {rank})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {decision.kind === 'specialization' ? (
                <div className="space-y-1">
                  <Label>Spezialisierungsname</Label>
                  <Input
                    value={decision.name ?? ''}
                    onChange={(event) => {
                      if (decision.skill) applySlot(level, 'specialization', decision.skill, event.target.value);
                    }}
                    placeholder="z. B. Chirurgie"
                  />
                </div>
              ) : null}

              {decision.kind && decision.skill ? (
                <p className="text-xs text-muted-foreground">
                  {decision.kind === 'rank-up' && `${getSagaDriveSkill(decision.skill).label}: ${ranksBefore[decision.skill]} → ${ranksBefore[decision.skill] + 1}`}
                  {decision.kind === 'learn' && `${getSagaDriveSkill(decision.skill).label}: 0 → 1`}
                  {decision.kind === 'specialization' && decision.name?.trim() ? `Spezialisierung „${decision.name}" auf ${getSagaDriveSkill(decision.skill).label}` : null}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
