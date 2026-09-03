/**
 * CharacterArchetypePanel — Archetyp-Auswahl per Karussell mit genau einem Archetyp-Startpunkt.
 * Die globale Fertigkeitsverteilung lebt unter Parameter > Attribute.
 */
import { useCallback, useState } from 'react';
import {
  sagaDriveArchetypeOptions,
  type SagaDriveArchetypeKey,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import type { CharacterAttributesDto } from '../../../modules/characters/types/character.types';
import type { SagaDriveBackgroundSkillPoints } from '../../../modules/rulesets/skillProgression';
import { ArchetypeCarousel, type CarouselScrollPhase } from './ArchetypeCarousel';
import { ArchetypeSkillChoice } from './ArchetypeSkillChoice';
import { RuleHelp } from '../shared/RuleHelp';

interface CharacterArchetypePanelProps {
  selectedArchetype?: SagaDriveArchetypeKey;
  onArchetypeChange: (value: SagaDriveArchetypeKey) => void;
  archetypeTrainingSkill?: SagaDriveSkillKey;
  onArchetypeTrainingSkillChange: (skill: SagaDriveSkillKey) => void;
  coreAbility?: { name: string };
  freeRanks: Record<SagaDriveSkillKey, number>;
  backgroundSkillPoints: SagaDriveBackgroundSkillPoints;
  attributes: CharacterAttributesDto;
  experienceBonus?: number;
}

export function CharacterArchetypePanel({
  selectedArchetype,
  onArchetypeChange,
  archetypeTrainingSkill,
  onArchetypeTrainingSkillChange,
  freeRanks,
  backgroundSkillPoints,
  attributes,
  experienceBonus = 1,
}: CharacterArchetypePanelProps) {
  const selectedOption = sagaDriveArchetypeOptions.find((option) => option.value === selectedArchetype);
  const [scrollPhase, setScrollPhase] = useState<CarouselScrollPhase>('settled');

  // Phase 'settled' kommt ausschliesslich aus dem Standstill-Watcher des Connectors:
  // er beobachtet die Kartenposition per rAF und meldet sich, sobald sie 3 Frames
  // stabil ist — das Karussell steht also real, bevor die Linien erscheinen.
  const handleScrollPhaseChange = useCallback((phase: CarouselScrollPhase) => {
    setScrollPhase(phase);
  }, []);
  const handleStandstill = useCallback(() => setScrollPhase('settled'), []);

  return (
    <div className="space-y-6" data-archetype-panel>
      <div>
        <div className="flex items-center gap-1">
          <h3 id="archetype-label" className="font-semibold">Archetyp</h3>
          <RuleHelp label="Archetyp">
            Der Archetyp beschreibt, was dein Charakter besonders gut tut. Er bestimmt die Kernfähigkeit und typische Fertigkeiten, aber nicht die Quelle besonderer Kräfte.
          </RuleHelp>
        </div>
        <p className="text-sm text-muted-foreground">Was tut dein Charakter besonders gut?</p>
      </div>

      <ArchetypeCarousel
        selectedArchetype={selectedArchetype}
        onSelect={onArchetypeChange}
        labelledBy="archetype-label"
        onScrollPhaseChange={handleScrollPhaseChange}
      />

      {selectedOption ? (
        <>
          <ArchetypeSkillChoice
            skills={selectedOption.skills}
            selectedSkill={archetypeTrainingSkill}
            onSelect={onArchetypeTrainingSkillChange}
            backgroundSkillPoints={backgroundSkillPoints}
            freeRanks={freeRanks}
            attributes={attributes}
            experienceBonus={experienceBonus}
            scrollPhase={scrollPhase}
            onStandstill={handleStandstill}
          />
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-medium">Der Archetyp liefert genau 1 deiner 10 Start-Fertigkeitspunkte.</p>
            <p className="mt-1 text-muted-foreground">Die beiden Hintergrund-Punkte, sieben freien Punkte und die vollständige Quellenübersicht bearbeitest du unter <strong>Parameter → Attribute</strong>.</p>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Wähle einen Archetyp, um seinen Startpunkt und die Kernfähigkeit festzulegen.
        </div>
      )}
    </div>
  );
}
