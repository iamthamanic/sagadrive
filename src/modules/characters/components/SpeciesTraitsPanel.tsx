import {
  SAGA_DRIVE_SPECIES_TRAIT_BUDGET,
  getCharacterCreationOptionLabel,
  getSagaDriveSpeciesTraitCost,
  getSagaDriveSpeciesTraitsForRace,
  sagaDriveRaceOptions,
  type SagaDriveSpeciesTraitKey,
} from '../../rulesets/characterCreation';
import { sagaDriveNarrowResistanceHazardOptions } from '../../rulesets/speciesResistanceHazards';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { RuleHelp } from './RuleHelp';
import { SpeciesTraitIcon } from './SpeciesTraitIcon';

export type SpeciesTraitDetailValues = Partial<Record<SagaDriveSpeciesTraitKey, string>>;

type SpeciesTraitsPanelProps = {
  species: string;
  selectedTraits: SagaDriveSpeciesTraitKey[];
  traitDetails: SpeciesTraitDetailValues;
  speciesProfileName: string;
  speciesBodyDescription: string;
  validationAttempted?: boolean;
  onSelectedTraitsChange: (traits: SagaDriveSpeciesTraitKey[]) => void;
  onTraitDetailChange: (trait: SagaDriveSpeciesTraitKey, value: string) => void;
  onSpeciesProfileNameChange: (value: string) => void;
  onSpeciesBodyDescriptionChange: (value: string) => void;
};

