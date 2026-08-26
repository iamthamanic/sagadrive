/**
 * CharacterArchetypePanel — Archetyp-Auswahl per Karussell mit Archetyp-Punkt und freier Fertigkeitsverteilung.
 * Location: src/modules/characters/components/CharacterArchetypePanel.tsx
 */
import {
  sagaDriveArchetypeOptions,
  type SagaDriveArchetypeKey,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';
import type { AbilityDto, CharacterAttributesDto } from '../types/character.types';
import { ArchetypeCarousel } from './ArchetypeCarousel';
import { ArchetypeSkillChoice } from './ArchetypeSkillChoice';
import { CharacterSkillsPanel } from './CharacterSkillsPanel';
import { RuleHelp } from './RuleHelp';

interface CharacterArchetypePanelProps {
  selectedArchetype?: SagaDriveArchetypeKey;
  onArchetypeChange: (value: SagaDriveArchetypeKey) => void;
  archetypeTrainingSkill?: SagaDriveSkillKey;
  onArchetypeTrainingSkillChange: (skill: SagaDriveSkillKey) => void;
  coreAbility?: AbilityDto;
  freeRanks: Record<SagaDriveSkillKey, number>;
  onFreeRanksChange: (ranks: Record<SagaDriveSkillKey, number>) => void;
  backgroundTrainedSkills: readonly SagaDriveSkillKey[];
  attributes: CharacterAttributesDto;
  experienceBonus?: number;
  specializationSkill?: SagaDriveSkillKey;
  specializationName?: string;
}

export function CharacterArchetypePanel({
  selectedArchetype,
  onArchetypeChange,
  archetypeTrainingSkill,
  onArchetypeTrainingSkillChange,
  freeRanks,
  onFreeRanksChange,
  backgroundTrainedSkills,
  attributes,
  experienceBonus = 1,
  specializationSkill,
  specializationName,
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
          <section className="space-y-4">
            <SeparatorHeading title="Freie Fertigkeitspunkte" description="Verteile die verbleibenden 7 Punkte auf beliebige Fertigkeiten. Hintergrund- und Archetyp-Punkte sind bereits eingerechnet." />
            <CharacterSkillsPanel
              freeRanks={freeRanks}
              onFreeRanksChange={onFreeRanksChange}
              backgroundTrainedSkills={backgroundTrainedSkills}
              archetypeSkills={selectedOption.skills}
              archetypeTrainingSkill={archetypeTrainingSkill}
              onArchetypeTrainingSkillChange={onArchetypeTrainingSkillChange}
              specializationSkill={specializationSkill}
              specializationName={specializationName}
              hideArchetypePoint
            />
          </section>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          Wähle einen Archetyp, um den Archetyp-Punkt und die freie Fertigkeitsverteilung zu bearbeiten.
        </div>
      )}
    </div>
  );
}

function SeparatorHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
