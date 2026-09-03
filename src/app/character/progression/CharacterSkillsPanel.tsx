/**
 * CharacterSkillsPanel — Attribute carousel, connected skill nodes, formula panel, and level slots (#91).
 * Location: src/app/character/progression/CharacterSkillsPanel.tsx
 */
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import {
  SAGA_DRIVE_START_FREE_SKILL_POINTS,
  createEmptySagaDriveSkillRanks,
  getSagaDriveSkill,
  sagaDriveAttributeDefinitions,
  sagaDriveSkillDefinitions,
  type SagaDriveAttributeKey,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import type { CharacterAttributesDto } from '../../../modules/characters/types/character.types';
import {
  getSagaDriveSkillCap,
  resolveSagaDriveSkillRanksSafe,
  type SagaDriveBackgroundSkillPoints,
  type SagaDriveSkillAdvanceDto,
  type SagaDriveSpecializationRecordDto,
  type SagaDriveStartSkillBuild,
} from '../../../modules/rulesets/skillProgression';
import type { CarouselScrollPhase } from '../../../modules/characters/hooks/carousel.types';
import { AttributeSkillConnector } from './AttributeSkillConnector';
import { AttributeSkillNode } from './AttributeSkillNode';
import { AttributeSkillsCarousel } from './AttributeSkillsCarousel';
import { SkillCheckFormulaPanel } from './SkillCheckFormulaPanel';
import { SkillProgressionSlotsPanel } from './SkillProgressionSlotsPanel';

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

function attributeForSkill(skill: SagaDriveSkillKey | undefined): SagaDriveAttributeKey {
  if (!skill) return sagaDriveAttributeDefinitions[0]?.key ?? 'strength';
  return getSagaDriveSkill(skill).attribute;
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
  const selected = selectedSkill ? getSagaDriveSkill(selectedSkill) : undefined;
  const backgroundSpec = specializations.find((entry) => entry.source === 'background');

  const [activeAttribute, setActiveAttribute] = useState<SagaDriveAttributeKey>(() => attributeForSkill(selectedSkill));
  const [scrollPhase, setScrollPhase] = useState<CarouselScrollPhase>('settled');
  const [hoveredSkill, setHoveredSkill] = useState<SagaDriveSkillKey | null>(null);
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);

  useEffect(() => {
    if (!selectedSkill) return;
    const next = attributeForSkill(selectedSkill);
    setActiveAttribute((current) => (current === next ? current : next));
  }, [selectedSkill]);

  useEffect(() => {
    if (!selectedSkill) {
      setIsFormulaOpen(false);
      return;
    }
    setIsFormulaOpen(true);
  }, [selectedSkill]);

  const handleScrollPhaseChange = useCallback((phase: CarouselScrollPhase) => {
    setScrollPhase(phase);
  }, []);

  const handleStandstill = useCallback(() => {
    setScrollPhase('settled');
  }, []);

  const changeFreeRank = (skill: SagaDriveSkillKey, delta: -1 | 1) => {
    const currentFree = freeRanks[skill];
    const currentFinal = finalRanks[skill];
    if (delta > 0 && (freeUsed >= SAGA_DRIVE_START_FREE_SKILL_POINTS || currentFinal >= skillCap)) return;
    if (delta < 0 && currentFree <= 0) return;
    onFreeRanksChange({ ...freeRanks, [skill]: currentFree + delta });
  };

  const attributeSkills = sagaDriveSkillDefinitions.filter((skill) => skill.attribute === activeAttribute);
  const rankedSkills = attributeSkills
    .filter((skill) => finalRanks[skill.key] > 0)
    .map((skill) => skill.key);
  const activeAttributeDef = sagaDriveAttributeDefinitions.find((entry) => entry.key === activeAttribute);
  const connectorActiveSkill = hoveredSkill ?? (selectedSkill && attributeForSkill(selectedSkill) === activeAttribute ? selectedSkill : null);

  return (
    <div className="space-y-5" data-attribute-skills-panel>
      <SkillProgressionSlotsPanel
        characterLevel={characterLevel}
        startBuild={startBuild}
        skillAdvances={skillAdvances}
        specializations={specializations}
        onSkillAdvancesChange={onSkillAdvancesChange}
        onSpecializationsChange={onSpecializationsChange}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h3 id="attribute-skills-heading" className="text-sm font-semibold">
              Fertigkeiten nach Attribut
            </h3>
            <p className="text-xs text-muted-foreground">
              Wähle ein Attribut im Karussell. Darunter liegen die verbundenen Fertigkeiten.
            </p>
          </div>
          <Badge variant={freeUsed >= SAGA_DRIVE_START_FREE_SKILL_POINTS ? 'default' : 'outline'}>
            {freeUsed} / {SAGA_DRIVE_START_FREE_SKILL_POINTS} Punkte
          </Badge>
        </div>

        <AttributeSkillsCarousel
          selectedAttribute={activeAttribute}
          onSelect={setActiveAttribute}
          labelledBy="attribute-skills-heading"
          onScrollPhaseChange={handleScrollPhaseChange}
        />

        {attributeSkills.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
            {activeAttributeDef
              ? `${activeAttributeDef.label} besitzt bewusst keinen Standard-Skill-Cluster. Reines körperliches Aushalten wird direkt über Ausdauer abgewickelt.`
              : 'Für dieses Attribut gibt es keine Standard-Fertigkeiten.'}
          </div>
        ) : (
          <div className="space-y-2 -mt-2">
            <AttributeSkillConnector
              skills={attributeSkills.map((skill) => skill.key)}
              rankedSkills={rankedSkills}
              activeSkill={connectorActiveSkill}
              scrollPhase={scrollPhase}
              onStandstill={handleStandstill}
            />

            <div className="mx-auto w-full max-w-5xl space-y-2">
              <div
                className={`mx-auto grid w-full gap-3 ${
                  attributeSkills.length <= 2
                    ? 'sm:grid-cols-2 max-w-2xl'
                    : attributeSkills.length === 3
                      ? 'sm:grid-cols-2 lg:grid-cols-3 max-w-3xl'
                      : 'sm:grid-cols-2 xl:grid-cols-4'
                }`}
                data-attribute-skill-grid
              >
                {attributeSkills.map((skill) => {
                  const freeRank = freeRanks[skill.key];
                  const finalRank = finalRanks[skill.key];
                  const backgroundValue = backgroundSkillPoints[skill.key] ?? 0;
                  const devSpecs = specializations.filter(
                    (entry) => entry.skill === skill.key && entry.source === 'skill-development',
                  );
                  const isBackgroundSpecialized =
                    backgroundSpec?.skill === skill.key && Boolean(backgroundSpec.name.trim());

                  return (
                    <AttributeSkillNode
                      key={skill.key}
                      skillKey={skill.key}
                      freeRank={freeRank}
                      finalRank={finalRank}
                      backgroundValue={backgroundValue}
                      inBackgroundPool={backgroundPoolSkills.includes(skill.key)}
                      archetypeTrained={archetypeTrainingSkill === skill.key}
                      backgroundSpecializationName={isBackgroundSpecialized ? backgroundSpec?.name : undefined}
                      developmentSpecializationNames={devSpecs.map((entry) => entry.name)}
                      focused={selectedSkill === skill.key}
                      canDecreaseFree={freeRank > 0}
                      canIncreaseFree={freeUsed < SAGA_DRIVE_START_FREE_SKILL_POINTS && finalRank < skillCap}
                      onSelect={() => onSelectedSkillChange?.(skill.key)}
                      onHoverChange={setHoveredSkill}
                      onChangeFreeRank={(delta) => changeFreeRank(skill.key, delta)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {selected && selectedSkill ? (
          <Accordion
            type="single"
            collapsible
            value={isFormulaOpen ? 'skill-check-formula' : undefined}
            onValueChange={(value) => setIsFormulaOpen(value === 'skill-check-formula')}
            data-skill-check-formula="true"
          >
            <AccordionItem value="skill-check-formula" className="overflow-hidden rounded-lg border border-border bg-card">
              <AccordionTrigger
                className="px-4 py-3 hover:no-underline"
                aria-label={`Formeldetails fuer ${selected.label} ${isFormulaOpen ? 'einklappen' : 'ausklappen'}`}
              >
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold">Fertigkeitsprobe: {selected.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Rang {finalRanks[selectedSkill]} einsehen und Formeldetails {isFormulaOpen ? 'einklappen' : 'ausklappen'}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <SkillCheckFormulaPanel
                  skillKey={selectedSkill}
                  characterLevel={characterLevel}
                  attributes={attributes}
                  finalRank={finalRanks[selectedSkill]}
                  freeRank={freeRanks[selectedSkill]}
                  backgroundPoints={backgroundSkillPoints}
                  archetypePoint={archetypeTrainingSkill === selectedSkill}
                  specializationName={
                    backgroundSpec?.skill === selectedSkill
                      ? backgroundSpec.name
                      : specializations.find(
                          (entry) => entry.skill === selectedSkill && entry.source === 'skill-development',
                        )?.name
                  }
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}
      </div>
    </div>
  );
}

export { createEmptySagaDriveSkillRanks, resolveSagaDriveSkillRanksSafe };