export function SpeciesTraitsPanel({
  species,
  selectedTraits,
  traitDetails,
  speciesProfileName,
  speciesBodyDescription,
  validationAttempted = false,
  onSelectedTraitsChange,
  onTraitDetailChange,
  onSpeciesProfileNameChange,
  onSpeciesBodyDescriptionChange,
}: SpeciesTraitsPanelProps) {
  const traits = getSagaDriveSpeciesTraitsForRace(species);
  const usedPoints = getSagaDriveSpeciesTraitCost(selectedTraits);
  const speciesLabel = getCharacterCreationOptionLabel(sagaDriveRaceOptions, species);
  const budgetComplete = usedPoints === SAGA_DRIVE_SPECIES_TRAIT_BUDGET;

  const toggleTrait = (traitKey: SagaDriveSpeciesTraitKey, cost: number, available = true) => {
    if (!available) return;
    if (selectedTraits.includes(traitKey)) {
      onSelectedTraitsChange(selectedTraits.filter((key) => key !== traitKey));
      onTraitDetailChange(traitKey, '');
      return;
    }
    if (usedPoints + cost > SAGA_DRIVE_SPECIES_TRAIT_BUDGET) return;
    onSelectedTraitsChange([...selectedTraits, traitKey]);
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-muted/15 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Speziesmerkmale</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {speciesLabel} kann nur die unten aufgeführten Speziesmerkmale wählen. Verteile genau {SAGA_DRIVE_SPECIES_TRAIT_BUDGET} Punkte.
          </p>
        </div>
        <Badge variant={budgetComplete ? 'default' : validationAttempted ? 'destructive' : 'outline'}>
          {usedPoints} / {SAGA_DRIVE_SPECIES_TRAIT_BUDGET}
        </Badge>
      </div>

      {species === 'alien' && (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="species-profile-name">Name deiner Spezies *</Label>
            <Input
              id="species-profile-name"
              value={speciesProfileName}
              onChange={(event) => onSpeciesProfileNameChange(event.target.value)}
              placeholder="z. B. Schneggl"
              aria-invalid={validationAttempted && !speciesProfileName.trim()}
              className={validationAttempted && !speciesProfileName.trim() ? 'border-destructive' : undefined}
            />
            {validationAttempted && !speciesProfileName.trim() && (
              <p className="text-xs text-destructive">Bitte gib deinem Alien-Speziesprofil einen Namen.</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="species-body-description">Körperbeschreibung</Label>
            <Textarea
              id="species-body-description"
              rows={2}
              value={speciesBodyDescription}
              onChange={(event) => onSpeciesBodyDescriptionChange(event.target.value)}
              placeholder="z. B. lebensgroße intelligente Schnecke"
            />
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {traits.map((trait) => {
          const selected = selectedTraits.includes(trait.key);
          const unavailable = trait.available === false;
          const budgetBlocked = !selected && usedPoints + trait.cost > SAGA_DRIVE_SPECIES_TRAIT_BUDGET;
          const disabled = unavailable || budgetBlocked;
          const detailInvalid = Boolean(
            validationAttempted
            && selected
            && trait.detailRequired
            && !traitDetails[trait.key]?.trim(),
          );

          return (
            <div
              key={trait.key}
              className={[
                'rounded-lg border bg-card transition-colors',
                selected ? 'border-primary bg-primary/10' : 'border-border',
                unavailable ? 'opacity-60' : '',
                detailInvalid ? 'border-destructive' : '',
              ].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                className="w-full p-3 text-left disabled:cursor-not-allowed"
                disabled={disabled}
                aria-pressed={selected}
                aria-label={`${trait.label}, ${trait.cost} ${trait.cost === 1 ? 'Punkt' : 'Punkte'}`}
                onClick={() => toggleTrait(trait.key, trait.cost, !unavailable)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${selected ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground'}`}>
                      <SpeciesTraitIcon traitKey={trait.key} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium leading-snug">{trait.label}</span>
                      {unavailable && (
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{trait.unavailableReason ?? 'Noch nicht verfügbar'}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={selected ? 'default' : 'outline'}>{trait.cost}</Badge>
                </div>
                <p className="mt-2 pl-12 text-xs leading-relaxed text-muted-foreground">{trait.description}</p>
              </button>

              {selected && trait.detailRequired && (
                <div className="space-y-2 border-t border-border/70 px-3 pb-3 pt-3">
                  {trait.key === 'narrow-resistance' ? (
                    <>
                      <div className="flex min-h-7 items-center gap-1">
                        <Label htmlFor="species-trait-narrow-resistance">Gefahrenart *</Label>
                        <RuleHelp label="Gefahrenart">
                          <div className="space-y-2">
                            <p>
                              Entscheidend ist die konkrete Wirkung, nicht ihre Quelle. Magisches Feuer zählt zum Beispiel als Hitze / Verbrennung. Eine allgemeine Resistenz gegen „Magie“ gibt es hier nicht.
                            </p>
                            <div className="space-y-1.5">
                              {sagaDriveNarrowResistanceHazardOptions.map((option) => (
                                <p key={option.value}>
                                  <span className="font-medium">{option.label}:</span> {option.description}
                                </p>
                              ))}
                            </div>
                          </div>
                        </RuleHelp>
                      </div>
                      <Select
                        value={traitDetails[trait.key] ?? ''}
                        onValueChange={(value) => onTraitDetailChange(trait.key, value)}
                      >
                        <SelectTrigger
                          id="species-trait-narrow-resistance"
                          aria-label="Gefahrenart"
                          aria-invalid={detailInvalid}
                          className={detailInvalid ? 'border-destructive' : undefined}
                        >
                          <SelectValue placeholder="Gefahrenart wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {sagaDriveNarrowResistanceHazardOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  ) : (
                    <>
                      <Label htmlFor={`species-trait-${trait.key}`}>
                        {trait.detailLabel ?? 'Details'} *
                      </Label>
                      <Input
                        id={`species-trait-${trait.key}`}
                        value={traitDetails[trait.key] ?? ''}
                        onChange={(event) => onTraitDetailChange(trait.key, event.target.value)}
                        placeholder={trait.detailPlaceholder}
                        aria-invalid={detailInvalid}
                        className={detailInvalid ? 'border-destructive' : undefined}
                      />
                    </>
                  )}
                  {detailInvalid && (
                    <p className="text-xs text-destructive">Bitte konkretisiere dieses Speziesmerkmal.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {validationAttempted && !budgetComplete && (
        <p className="text-sm text-destructive">
          Für einen vollständigen Charakter müssen Speziesmerkmale im Wert von genau {SAGA_DRIVE_SPECIES_TRAIT_BUDGET} Punkten gewählt werden.
        </p>
      )}
    </section>
  );
}
