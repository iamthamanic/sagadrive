import { Badge } from '../../../components/ui/badge';
import type { AbilityDto } from '../../../modules/characters/types/character.types';
import { RuleHelp } from './RuleHelp';

interface CharacterAbilitiesPanelProps {
  abilities: readonly AbilityDto[];
}

export function CharacterAbilitiesPanel({ abilities }: CharacterAbilitiesPanelProps) {
  if (abilities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
        <p className="font-medium">Noch keine Kernfähigkeit</p>
        <p className="mt-1 text-sm text-muted-foreground">Wähle im Parameter-Tab deinen Primärarchetyp. Seine Rang-I-Kernfähigkeit erscheint dort automatisch.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">Regelgebundene Fähigkeiten</p>
          <p className="text-sm text-muted-foreground">Fähigkeiten entstehen aus Archetyp, Essenz und späteren Entwicklungswahlen. Sie werden nicht frei als Werteblöcke erfunden.</p>
        </div>
        <RuleHelp label="Fähigkeiten">
          Jede SagaDrive-Fähigkeit definiert Quelle, Rang, Aktivierungsart, Auslöser, Ziel, Reichweite, Effekt, Dauer, Ressource oder Nutzungsbegrenzung und Skalierung. Auf Stufe 1 wird zunächst die Kernfähigkeit des Primärarchetyps vergeben.
        </RuleHelp>
      </div>

      <div className="space-y-3">
        {abilities.map((ability) => (
          <article key={ability.id} className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{ability.name}</h3>
                  {ability.source && <Badge variant="outline">{ability.source}</Badge>}
                  {ability.rank && <Badge>Rang {ability.rank}</Badge>}
                  {ability.action_type && <Badge variant="secondary">{ability.action_type}</Badge>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{ability.description}</p>
                <p className="mt-3 text-sm leading-relaxed">{ability.effect}</p>
              </div>
            </div>
            {(ability.usage_limit || (ability.tags && ability.tags.length > 0)) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                {ability.usage_limit && <Badge variant="outline">{ability.usage_limit}</Badge>}
                {ability.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Weitere Essenzmanifestationen und Rang-II-bis-V-Fähigkeiten werden ergänzt, sobald der verbindliche Fähigkeitskatalog vorliegt. Es werden bewusst keine Platzhalter-Zauber erzeugt.
      </div>
    </div>
  );
}
