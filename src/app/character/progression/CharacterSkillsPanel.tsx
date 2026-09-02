import { Minus, Plus } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  SAGA_DRIVE_START_FREE_SKILL_POINTS,
  SAGA_DRIVE_START_MIN_TRAINED_SKILLS,
  SAGA_DRIVE_START_SKILL_CAP,
  createEmptySagaDriveSkillRanks,
  getSagaDriveAttribute,
  getSagaDriveSkill,
  sagaDriveAttributeDefinitions,
  sagaDriveSkillDefinitions,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import { SkillRuleHelpContent } from './skillRuleHelp';
import { RuleHelp } from './RuleHelp';

interface CharacterSkillsPanelProps {
  freeRanks: Record<SagaDriveSkillKey, number>;
  onFreeRanksChange: (ranks: Record<SagaDriveSkillKey, number>) => void;
  backgroundPoolSkills: readonly SagaDriveSkillKey[];
  backgroundTrainedSkills: readonly SagaDriveSkillKey[];
  archetypeTrainingSkill?: SagaDriveSkillKey;
  specializationSkill?: SagaDriveSkillKey;
  specializationName?: string;
  selectedSkill?: SagaDriveSkillKey;
  onSelectedSkillChange?: (skill: SagaDriveSkillKey) => void;
}

function getSourceRank(skill: SagaDriveSkillKey, backgroundTrainedSkills: readonly SagaDriveSkillKey[], archetypeTrainingSkill?: SagaDriveSkillKey): number {
  return (backgroundTrainedSkills.includes(skill) ? 1 : 0) + (archetypeTrainingSkill === skill ? 1 : 0);
}

export function getSagaDriveFinalSkillRanks(
  freeRanks: Record<SagaDriveSkillKey, number>,
  backgroundTrainedSkills: readonly SagaDriveSkillKey[],
  archetypeTrainingSkill?: SagaDriveSkillKey,
): Record<SagaDriveSkillKey, number> {
  const result = createEmptySagaDriveSkillRanks();
  for (const skill of sagaDriveSkillDefinitions) {
    result[skill.key] = freeRanks[skill.key] + getSourceRank(skill.key, backgroundTrainedSkills, archetypeTrainingSkill);
  }
  return result;
}

function rankLabel(rank: number): string {
  if (rank <= 0) return 'Untrainiert';
  if (rank === 1) return 'Trainiert';
  if (rank === 2) return 'Geübt';
  if (rank === 3) return 'Fachkundig';
  if (rank === 4) return 'Meisterlich';
  return 'Weltklasse';
}

