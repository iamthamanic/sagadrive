import { Minus, Plus } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import {
  SAGA_DRIVE_START_FREE_SKILL_POINTS,
  SAGA_DRIVE_START_MIN_TRAINED_SKILLS,
  SAGA_DRIVE_START_SKILL_CAP,
  createEmptySagaDriveSkillRanks,
  getSagaDriveAttribute,
  getSagaDriveSkill,
  isSagaDriveSkillKey,
  sagaDriveAttributeDefinitions,
  sagaDriveSkillDefinitions,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';
import { RuleHelp } from './RuleHelp';

interface CharacterSkillsPanelProps {
  freeRanks: Record<SagaDriveSkillKey, number>;
  onFreeRanksChange: (ranks: Record<SagaDriveSkillKey, number>) => void;
  backgroundTrainedSkills: readonly SagaDriveSkillKey[];
  archetypeSkills: readonly SagaDriveSkillKey[];
  archetypeTrainingSkill?: SagaDriveSkillKey;
  onArchetypeTrainingSkillChange: (skill: SagaDriveSkillKey) => void;
  specializationSkill?: SagaDriveSkillKey;
  specializationName?: string;
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

export function CharacterSkillsPanel({
  freeRanks,
  onFreeRanksChange,
  backgroundTrainedSkills,
  archetypeSkills,
  archetypeTrainingSkill,
  onArchetypeTrainingSkillChange,
  specializationSkill,
  specializationName,
}: CharacterSkillsPanelProps) {
  const freeUsed = sagaDriveSkillDefinitions.reduce((sum, skill) => sum + freeRanks[skill.key], 0);
  const finalRanks = getSagaDriveFinalSkillRanks(freeRanks, backgroundTrainedSkills, archetypeTrainingSkill);
  const trainedCount = sagaDriveSkillDefinitions.filter((skill) => finalRanks[skill.key] > 0).length;
  const hasOverflow = sagaDriveSkillDefinitions.some((skill) => finalRanks[skill.key] > SAGA_DRIVE_START_SKILL_CAP);

  const changeFreeRank = (skill: SagaDriveSkillKey, delta: -1 | 1) => {
    const currentFree = freeRanks[skill];
    const currentFinal = finalRanks[skill];
    if (delta > 0 && (freeUsed >= SAGA_DRIVE_START_FREE_SKILL_POINTS || currentFinal >= SAGA_DRIVE_START_SKILL_CAP)) return;
    if (delta < 0 && currentFree <= 0) return;
    onFreeRanksChange({ ...freeRanks, [skill]: currentFree + delta });
  };

  const handleArchetypeSkillChange = (value: string) => {
    if (isSagaDriveSkillKey(value)) onArchetypeTrainingSkillChange(value);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Freie Punkte</p><p className="mt-1 text-lg font-semibold">{freeUsed} / {SAGA_DRIVE_START_FREE_SKILL_POINTS}</p></div>
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Gesamtpunkte</p><p className="mt-1 text-lg font-semibold">{freeUsed + backgroundTrainedSkills.length + (archetypeTrainingSkill ? 1 : 0)} / 10</p></div>
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Trainierte Fertigkeiten</p><p className="mt-1 text-lg font-semibold">{trainedCount} / mindestens {SAGA_DRIVE_START_MIN_TRAINED_SKILLS}</p></div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-medium">Archetyp-Punkt</p><p className="text-sm text-muted-foreground">Dein Primärarchetyp gibt 1 Punkt in einer seiner typischen Fertigkeiten.</p></div><RuleHelp label="Archetyp-Punkt">Dieser Punkt ist Teil der 10 Start-Fertigkeitspunkte. Er muss in eine typische Fertigkeit deines Primärarchetyps gelegt werden.</RuleHelp></div>
        <Select value={archetypeTrainingSkill ?? ''} onValueChange={handleArchetypeSkillChange}>
          <SelectTrigger className="mt-3" aria-label="Archetyp-Fertigkeit"><SelectValue placeholder="Archetyp-Fertigkeit wählen" /></SelectTrigger>
          <SelectContent>
            {archetypeSkills.map((skillKey) => {
              const skill = getSagaDriveSkill(skillKey);
              const wouldOverflow = archetypeTrainingSkill !== skillKey && freeRanks[skillKey] + (backgroundTrainedSkills.includes(skillKey) ? 1 : 0) >= SAGA_DRIVE_START_SKILL_CAP;
              return <SelectItem key={skillKey} value={skillKey} disabled={wouldOverflow}>{skill.label}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {(freeUsed !== SAGA_DRIVE_START_FREE_SKILL_POINTS || trainedCount < SAGA_DRIVE_START_MIN_TRAINED_SKILLS || hasOverflow) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          {freeUsed !== SAGA_DRIVE_START_FREE_SKILL_POINTS && <p>Vergib genau {SAGA_DRIVE_START_FREE_SKILL_POINTS} freie Fertigkeitspunkte.</p>}
          {trainedCount < SAGA_DRIVE_START_MIN_TRAINED_SKILLS && <p>Mindestens {SAGA_DRIVE_START_MIN_TRAINED_SKILLS} Fertigkeiten müssen Wert 1 oder höher erreichen.</p>}
          {hasOverflow && <p>Auf Stufe 1 darf keine Fertigkeit höher als {SAGA_DRIVE_START_SKILL_CAP} sein.</p>}
        </div>
      )}

      {sagaDriveAttributeDefinitions.map((attribute) => {
        const attributeSkills = sagaDriveSkillDefinitions.filter((skill) => skill.attribute === attribute.key);
        if (attributeSkills.length === 0) return null;
        return (
          <section key={attribute.key} className="space-y-2">
            <div className="flex items-center gap-2"><h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{attribute.label}</h3><RuleHelp label={attribute.label}>{attribute.description}</RuleHelp></div>
            <div className="space-y-2">
              {attributeSkills.map((skill) => {
                const freeRank = freeRanks[skill.key];
                const finalRank = finalRanks[skill.key];
                const isSpecialized = specializationSkill === skill.key && Boolean(specializationName?.trim());
                return (
                  <div key={skill.key} className="rounded-lg border border-border bg-card px-3 py-3 sm:px-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1"><p className="font-medium">{skill.label}</p><RuleHelp label={skill.label}><span className="block font-semibold">{skill.label} · {getSagaDriveAttribute(skill.attribute).label}</span><span className="mt-1 block">{skill.summary}</span>{skill.excludes && <span className="mt-1 block opacity-90">Nicht: {skill.excludes}</span>}<span className="mt-1 block opacity-90">Typische Spezialisierungen: {skill.specializations.join(', ')}.</span></RuleHelp></div>
                        <p className="text-xs text-muted-foreground">Standardattribut: {getSagaDriveAttribute(skill.attribute).label}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {backgroundTrainedSkills.includes(skill.key) && <Badge variant="outline">Hintergrund +1</Badge>}
                          {archetypeTrainingSkill === skill.key && <Badge variant="outline">Archetyp +1</Badge>}
                          {freeRank > 0 && <Badge variant="secondary">Frei +{freeRank}</Badge>}
                          {isSpecialized && <Badge>{specializationName} +2</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <Button type="button" variant="outline" size="icon" className="size-10" onClick={() => changeFreeRank(skill.key, -1)} disabled={freeRank <= 0} aria-label={`${skill.label} freien Punkt entfernen`}><Minus className="h-4 w-4" /></Button>
                        <div className="w-14 text-center"><p className={finalRank > SAGA_DRIVE_START_SKILL_CAP ? 'text-lg font-semibold text-destructive' : 'text-lg font-semibold'}>{finalRank}</p><p className="text-[11px] text-muted-foreground">{finalRank === 0 ? 'Untrainiert' : finalRank === 1 ? 'Trainiert' : finalRank === 2 ? 'Geübt' : 'Fachkundig'}</p></div>
                        <Button type="button" variant="outline" size="icon" className="size-10" onClick={() => changeFreeRank(skill.key, 1)} disabled={freeUsed >= SAGA_DRIVE_START_FREE_SKILL_POINTS || finalRank >= SAGA_DRIVE_START_SKILL_CAP} aria-label={`${skill.label} freien Punkt hinzufügen`}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
