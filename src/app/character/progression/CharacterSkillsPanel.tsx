/**
 * CharacterSkillsPanel — Three start sources (7/2/1), formula panel, and level slots (#91).
 * Location: src/app/character/progression/CharacterSkillsPanel.tsx
 */
import { Minus, Plus } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  SAGA_DRIVE_START_FREE_SKILL_POINTS,
  createEmptySagaDriveSkillRanks,
  getSagaDriveAttribute,
  getSagaDriveSkill,
  sagaDriveAttributeDefinitions,
  sagaDriveSkillDefinitions,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import type { CharacterAttributesDto } from '../../../modules/characters/types/character.types';
import {
  SAGA_DRIVE_START_ARCHETYPE_SKILL_POINTS,
  SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS,
  getSagaDriveSkillCap,
  resolveSagaDriveSkillRanksSafe,
  sumBackgroundSkillPointsUsed,
  type SagaDriveBackgroundSkillPoints,
  type SagaDriveSkillAdvanceDto,
  type SagaDriveSpecializationRecordDto,
  type SagaDriveStartSkillBuild,
} from '../../../modules/rulesets/skillProgression';
import { SkillCheckFormulaPanel } from './SkillCheckFormulaPanel';
import { SkillProgressionSlotsPanel } from './SkillProgressionSlotsPanel';
import { SkillRuleHelpContent } from './skillRuleHelp';
import { RuleHelp } from './RuleHelp';

interface CharacterSkillsPanelProps {
  characterLevel: number;
  attributes: CharacterAttributesDto;
  freeRanks: Record<SagaDriveSkillKey, number>;
  onFreeRanksChange: (ranks: Record<SagaDriveSkillKey, number>) => void;
  backgroundPoolSkills: readonly SagaDriveSkillKey[];
  backgroundSkillPoints: SagaDriveBackgroundSkillPoints;
  archetypeTrainingSkill?: SagaDriveSkillKey;
  skillAdvances: SagaDriveSkillAdvanceDto[];
  onSkillAdvancesChange: (advances: SagaDriveSkillAdvanceDto[]) => void;
  specializations: SagaDriveSpecializationRecordDto[];
  onSpecializationsChange: (entries: SagaDriveSpecializationRecordDto[]) => void;
  selectedSkill?: SagaDriveSkillKey;
  onSelectedSkillChange?: (skill: SagaDriveSkillKey) => void;
}

function rankLabel(rank: number): string {
  if (rank <= 0) return 'Untrainiert';
  if (rank === 1) return 'Trainiert';
  if (rank === 2) return 'Geübt';
  if (rank === 3) return 'Fachkundig';
  if (rank === 4) return 'Meisterlich';
  return 'Weltklasse';
}

function sumBackgroundPoints(points: SagaDriveBackgroundSkillPoints): number {
  return sumBackgroundSkillPointsUsed(points);
}