export function CharacterSkillsPanel({
  freeRanks,
  onFreeRanksChange,
  backgroundPoolSkills,
  backgroundTrainedSkills,
  archetypeTrainingSkill,
  specializationSkill,
  specializationName,
  selectedSkill,
  onSelectedSkillChange,
}: CharacterSkillsPanelProps) {
  const freeUsed = sagaDriveSkillDefinitions.reduce((sum, skill) => sum + freeRanks[skill.key], 0);
  const finalRanks = getSagaDriveFinalSkillRanks(freeRanks, backgroundTrainedSkills, archetypeTrainingSkill);
  const trainedCount = sagaDriveSkillDefinitions.filter((skill) => finalRanks[skill.key] > 0).length;
  const hasOverflow = sagaDriveSkillDefinitions.some((skill) => finalRanks[skill.key] > SAGA_DRIVE_START_SKILL_CAP);
  const totalPoints = freeUsed + backgroundTrainedSkills.length + (archetypeTrainingSkill ? 1 : 0);
  const selected = selectedSkill ? getSagaDriveSkill(selectedSkill) : undefined;

  const changeFreeRank = (skill: SagaDriveSkillKey, delta: -1 | 1) => {
    const currentFree = freeRanks[skill];
    const currentFinal = finalRanks[skill];
    if (delta > 0 && (freeUsed >= SAGA_DRIVE_START_FREE_SKILL_POINTS || currentFinal >= SAGA_DRIVE_START_SKILL_CAP)) return;
    if (delta < 0 && currentFree <= 0) return;
    onFreeRanksChange({ ...freeRanks, [skill]: currentFree + delta });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Hintergrund</p><p className="mt-1 text-lg font-semibold">{backgroundTrainedSkills.length} / 2</p></div>
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Archetyp</p><p className="mt-1 text-lg font-semibold">{archetypeTrainingSkill ? 1 : 0} / 1</p></div>
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Freie Punkte</p><p className="mt-1 text-lg font-semibold">{freeUsed} / {SAGA_DRIVE_START_FREE_SKILL_POINTS}</p></div>
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Gesamt</p><p className="mt-1 text-lg font-semibold">{totalPoints} / 10</p><p className="text-[11px] text-muted-foreground">{trainedCount} / {SAGA_DRIVE_START_MIN_TRAINED_SKILLS} trainiert</p></div>
      </div>

      {(freeUsed !== SAGA_DRIVE_START_FREE_SKILL_POINTS || trainedCount < SAGA_DRIVE_START_MIN_TRAINED_SKILLS || hasOverflow) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          {freeUsed !== SAGA_DRIVE_START_FREE_SKILL_POINTS && <p>Vergib genau {SAGA_DRIVE_START_FREE_SKILL_POINTS} freie Fertigkeitspunkte.</p>}
          {trainedCount < SAGA_DRIVE_START_MIN_TRAINED_SKILLS && <p>Mindestens {SAGA_DRIVE_START_MIN_TRAINED_SKILLS} Fertigkeiten müssen Wert 1 oder höher erreichen.</p>}
          {hasOverflow && <p>Auf Stufe 1 darf keine Fertigkeit höher als {SAGA_DRIVE_START_SKILL_CAP} sein.</p>}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          {sagaDriveAttributeDefinitions.map((attribute) => {
            const attributeSkills = sagaDriveSkillDefinitions.filter((skill) => skill.attribute === attribute.key);
            if (attributeSkills.length === 0) {
              return (
                <section key={attribute.key} className="rounded-lg border border-dashed border-border bg-muted/10 p-4">
                  <div className="flex items-center gap-2"><h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{attribute.label}</h3><RuleHelp label={attribute.label}>{attribute.description}</RuleHelp></div>
                  <p className="mt-2 text-sm text-muted-foreground">Ausdauer besitzt bewusst keinen Standard-Skill-Cluster. Reines körperliches Aushalten wird direkt über Ausdauer abgewickelt.</p>
                </section>
              );
            }
            const clusterActive = selected ? selected.attribute === attribute.key : false;
            return (
              <section key={attribute.key} className={`rounded-lg border p-4 transition-colors ${clusterActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/5'}`}>
                <div className="flex items-center gap-2"><h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{attribute.label}</h3><RuleHelp label={attribute.label}>{attribute.description}</RuleHelp></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {attributeSkills.map((skill) => {
                    const freeRank = freeRanks[skill.key];
                    const finalRank = finalRanks[skill.key];
                    const isSpecialized = specializationSkill === skill.key && Boolean(specializationName?.trim());
                    const focused = selectedSkill === skill.key;
                    const inBackgroundPool = backgroundPoolSkills.includes(skill.key);
                    const backgroundTrained = backgroundTrainedSkills.includes(skill.key);
                    const archetypeTrained = archetypeTrainingSkill === skill.key;
                    return (
                      <div key={skill.key} className={`rounded-lg border bg-card p-3 transition-colors ${focused ? 'border-primary ring-1 ring-primary/30' : inBackgroundPool ? 'border-primary/30' : 'border-border'}`}>
                        <button type="button" className="w-full text-left focus-visible:outline-none" onClick={() => onSelectedSkillChange?.(skill.key)} onFocus={() => onSelectedSkillChange?.(skill.key)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1"><p className="font-medium">{skill.label}</p><RuleHelp label={skill.label}><SkillRuleHelpContent skillKey={skill.key} /></RuleHelp></div>
                              <p className="text-xs text-muted-foreground">Standard: {getSagaDriveAttribute(skill.attribute).shortLabel}</p>
                            </div>
                            <div className="text-right"><p className="text-lg font-semibold">{finalRank}</p><p className="text-[11px] text-muted-foreground">{rankLabel(finalRank)}</p></div>
                          </div>
                        </button>
                        <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">
                          {inBackgroundPool && <Badge variant="outline">Hintergrund-Pool</Badge>}
                          {backgroundTrained && <Badge variant="outline">Hintergrund +1</Badge>}
                          {archetypeTrained && <Badge variant="outline">Archetyp +1</Badge>}
                          {freeRank > 0 && <Badge variant="secondary">Frei +{freeRank}</Badge>}
                          {isSpecialized && <Badge>{specializationName} +2</Badge>}
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" size="icon" className="size-10" onClick={() => changeFreeRank(skill.key, -1)} disabled={freeRank <= 0} aria-label={`${skill.label} freien Punkt entfernen`}><Minus className="h-4 w-4" /></Button>
                          <Button type="button" variant="outline" size="icon" className="size-10" onClick={() => changeFreeRank(skill.key, 1)} disabled={freeUsed >= SAGA_DRIVE_START_FREE_SKILL_POINTS || finalRank >= SAGA_DRIVE_START_SKILL_CAP} aria-label={`${skill.label} freien Punkt hinzufügen`}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="h-fit rounded-lg border border-border bg-card p-4 xl:sticky xl:top-4">
          {selected ? (
            <div className="space-y-3">
              <div><p className="text-xs uppercase tracking-wide text-muted-foreground">Fertigkeitsdetails</p><h3 className="mt-1 font-semibold">{selected.label}</h3><p className="mt-1 text-sm text-muted-foreground">{selected.summary}</p></div>
              <div className="rounded-lg border border-border bg-muted/10 p-3 text-sm"><p className="font-medium">Standardattribut: {getSagaDriveAttribute(selected.attribute).label}</p><p className="mt-1 text-xs text-muted-foreground">Standardbeziehung – keine Voraussetzung. Außerhalb direkter Kämpfe kann bei passender Vorgehensweise ein anderes Attribut gelten.</p></div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Finaler Rang</span><strong>{finalRanks[selected.key]}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Hintergrund</span><strong>{backgroundTrainedSkills.includes(selected.key) ? '+1' : '—'}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Archetyp</span><strong>{archetypeTrainingSkill === selected.key ? '+1' : '—'}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Frei</span><strong>{freeRanks[selected.key] > 0 ? `+${freeRanks[selected.key]}` : '—'}</strong></div>
              </div>
              {specializationSkill === selected.key && specializationName?.trim() ? <Badge>{specializationName} +2</Badge> : null}
            </div>
          ) : (
            <div><p className="font-medium">Beziehungen verstehen</p><p className="mt-1 text-sm text-muted-foreground">Wähle eine Fertigkeit. SagaDrive hebt dann ihr Standardattribut hervor und zeigt, aus welchen Quellen ihr Rang entsteht.</p></div>
          )}
        </aside>
      </div>
    </div>
  );
}
