/**
 * NpcCreatureStatblockView — read-only compact Statblock for Library (#197).
 * Reuses deriveNpcCreaturePower / computeCompactStatblockBenchmarks; no editor.
 * Location: src/app/library/npc-creatures/NpcCreatureStatblockView.tsx
 */
import { deriveNpcCreaturePower } from '../../../domains/npc-creature';
import type { NpcCreatureDefinition } from '../../../domains/npc-creature';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/dialog';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import {
  formatNpcCombatMetaLine,
  formatNpcLevelMachtgradLine,
  LIBRARY_NPC_SOURCE_LABELS,
  NPC_ATTRIBUTE_SHORT_LABELS,
  NPC_CREATURE_CATEGORY_LABELS,
  NPC_CREATURE_KIND_LABELS,
  NPC_CREATURE_SHEET_MODE_LABELS,
} from './npcCreatureLibraryLabels';

export interface NpcCreatureStatblockViewProps {
  definition: NpcCreatureDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}

export function NpcCreatureStatblockView({
  definition,
  open,
  onOpenChange,
}: NpcCreatureStatblockViewProps) {
  if (!definition) return null;

  const derived = deriveNpcCreaturePower(definition);
  const { benchmarks } = derived;
  const combatLine = formatNpcCombatMetaLine(
    definition.combatProfile,
    definition.combatRole,
  );
  const isCompact = definition.sheetMode === 'compact';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto sm:max-w-xl"
        data-npc-statblock-view
        aria-describedby="npc-statblock-description"
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-lg sm:text-xl">
            {definition.name}
          </DialogTitle>
          <DialogDescription id="npc-statblock-description" className="text-left">
            {NPC_CREATURE_KIND_LABELS[definition.kind]} ·{' '}
            {NPC_CREATURE_CATEGORY_LABELS[definition.category]} ·{' '}
            {formatNpcLevelMachtgradLine(definition.level, derived.machtgradLabel)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2" aria-label="Kennzeichen">
          <Badge variant="outline">
            {NPC_CREATURE_SHEET_MODE_LABELS[definition.sheetMode]}
          </Badge>
          <Badge variant="secondary">{combatLine}</Badge>
          <Badge variant="outline">
            {LIBRARY_NPC_SOURCE_LABELS[definition.scope]}
          </Badge>
        </div>

        {definition.description.trim() ? (
          <p className="text-sm text-muted-foreground">{definition.description}</p>
        ) : null}

        {isCompact ? (
          <div className="space-y-5">
            <section aria-labelledby="npc-statblock-core">
              <h3
                id="npc-statblock-core"
                className="mb-2 text-sm font-semibold text-foreground"
              >
                Kernwerte
              </h3>
              {/* Single column on mobile — never crush into desktop two-column. */}
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <StatRow label="Gesundheit" value={benchmarks.health} />
                <StatRow label="Verteidigung" value={benchmarks.defense} />
                <StatRow
                  label="Bewegung"
                  value={`${benchmarks.movementMeters} m`}
                />
                <StatRow
                  label="Primärangriff"
                  value={`+${benchmarks.primaryModifier}`}
                />
                <StatRow
                  label="Primärschaden"
                  value={benchmarks.primaryDamage.label}
                />
                <StatRow
                  label="Primärskill"
                  value={`Rang ${benchmarks.primarySkillRank}`}
                />
              </dl>
            </section>

            <section aria-labelledby="npc-statblock-resist">
              <h3
                id="npc-statblock-resist"
                className="mb-2 text-sm font-semibold text-foreground"
              >
                Widerstände
              </h3>
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <StatRow label="Körper" value={benchmarks.resistances.high} />
                <StatRow label="Reflex" value={benchmarks.resistances.normal} />
                <StatRow label="Geist" value={benchmarks.resistances.low} />
              </dl>
            </section>

            <section aria-labelledby="npc-statblock-attrs">
              <h3
                id="npc-statblock-attrs"
                className="mb-2 text-sm font-semibold text-foreground"
              >
                Attribute
              </h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                {NPC_ATTRIBUTE_SHORT_LABELS.map((label, index) => (
                  <StatRow
                    key={label}
                    label={label}
                    value={benchmarks.attributeDefaults[index] ?? 0}
                  />
                ))}
              </dl>
            </section>

            {(benchmarks.impulsesAllowed ||
              benchmarks.wendepunktPerCombat > 0 ||
              benchmarks.signatureAbilityBudget > 0) && (
              <section aria-labelledby="npc-statblock-role">
                <h3
                  id="npc-statblock-role"
                  className="mb-2 text-sm font-semibold text-foreground"
                >
                  Kampfrolle
                </h3>
                <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {benchmarks.impulsesAllowed ? (
                    <StatRow
                      label="Impulse / Runde"
                      value={benchmarks.impulsesPerRound}
                    />
                  ) : null}
                  {benchmarks.wendepunktPerCombat > 0 ? (
                    <StatRow
                      label="Wendepunkt"
                      value={benchmarks.wendepunktPerCombat}
                    />
                  ) : null}
                  <StatRow
                    label="Signatur-Budget"
                    value={benchmarks.signatureAbilityBudget}
                  />
                </dl>
              </section>
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            Diese Figur nutzt den Charakterbogen. Der kompakte Statblock ist für
            die Statblock-Darstellung vorgesehen; öffne den Charakterbogen-Editor,
            sobald er für NPCs verfügbar ist.
          </p>
        )}

        {definition.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" aria-label="Tags">
            {definition.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
