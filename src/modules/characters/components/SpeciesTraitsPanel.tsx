import { Plus, X } from 'lucide-react';
import {
  SAGA_DRIVE_SPECIES_TRAIT_BUDGET,
  getCharacterCreationOptionLabel,
  getSagaDriveSpeciesTraitCost,
  getSagaDriveSpeciesTraitsForRace,
  sagaDriveRaceOptions,
  type SagaDriveSpeciesTraitKey,
} from '../../rulesets/characterCreation';
import { getSagaDriveSpeciesTraitOptionCatalog } from '../../rulesets/speciesTraitOptions';
import type { SagaDriveSpeciesTraitInstanceDto } from '../types/character.types';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { RuleHelp } from './RuleHelp';
import { SpeciesTraitIcon } from './SpeciesTraitIcon';

type SpeciesTraitsPanelProps = {
  species: string;
  traitInstances: SagaDriveSpeciesTraitInstanceDto[];
  speciesProfileName: string;
  speciesBodyDescription: string;
  validationAttempted?: boolean;
  onTraitInstancesChange: (instances: SagaDriveSpeciesTraitInstanceDto[]) => void;
  onSpeciesProfileNameChange: (value: string) => void;
  onSpeciesBodyDescriptionChange: (value: string) => void;
};

export function SpeciesTraitsPanel({
  species,
  traitInstances,
  speciesProfileName,
  speciesBodyDescription,
  validationAttempted = false,
  onTraitInstancesChange,
  onSpeciesProfileNameChange,
  onSpeciesBodyDescriptionChange,
}: SpeciesTraitsPanelProps) {
  const traits = getSagaDriveSpeciesTraitsForRace(species);
  const usedPoints = getSagaDriveSpeciesTraitCost(traitInstances.map((instance) => instance.trait));
  const speciesLabel = getCharacterCreationOptionLabel(sagaDriveRaceOptions, species);
  const budgetComplete = usedPoints === SAGA_DRIVE_SPECIES_TRAIT_BUDGET;

  const addTraitInstance = (traitKey: SagaDriveSpeciesTraitKey, cost: number) => {
    const catalog = getSagaDriveSpeciesTraitOptionCatalog(traitKey);
    const existing = traitInstances.filter((instance) => instance.trait === traitKey);
    if (usedPoints + cost > SAGA_DRIVE_SPECIES_TRAIT_BUDGET) return;
    if (!catalog && existing.length > 0) return;
    if (catalog && existing.some((instance) => !instance.option)) return;
    if (catalog && existing.length >= catalog.options.length) return;
    onTraitInstancesChange([
      ...traitInstances,
      { trait: traitKey, source: 'species-creation', acquiredAtLevel: 1 },
    ]);
  };

  const removeTraitInstance = (index: number) => {
    onTraitInstancesChange(traitInstances.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateTraitOption = (index: number, option: NonNullable<SagaDriveSpeciesTraitInstanceDto['option']>) => {
    onTraitInstancesChange(traitInstances.map((instance, currentIndex) => (
      currentIndex === index
        ? { trait: instance.trait, option, source: instance.source, acquiredAtLevel: instance.acquiredAtLevel }
        : instance
    )));
  };

  return (
    <section className="space-y-4 rounded-lg border border-border bg-muted/15 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Speziesmerkmale</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {speciesLabel} kann nur die unten aufgeführten Speziesmerkmale wählen. Verteile genau {SAGA_DRIVE_SPECIES_TRAIT_BUDGET} Punkte.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Merkmale mit Auswahlkatalog sind mehrfach wählbar, aber jede Unteroption nur einmal. Die Speziespunkte steigen nicht automatisch mit der Charakterstufe.
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
          const catalog = getSagaDriveSpeciesTraitOptionCatalog(trait.key);
          const repeatable = Boolean(catalog);
          const entries = traitInstances
            .map((instance, index) => ({ instance, index }))
            .filter(({ instance }) => instance.trait === trait.key);
          const selected = entries.length > 0;
          const unavailable = trait.available === false;
          const budgetBlocked = usedPoints + trait.cost > SAGA_DRIVE_SPECIES_TRAIT_BUDGET;
          const unresolvedInstance = entries.some(({ instance }) => catalog && !instance.option);
          const allOptionsUsed = Boolean(catalog && entries.length >= catalog.options.length);
          const canAdd = !unavailable && !budgetBlocked && !unresolvedInstance && !allOptionsUsed;
          const hasInvalidEntry = Boolean(validationAttempted && catalog && entries.some(({ instance }) => !instance.option));

          return (
            <div
              key={trait.key}
              className={[
                'rounded-lg border bg-card transition-colors',
                selected ? 'border-primary bg-primary/10' : 'border-border',
                unavailable ? 'opacity-60' : '',
                hasInvalidEntry ? 'border-destructive' : '',
              ].filter(Boolean).join(' ')}
            >
              {!selected || !repeatable ? (
                <button
                  type="button"
                  className="w-full p-3 text-left disabled:cursor-not-allowed"
                  disabled={unavailable || (!selected && budgetBlocked)}
                  aria-pressed={selected}
                  aria-label={`${trait.label}, ${trait.cost} ${trait.cost === 1 ? 'Punkt' : 'Punkte'}`}
                  onClick={() => {
                    if (selected) {
                      const selectedIndex = entries[0]?.index;
                      if (selectedIndex !== undefined) removeTraitInstance(selectedIndex);
                    } else {
                      addTraitInstance(trait.key, trait.cost);
                    }
                  }}
                >
                  <TraitCardHeader
                    traitKey={trait.key}
                    label={trait.label}
                    cost={trait.cost}
                    selected={selected}
                    unavailableReason={unavailable ? trait.unavailableReason ?? 'Noch nicht verfügbar' : undefined}
                    selectedCount={entries.length}
                    repeatable={repeatable}
                  />
                  <p className="mt-2 pl-12 text-xs leading-relaxed text-muted-foreground">{trait.description}</p>
                </button>
              ) : (
                <div className="p-3">
                  <TraitCardHeader
                    traitKey={trait.key}
                    label={trait.label}
                    cost={trait.cost}
                    selected
                    selectedCount={entries.length}
                    repeatable
                  />
                  <p className="mt-2 pl-12 text-xs leading-relaxed text-muted-foreground">{trait.description}</p>
                </div>
              )}

              {selected && catalog && (
                <div className="space-y-3 border-t border-border/70 px-3 pb-3 pt-3">
                  <div className="flex min-h-7 items-center gap-1">
                    <p className="text-sm font-medium">{catalog.label} *</p>
                    <RuleHelp label={`${trait.label}: ${catalog.label}`}>
                      <div className="space-y-2">
                        <p>{catalog.helpIntro}</p>
                        <div className="space-y-1.5">
                          {catalog.options.map((option) => (
                            <p key={option.value}>
                              <span className="font-medium">{option.label}:</span> {option.description}
                            </p>
                          ))}
                        </div>
                      </div>
                    </RuleHelp>
                  </div>

                  {entries.map(({ instance, index }, entryIndex) => {
                    const controlId = `species-trait-${trait.key}-${index}`;
                    const selectedByOtherInstance = new Set(
                      entries
                        .filter((entry) => entry.index !== index)
                        .map((entry) => entry.instance.option)
                        .filter((option): option is NonNullable<typeof option> => Boolean(option)),
                    );
                    const detailInvalid = Boolean(validationAttempted && !instance.option);

                    return (
                      <div key={`${trait.key}-${index}`} className="rounded-md border border-border/70 bg-background/40 p-2.5">
                        <div className="flex items-end gap-2">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {entries.length > 1 && (
                              <Label htmlFor={controlId}>{catalog.label} {entryIndex + 1}</Label>
                            )}
                            <Select
                              value={instance.option ?? ''}
                              onValueChange={(value) => {
                                const option = catalog.options.find((candidate) => candidate.value === value);
                                if (option) updateTraitOption(index, option.value);
                              }}
                            >
                              <SelectTrigger
                                id={controlId}
                                aria-label={`${trait.label}: ${catalog.label}${entries.length > 1 ? ` ${entryIndex + 1}` : ''}`}
                                aria-invalid={detailInvalid}
                                className={detailInvalid ? 'border-destructive' : undefined}
                              >
                                <SelectValue placeholder={catalog.placeholder} />
                              </SelectTrigger>
                              <SelectContent>
                                {catalog.options.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    disabled={selectedByOtherInstance.has(option.value)}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Badge variant="outline" className="mb-0.5 shrink-0">{trait.cost} P</Badge>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="shrink-0"
                            aria-label={`${trait.label}${entries.length > 1 ? ` ${entryIndex + 1}` : ''} entfernen`}
                            onClick={() => removeTraitInstance(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {instance.legacyDetail && !instance.option && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Bisheriger Wert: „{instance.legacyDetail}“. Bitte ordne ihn einer Core-Auswahl zu.
                          </p>
                        )}
                        {detailInvalid && (
                          <p className="mt-2 text-xs text-destructive">Bitte wähle eine Option für dieses Speziesmerkmal.</p>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={!canAdd}
                    onClick={() => addTraitInstance(trait.key, trait.cost)}
                  >
                    <Plus className="mr-2 h-4 w-4" />Weitere Auswahl
                  </Button>
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

type TraitCardHeaderProps = {
  traitKey: SagaDriveSpeciesTraitKey;
  label: string;
  cost: 1 | 2 | 3;
  selected: boolean;
  repeatable: boolean;
  selectedCount: number;
  unavailableReason?: string;
};

function TraitCardHeader({
  traitKey,
  label,
  cost,
  selected,
  repeatable,
  selectedCount,
  unavailableReason,
}: TraitCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${selected ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground'}`}>
          <SpeciesTraitIcon traitKey={traitKey} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <span className="font-medium leading-snug">{label}</span>
          {repeatable && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mehrfach wählbar{selectedCount > 0 ? ` · ${selectedCount} gewählt` : ''}
            </p>
          )}
          {unavailableReason && (
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">{unavailableReason}</p>
          )}
        </div>
      </div>
      <Badge variant={selected ? 'default' : 'outline'}>{cost}</Badge>
    </div>
  );
}
