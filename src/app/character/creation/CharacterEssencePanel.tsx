/**
 * CharacterEssencePanel — Primäre Essenz-Auswahl per Karussell mit Manifestations-Vorschau.
 * Genutzt im Charakter-Editor unter Parameter → Essenz.
 * Location: src/app/character/creation/CharacterEssencePanel.tsx
 */
import { EssenceCarousel } from './EssenceCarousel';
import { RuleHelp } from '../shared/RuleHelp';
import type { SagaDriveEssenceKey } from '../../../modules/rulesets/characterCreation';

interface CharacterEssencePanelProps {
  selectedEssence?: SagaDriveEssenceKey;
  onEssenceChange: (value: SagaDriveEssenceKey) => void;
}

export function CharacterEssencePanel({ selectedEssence, onEssenceChange }: CharacterEssencePanelProps) {
  return (
    <div className="space-y-6" data-essence-panel>
      <div>
        <div className="flex items-center gap-1">
          <h3 id="essence-label" className="font-semibold">Primäre Essenz</h3>
          <RuleHelp label="Essenz">
            Die Essenz beschreibt, wie besondere Fähigkeiten entstehen. Sie ist unabhängig vom Archetyp und gibt keine automatischen Attributs- oder Fertigkeitsboni.
          </RuleHelp>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Wie entstehen die besonderen Wirkungen deines Charakters? Wähle im Karussell.</p>
      </div>

      <EssenceCarousel
        selectedEssence={selectedEssence}
        onSelect={onEssenceChange}
        labelledBy="essence-label"
      />

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Archetyp und Essenz sind unabhängig: Ein mentaler Kämpfer oder technologischer Diplomat ist vollständig regelkonform.
      </div>
    </div>
  );
}
