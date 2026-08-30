/**
 * CharacterArchetypePanel — Archetyp-Auswahl per Karussell mit genau einem Archetyp-Startpunkt.
 * Die globale Fertigkeitsverteilung lebt unter Parameter > Kompetenzen.
 */
import {
  sagaDriveArchetypeOptions,
  type SagaDriveArchetypeKey,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';
import type { AbilityDto, CharacterAttributesDto } from '../types/character.types';
import { ArchetypeCarousel } from './ArchetypeCarousel';
import { ArchetypeSkillChoice } from './ArchetypeSkillChoice';
import { RuleHelp } from './RuleHelp';

interface CharacterArchetypePanelProps {
  selectedArchetype?: SagaDriveArchetypeKey;
  onArchetypeChange: (value: SagaDriveArchetypeKey) => void;
  archetypeTrainingSkill?: SagaDriveSkillKey;
  onArchetypeTrainingSkillChange: (skill: SagaDriveSkillKey) => void;
  coreAbility?: AbilityDto;
  freeRanks: Record<SagaDriveSkillKey, number>;
  backgroundTrainedSkills: readonly SagaDriveSkillKey[];
  attributes: CharacterAttributesDto;
  experienceBonus?: number;
}

export function CharacterArchetypePanel({
  selectedArchetype,
  onArchetypeChange,
  archetypeTrainingSkill,
  onArchetypeTrainingSkillChange,
  freeRanks,
  backgroundTrainedSkills,
  attributes,
  experienceBonus = 1,
}: CharacterArchetypePanelProps) {
  const selectedOption = sagaDriveArchetypeOptions.find((option) => option.value === selectedArchetype);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h3 id="archetype-label" className="font-semibold">Archetyp</h3>
          <RuleHelp label="Archetyp">
            Der Archetyp beschreibt, was dein Charakter besonders gut tut. Er bestimmt die Kernfähigkeit und typische Fertigkeiten, aber nicht die Quelle besonderer Kräfte.
          </RuleHelp>
        </div>
        <p className="text-sm text-muted-foreground">Was tut dein Charakter besonders gut?</p>
      </div>

      <ArchetypeCarousel selectedArchetype={selectedArchetype} onSelect={onArchetypeChange} labelledBy="archetype-label" />

      {selectedOption ? (
        <>
          <ArchetypeSkillChoice
            skills={selectedOption.skills}
            selectedSkill={archetypeTrainingSkill}
            onSelect={onArchetypeTrainingSkillChange}
            backgroundTrainedSkills={backgroundTrainedSkills}
            freeRanks={freeRanks}
            attributes={attributes}
            experienceBonus={experienceBonus}
          />
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-medium">Der Archetyp liefert genau 1 deiner 10 Start-Fertigkeitspunkte.</p>
            <p className="mt-1 text-muted-foreground">Die beiden Hintergrund-Punkte, sieben freien Punkte und die vollständige Quellenübersicht bearbeitest du unter <strong>Parameter → Kompetenzen</strong>.</p>
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