export function CharacterSkillsPanel({
  characterLevel,
  attributes,
  freeRanks,
  onFreeRanksChange,
  backgroundPoolSkills,
  backgroundSkillPoints,
  archetypeTrainingSkill,
  skillAdvances,
  onSkillAdvancesChange,
  specializations,
  onSpecializationsChange,
  selectedSkill,
  onSelectedSkillChange,
}: CharacterSkillsPanelProps) {
  const freeUsed = sagaDriveSkillDefinitions.reduce((sum, skill) => sum + freeRanks[skill.key], 0);
  const backgroundUsed = sumBackgroundPoints(backgroundSkillPoints);
  const startBuild: SagaDriveStartSkillBuild = {
    freeSkillRanks: freeRanks,
    backgroundSkillPoints,
    archetypeTrainingSkill,
  };
  const finalRanks = resolveSagaDriveSkillRanksSafe(
    { ...startBuild, skillAdvances, specializations },
    characterLevel,
  );
  const skillCap = getSagaDriveSkillCap(characterLevel);
  const hasOverflow = sagaDriveSkillDefinitions.some((skill) => finalRanks[skill.key] > skillCap);
  const selected = selectedSkill ? getSagaDriveSkill(selectedSkill) : undefined;
  const backgroundSpec = specializations.find((entry) => entry.source === 'background');

  const changeFreeRank = (skill: SagaDriveSkillKey, delta: -1 | 1) => {
    const currentFree = freeRanks[skill];
    const currentFinal = finalRanks[skill];
    if (delta > 0 && (freeUsed >= SAGA_DRIVE_START_FREE_SKILL_POINTS || currentFinal >= skillCap)) return;
    if (delta < 0 && currentFree <= 0) return;
    onFreeRanksChange({ ...freeRanks, [skill]: currentFree + delta });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Freie Punkte</p><p className="mt-1 text-lg font-semibold">{freeUsed} / {SAGA_DRIVE_START_FREE_SKILL_POINTS}</p></div>
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Hintergrund</p><p className="mt-1 text-lg font-semibold">{backgroundUsed} / {SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS}</p></div>
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Archetyp</p><p className="mt-1 text-lg font-semibold">{archetypeTrainingSkill ? SAGA_DRIVE_START_ARCHETYPE_SKILL_POINTS : 0} / {SAGA_DRIVE_START_ARCHETYPE_SKILL_POINTS}</p></div>
        <div className="rounded-lg border border-border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Level-Cap</p><p className="mt-1 text-lg font-semibold">{skillCap}</p><p className="text-[11px] text-muted-foreground">Start gesamt 10 Punkte</p></div>
      </div>

      {(freeUsed !== SAGA_DRIVE_START_FREE_SKILL_POINTS || backgroundUsed !== SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS || !archetypeTrainingSkill || hasOverflow) && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          {freeUsed !== SAGA_DRIVE_START_FREE_SKILL_POINTS && <p>Vergib genau {SAGA_DRIVE_START_FREE_SKILL_POINTS} freie Fertigkeitspunkte.</p>}
          {backgroundUsed !== SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS && <p>Verteile genau {SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS} Hintergrundpunkte im Hintergrund-Panel.</p>}
          {!archetypeTrainingSkill && <p>Wähle unter Archetype eine typische Fertigkeit (+1).</p>}
          {hasOverflow && <p>Auf Stufe {characterLevel} darf keine Fertigkeit höher als {skillCap} sein.</p>}
        </div>
      )}

      <SkillProgressionSlotsPanel
        characterLevel={characterLevel}
        startBuild={startBuild}
        skillAdvances={skillAdvances}
        specializations={specializations}
        onSkillAdvancesChange={onSkillAdvancesChange}
        onSpecializationsChange={onSpecializationsChange}
      />

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
                    const backgroundValue = backgroundSkillPoints[skill.key] ?? 0;
                    const devSpecs = specializations.filter((entry) => entry.skill === skill.key && entry.source === 'skill-development');
                    const isBackgroundSpecialized = backgroundSpec?.skill === skill.key && Boolean(backgroundSpec.name.trim());
                    const focused = selectedSkill === skill.key;
                    const inBackgroundPool = backgroundPoolSkills.includes(skill.key);
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
                          {backgroundValue > 0 && <Badge variant="outline">Hintergrund +{backgroundValue}</Badge>}
                          {archetypeTrained && <Badge variant="outline">Archetyp +1</Badge>}
                          {freeRank > 0 && <Badge variant="secondary">Frei +{freeRank}</Badge>}
                          {isBackgroundSpecialized && <Badge>{backgroundSpec?.name} +2</Badge>}
                          {devSpecs.map((entry) => <Badge key={`${entry.acquiredAtLevel}-${entry.name}`} variant="secondary">{entry.name}</Badge>)}
                        </div>
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" size="icon" className="size-10" onClick={() => changeFreeRank(skill.key, -1)} disabled={freeRank <= 0} aria-label={`${skill.label} freien Punkt entfernen`}><Minus className="h-4 w-4" /></Button>
                          <Button type="button" variant="outline" size="icon" className="size-10" onClick={() => changeFreeRank(skill.key, 1)} disabled={freeUsed >= SAGA_DRIVE_START_FREE_SKILL_POINTS || finalRank >= skillCap} aria-label={`${skill.label} freien Punkt hinzufügen`}><Plus className="h-4 w-4" /></Button>
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
          {selected && selectedSkill ? (
            <SkillCheckFormulaPanel
              skillKey={selectedSkill}
              characterLevel={characterLevel}
              attributes={attributes}
              finalRank={finalRanks[selectedSkill]}
              freeRank={freeRanks[selectedSkill]}
              backgroundPoints={backgroundSkillPoints}
              archetypePoint={archetypeTrainingSkill === selectedSkill}
              specializationName={
                backgroundSpec?.skill === selectedSkill ? backgroundSpec.name
                  : specializations.find((entry) => entry.skill === selectedSkill && entry.source === 'skill-development')?.name
              }
            />
          ) : (
            <div><p className="font-medium">Beziehungen verstehen</p><p className="mt-1 text-sm text-muted-foreground">Wähle eine Fertigkeit. SagaDrive zeigt Herkunft, globalen und anwendbaren Erfahrungsbonus sowie die volle d20-Formel.</p></div>
          )}
        </aside>
      </div>
    </div>
  );
}

export { createEmptySagaDriveSkillRanks, resolveSagaDriveSkillRanksSafe };
