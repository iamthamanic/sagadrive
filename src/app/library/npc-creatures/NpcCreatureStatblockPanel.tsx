/**
 * NpcCreatureStatblockPanel — compact live Statblock body for Library + Editor (#197/#198).
 * Uses deriveNpcCreaturePower + optional Advanced overrides; no Dialog chrome.
 * Location: src/app/library/npc-creatures/NpcCreatureStatblockPanel.tsx
 */
import {
  deriveNpcCreaturePower,
  resolveNpcCreatureEffectiveStats,
  type NpcCreatureDefinition,
} from '../../../domains/npc-creature';
import { Badge } from '../../../shared/ui/badge';
import {
  formatNpcCombatMetaLine,
  formatNpcLevelMachtgradLine,
  LIBRARY_NPC_SOURCE_LABELS,
  NPC_ATTRIBUTE_SHORT_LABELS,
  NPC_CREATURE_CATEGORY_LABELS,
  NPC_CREATURE_KIND_LABELS,
  NPC_CREATURE_SHEET_MODE_LABELS,
} from './npcCreatureLibraryLabels';

export interface NpcCreatureStatblockPanelProps {
  definition: NpcCreatureDefinition;
  /** When true, omit identity header (editor already shows name). */
  compactHeader?: boolean;
  className?: string;
}

function StatRow({
  label,
  value,
  recommended,
  overridden,
}: {
  label: string;
  value: string | number;
  recommended?: string | number;
  overridden?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <dt className="text-xs text-muted-foreground sm:text-sm">
        {label}
        {overridden ? (
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-amber-600">
            Override
          </span>
        ) : null}
      </dt>
      <dd className="text-right font-mono text-sm tabular-nums">
        <span>{value}</span>
        {overridden && recommended !== undefined ? (
          <span className="ml-2 text-xs text-muted-foreground">(empf. {recommended})</span>
        ) : null}
      </dd>
    </div>
  );
}

export function NpcCreatureStatblockPanel({
  definition,
  compactHeader = false,
  className,
}: NpcCreatureStatblockPanelProps) {
  const derived = deriveNpcCreaturePower(definition);
  const effective = resolveNpcCreatureEffectiveStats(definition);
  const { recommended } = effective;
  const combatLine = formatNpcCombatMetaLine(
    definition.combatProfile,
    definition.combatRole,
  );
  const isCompact = definition.sheetMode === 'compact';

  return (
    <div
      className={className}
      data-npc-statblock-panel
      aria-label={`Statblock ${definition.name}`}
    >
      {!compactHeader ? (
        <div className="mb-3 space-y-1">
          <h3 className="text-lg font-semibold leading-tight">{definition.name}</h3>
          <p className="text-sm text-muted-foreground">
            {NPC_CREATURE_KIND_LABELS[definition.kind]} ·{' '}
            {NPC_CREATURE_CATEGORY_LABELS[definition.category]} ·{' '}
            {formatNpcLevelMachtgradLine(definition.level, derived.machtgradLabel)}
          </p>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2" aria-label="Kennzeichen">
        <Badge variant="outline">
          {NPC_CREATURE_SHEET_MODE_LABELS[definition.sheetMode]}
        </Badge>
        <Badge variant="secondary">{combatLine}</Badge>
        <Badge variant="outline">{LIBRARY_NPC_SOURCE_LABELS[definition.scope]}</Badge>
      </div>

      {definition.description.trim() ? (
        <p className="mb-4 text-sm text-muted-foreground">{definition.description}</p>
      ) : null}

      {isCompact ? (
        <div className="space-y-5">
          <section aria-labelledby="npc-statblock-core">
            <h4
              id="npc-statblock-core"
              className="mb-2 text-sm font-semibold text-foreground"
            >
              Kernwerte
            </h4>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <StatRow
                label="Gesundheit"
                value={effective.health}
                recommended={recommended.health}
                overridden={effective.healthOverridden}
              />
              <StatRow
                label="Verteidigung"
                value={effective.defense}
                recommended={recommended.defense}
                overridden={effective.defenseOverridden}
              />
              <StatRow
                label="Bewegung"
                value={`${effective.movementMeters} m`}
                recommended={`${recommended.movementMeters} m`}
                overridden={effective.movementOverridden}
              />
              <StatRow label="Primärangriff" value={`+${recommended.primaryModifier}`} />
              <StatRow label="Primärschaden" value={recommended.primaryDamage.label} />
              <StatRow label="Primärskill" value={`Rang ${recommended.primarySkillRank}`} />
            </dl>
          </section>

          <section aria-labelledby="npc-statblock-resist">
            <h4
              id="npc-statblock-resist"
              className="mb-2 text-sm font-semibold text-foreground"
            >
              Widerstände
            </h4>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              <StatRow
                label="Körper"
                value={effective.resistanceHigh}
                recommended={recommended.resistances.high}
                overridden={effective.resistancesOverridden}
              />
              <StatRow
                label="Reflex"
                value={effective.resistanceNormal}
                recommended={recommended.resistances.normal}
                overridden={effective.resistancesOverridden}
              />
              <StatRow
                label="Geist"
                value={effective.resistanceLow}
                recommended={recommended.resistances.low}
                overridden={effective.resistancesOverridden}
              />
            </dl>
          </section>

          <section aria-labelledby="npc-statblock-attrs">
            <h4
              id="npc-statblock-attrs"
              className="mb-2 text-sm font-semibold text-foreground"
            >
              Attribute
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {NPC_ATTRIBUTE_SHORT_LABELS.map((label, index) => (
                <StatRow
                  key={label}
                  label={label}
                  value={effective.attributes[index] ?? 0}
                  recommended={recommended.attributeDefaults[index] ?? 0}
                  overridden={effective.attributesOverridden}
                />
              ))}
            </dl>
          </section>

          {(recommended.impulsesAllowed
            || recommended.wendepunktPerCombat > 0
            || recommended.signatureAbilityBudget > 0) && (
            <section aria-labelledby="npc-statblock-role">
              <h4
                id="npc-statblock-role"
                className="mb-2 text-sm font-semibold text-foreground"
              >
                Kampfrolle
              </h4>
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {recommended.impulsesAllowed ? (
                  <StatRow label="Impulse / Runde" value={recommended.impulsesPerRound} />
                ) : null}
                {recommended.wendepunktPerCombat > 0 ? (
                  <StatRow label="Wendepunkt" value={recommended.wendepunktPerCombat} />
                ) : null}
                <StatRow
                  label="Signatur-Budget"
                  value={recommended.signatureAbilityBudget}
                />
              </dl>
            </section>
          )}

          {definition.combatDetails?.attacks?.trim() ? (
            <section aria-labelledby="npc-statblock-attacks">
              <h4
                id="npc-statblock-attacks"
                className="mb-2 text-sm font-semibold text-foreground"
              >
                Angriffe / Aktionen
              </h4>
              <p className="whitespace-pre-wrap text-sm">{definition.combatDetails.attacks}</p>
            </section>
          ) : null}

          {definition.combatDetails?.signatures?.trim() ? (
            <section aria-labelledby="npc-statblock-signatures">
              <h4
                id="npc-statblock-signatures"
                className="mb-2 text-sm font-semibold text-foreground"
              >
                Signaturfähigkeiten
              </h4>
              <p className="whitespace-pre-wrap text-sm">{definition.combatDetails.signatures}</p>
            </section>
          ) : null}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Diese Figur nutzt den Charakterbogen. Der kompakte Statblock ist für die
          Statblock-Darstellung vorgesehen.
        </p>
      )}

      {definition.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
          {definition.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
