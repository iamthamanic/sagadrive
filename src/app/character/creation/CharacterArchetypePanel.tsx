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
          <RuleHelp label="Archetyp" contentClassName="max-h-[min(24rem,70vh)] max-w-[min(22rem,90vw)] overflow-y-auto">
            <div className="space-y-2 text-xs leading-relaxed">
              <p>
                Der Archetyp ist deine Primärrolle: was dein Charakter besonders gut tut. Er ist keine Klasse mit eigenen Stufen und vergibt keine Attributsboni.
              </p>
              <p className="font-medium">Auswirkungen der Wahl:</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>du erhältst die Kernfähigkeit des Archetyps (Rang I)</li>
                <li>genau einer deiner 10 Start-Fertigkeitspunkte kommt aus dem Archetyp-Pool (+1 auf eine typische Fertigkeit)</li>
                <li>der Pool legt fest, welche vier Fertigkeiten dafür zur Auswahl stehen</li>
                <li>Spezies und Essenz bleiben unabhängig — die Essenz bestimmt die Quelle besonderer Kräfte, nicht der Archetyp</li>
              </ul>
            </div>
          </RuleHelp>
        </div>
        <p className="text-sm text-muted-foreground">
          Wähle, welche Rolle dein Charakter ausfüllt. Das bestimmt Kernfähigkeit und den einen Archetyp-Startpunkt — nicht Attribute oder Essenz.
        </p>
      </div>

      <ArchetypeCarousel
        selectedArchetype={selectedArchetype}
        onSelect={onArchetypeChange}
        labelledBy="archetype-label"
        onScrollPhaseChange={handleScrollPhaseChange}
      />

      {selectedOption ? (
        <>
          <div className="rounded-lg border border-border bg-muted/10 p-4 text-sm">
            <p className="font-medium">{selectedOption.label}</p>
            <p className="mt-1 text-muted-foreground leading-relaxed">{selectedOption.description}</p>
          </div>
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
            <p className="mt-1 text-muted-foreground">Die beiden Hintergrund-Punkte, sieben freien Punkte und die Fertigkeitsübersicht bearbeitest du unter <strong>Charakter → Attribute</strong>.</p>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Wähle einen Archetyp, um Rolle, Kernfähigkeit und den Archetyp-Startpunkt festzulegen.
        </div>
      )}
    </div>
  );
}
