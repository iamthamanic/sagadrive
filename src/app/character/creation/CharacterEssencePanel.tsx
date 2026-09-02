/**
 * CharacterEssencePanel — Primäre Essenz-Auswahl mit integrierter Manifestations-Vorschau.
 * Genutzt im Charakter-Editor unter Parameter → Essenz.
 */
import { Badge } from '../../../components/ui/badge';
import { sagaDriveEssenceOptions, type SagaDriveEssenceKey } from '../../../modules/rulesets/characterCreation';
import { RuleHelp } from '../shared/RuleHelp';

interface CharacterEssencePanelProps {
  selectedEssence?: SagaDriveEssenceKey;
  onEssenceChange: (value: SagaDriveEssenceKey) => void;
}

export function CharacterEssencePanel({ selectedEssence, onEssenceChange }: CharacterEssencePanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-1">
          <h3 className="font-semibold">Primäre Essenz</h3>
          <RuleHelp label="Essenz">
            Die Essenz beschreibt, wie besondere Fähigkeiten entstehen. Sie ist unabhängig vom Archetyp und gibt keine automatischen Attributs- oder Fertigkeitsboni.
          </RuleHelp>
        </div>
        <p className="text-sm text-muted-foreground">Wie entstehen die besonderen Wirkungen deines Charakters?</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {sagaDriveEssenceOptions.map((option) => {
          const selected = selectedEssence === option.value;
          return (
            <div
              key={option.value}
              className={selected ? 'rounded-lg border border-primary bg-primary/10' : 'rounded-lg border border-border bg-card transition-colors hover:border-primary/60'}
            >
              <button type="button" onClick={() => onEssenceChange(option.value)} className="w-full p-4 text-left">
                <p className="font-semibold">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{option.summary}</p>
                {!selected && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{option.description}</p>}
              </button>

              {selected && (
                <div className="space-y-3 border-t border-primary/20 px-4 pb-4 pt-3">
                  <p className="text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                  <div className="rounded-lg border border-border bg-muted/15 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Essenz-Manifestation</Badge>
                      <Badge variant="secondary">Rang I · geplant</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Die konkrete Rang-I-Manifestation für „{option.label}“ wird ergänzt, sobald der verbindliche Core-Fähigkeitskatalog vorliegt. Die Kernfähigkeit deines Archetyps bleibt davon getrennt.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Archetyp und Essenz sind unabhängig: Ein mentaler Kämpfer oder technologischer Diplomat ist vollständig regelkonform.
      </div>
    </div>
  );
}
