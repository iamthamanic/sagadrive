import { useEffect, useMemo, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { AttributeDerivedConnector } from '../../../components/AttributeDerivedConnector';
import { DerivedStatCard } from '../../../components/DerivedStatCard';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';
import {
  SAGA_DRIVE_ATTRIBUTE_BONUS_CAP,
  SAGA_DRIVE_BALANCED_ATTRIBUTE_ARRAY,
  SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET,
  SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP,
  createBalancedSagaDriveAttributeBonuses,
  sagaDriveAttributeDefinitions,
  sagaDriveSkillDefinitions,
  type SagaDriveAttributeAdvancementMilestone,
  type SagaDriveAttributeAdvancements,
  type SagaDriveAttributeKey,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';
import {
  canAssignSagaDriveAttributeAdvancement,
  getSagaDriveStartAttributeBonusUsed,
  isValidSagaDriveStartAttributeBonuses,
} from '../../rulesets/attributeProgression';
import type { CharacterAttributesDto } from '../types/character.types';
import { buildSagaDriveDerivedStatCards } from '../utils/derivedStats';
import { RuleHelp } from './RuleHelp';

interface CharacterAttributeBonusPanelProps {
  baseAttributes: CharacterAttributesDto;
  attributes: CharacterAttributesDto;
  advancements: SagaDriveAttributeAdvancements;
  level: number;
  experienceBonus: number;
  finalSkillRanks: Record<SagaDriveSkillKey, number>;
  overloaded: boolean;
  selectedSkill?: SagaDriveSkillKey;
  onBaseAttributesChange: (attributes: CharacterAttributesDto) => void;
  onAdvancementChange: (milestone: SagaDriveAttributeAdvancementMilestone, attribute: SagaDriveAttributeKey) => void;
}

const DERIVED_SELECTOR_BY_LABEL: Record<string, string> = {
  Gesundheit: 'health', Verteidigung: 'defense', Initiative: 'initiative', Körperwiderstand: 'body-resistance',
  Reflexwiderstand: 'reflex-resistance', Geistwiderstand: 'mind-resistance', Manöverwiderstand: 'maneuver-resistance',
  Bewegung: 'movement', Erholung: 'recovery', Traglast: 'carry-capacity',
};

function formatBonus(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function getMilestoneBonus(
  advancements: SagaDriveAttributeAdvancements,
  attribute: SagaDriveAttributeKey,
  level: number,
): number {
  return (level >= 8 && advancements.level8 === attribute ? 1 : 0)
    + (level >= 16 && advancements.level16 === attribute ? 1 : 0);
}

function getAttributeOptionExtraDerivedHint(
  attribute: SagaDriveAttributeKey,
  optionFinalValue: number,
  attributes: CharacterAttributesDto,
  athleticsRank: number,
  acrobaticsRank: number,
): string | null {
  if (attribute === 'strength') {
    const wins = optionFinalValue + athleticsRank >= attributes.dexterity + acrobaticsRank;
    return wins
      ? 'Zusätzlich Manöverwiderstand: Mit diesem Bonus gewinnt STÄ + Athletik gegen GES + Akrobatik.'
      : null;
  }
  if (attribute === 'dexterity') {
    const wins = attributes.strength + athleticsRank < optionFinalValue + acrobaticsRank;
    return wins
      ? 'Zusätzlich Manöverwiderstand: Mit diesem Bonus gewinnt GES + Akrobatik gegen STÄ + Athletik.'
      : null;
  }
  return null;
}

function AttributeAdvancementSelect({
  milestone,
  label,
  baseAttributes,
  attributes,
  advancements,
  level,
  onChange,
}: {
  milestone: SagaDriveAttributeAdvancementMilestone;
  label: string;
  baseAttributes: CharacterAttributesDto;
  attributes: CharacterAttributesDto;
  advancements: SagaDriveAttributeAdvancements;
  level: number;
  onChange: (milestone: SagaDriveAttributeAdvancementMilestone, attribute: SagaDriveAttributeKey) => void;
}) {
  const selected = advancements[milestone];
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">Permanentes +1 · keine Neuverteilung der Startboni</p>
        </div>
        <Badge variant={selected ? 'default' : 'outline'}>{selected ? 'Vergeben' : 'Offen'}</Badge>
      </div>
      <Select value={selected} onValueChange={(value) => onChange(milestone, value as SagaDriveAttributeKey)}>
        <SelectTrigger className="min-h-11 w-full" aria-label={`${label} Attribut`}>
          <SelectValue placeholder="Attribut für +1 wählen" />
        </SelectTrigger>
        <SelectContent>
          {sagaDriveAttributeDefinitions.map((attribute) => {
            const assignable = canAssignSagaDriveAttributeAdvancement(baseAttributes, advancements, milestone, attribute.key, level);
            return (
              <SelectItem key={attribute.key} value={attribute.key} disabled={!assignable}>
                {attribute.label} · aktuell {formatBonus(attributes[attribute.key])}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CharacterAttributeBonusPanel({
  baseAttributes,
  attributes,
  advancements,
  level,
  experienceBonus,
  finalSkillRanks,
  overloaded,
  selectedSkill,
  onBaseAttributesChange,
  onAdvancementChange,
}: CharacterAttributeBonusPanelProps) {
  const [connectedAttribute, setConnectedAttribute] = useState<SagaDriveAttributeKey | null>(null);
  const [hoveredAttribute, setHoveredAttribute] = useState<SagaDriveAttributeKey | null>(null);
  const activeAttribute = hoveredAttribute ?? connectedAttribute;
  const attributeConnectorAnimated = activeAttribute !== null && activeAttribute === connectedAttribute;
  const startBonusUsed = getSagaDriveStartAttributeBonusUsed(baseAttributes);
  const startDistributionValid = isValidSagaDriveStartAttributeBonuses(baseAttributes);

  const derivedStatCards = useMemo(
    () => buildSagaDriveDerivedStatCards({ attributes, finalSkillRanks, experienceBonus, overloaded }),
    [attributes, experienceBonus, finalSkillRanks, overloaded],
  );

  const attributeDerivedTargets: Partial<Record<SagaDriveAttributeKey, string[]>> = useMemo(() => {
    const maneuverUsesStrength = attributes.strength + finalSkillRanks.athletics >= attributes.dexterity + finalSkillRanks.acrobatics;
    return {
      strength: ['carry-capacity', 'movement', ...(maneuverUsesStrength ? ['maneuver-resistance'] : [])],
      dexterity: ['reflex-resistance', 'defense', ...(maneuverUsesStrength ? [] : ['maneuver-resistance'])],
      endurance: ['health', 'body-resistance', 'recovery'],
      mind: ['mind-resistance'],
      perception: ['initiative'],
      charisma: [],
    };
  }, [attributes.dexterity, attributes.strength, finalSkillRanks.acrobatics, finalSkillRanks.athletics]);

  const connectedTargetSelectors = useMemo(
    () => (activeAttribute ? attributeDerivedTargets[activeAttribute] ?? [] : []),
    [activeAttribute, attributeDerivedTargets],
  );

  const connectedDerivedCards = useMemo(() => {
    if (!activeAttribute || connectedTargetSelectors.length === 0) return [];
    return connectedTargetSelectors
      .map((selector) => derivedStatCards.find((entry) => DERIVED_SELECTOR_BY_LABEL[entry.label] === selector))
      .filter((entry): entry is (typeof derivedStatCards)[number] => entry !== undefined);
  }, [activeAttribute, connectedTargetSelectors, derivedStatCards]);

  const dimmedDerivedCards = useMemo(() => {
    if (!activeAttribute) return [];
    const connected = new Set(connectedTargetSelectors);
    return derivedStatCards.filter((entry) => !connected.has(DERIVED_SELECTOR_BY_LABEL[entry.label]));
  }, [activeAttribute, connectedTargetSelectors, derivedStatCards]);
  const visibleDerivedCards = activeAttribute ? connectedDerivedCards : derivedStatCards;

  useEffect(() => {
    if (!connectedAttribute) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-attr-card], [data-derived-card], [data-attr-connector]')) return;
      if (target.closest('[data-slot="select-content"], [data-radix-popper-content-wrapper], [role="listbox"]')) return;
      setConnectedAttribute(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [connectedAttribute]);

  const setBaseAttribute = (attribute: SagaDriveAttributeKey, nextValue: number) => {
    const withoutCurrent = startBonusUsed - baseAttributes[attribute];
    if (withoutCurrent + nextValue > SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET) return;
    onBaseAttributesChange({ ...baseAttributes, [attribute]: nextValue });
  };

  return (
    <section className="space-y-4" data-attr-connector-section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">Grundattribute</h3>
          <p className="mt-1 text-sm text-muted-foreground">Du verteilst hier nur den direkten Grundbonus auf deinen d20. Startboni bleiben nach der Erstellung bestehen; spätere Steigerungen kommen als eigene Quelle dazu.</p>
        </div>
        <Badge variant={startDistributionValid ? 'default' : 'destructive'}>{startBonusUsed} / {SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET} Start-Bonuspunkte</Badge>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bei einem Fertigkeitscheck</p>
        <p className="mt-1 text-sm font-semibold sm:text-base">d20 + Attributbonus + Fertigkeit + weitere Boni</p>
        <p className="mt-1 text-xs text-muted-foreground">Ein Grundbonus von +0 bedeutet: kein positiver Attributbonus. Er ist bei der Charaktererschaffung regulär erlaubt.</p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/10 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Schnellstart</p>
          <p className="text-xs text-muted-foreground">Ausgewogen verteilt, aber nicht vorgeschrieben.</p>
        </div>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => onBaseAttributesChange(createBalancedSagaDriveAttributeBonuses())}>
          Ausgewogen · {SAGA_DRIVE_BALANCED_ATTRIBUTE_ARRAY.join(' · ')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {sagaDriveAttributeDefinitions.map((attribute) => {
          const startBonus = baseAttributes[attribute.key];
          const milestoneBonus = getMilestoneBonus(advancements, attribute.key, level);
          const finalBonus = attributes[attribute.key];
          const selectedSkillAttribute = selectedSkill ? sagaDriveSkillDefinitions.find((skill) => skill.key === selectedSkill)?.attribute : undefined;
          return (
            <div
              key={attribute.key}
              data-attr-card={attribute.key}
              onMouseEnter={() => setHoveredAttribute(attribute.key)}
              onMouseLeave={() => setHoveredAttribute((current) => (current === attribute.key ? null : current))}
              className={`relative flex h-full flex-col items-center gap-2 rounded-lg border bg-card p-3 text-center transition-colors ${connectedAttribute === attribute.key ? 'border-primary bg-primary/5' : selectedSkillAttribute === attribute.key ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/60'}`}
            >
              <div className="flex w-full items-start justify-center"><span className="opacity-60 [&_svg]:size-3"><RuleHelp label={attribute.label}>{attribute.description}</RuleHelp></span></div>
              <div className="flex w-full flex-col items-center gap-1">
                <p className="text-sm font-semibold leading-tight">{attribute.label}</p>
                <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{attribute.shortLabel}</span>
              </div>
              <button
                type="button"
                aria-pressed={connectedAttribute === attribute.key}
                aria-label={`${attribute.label}: abhängige Werte anzeigen`}
                onClick={() => setConnectedAttribute(attribute.key)}
                className="my-1 min-h-11 w-full rounded-md px-2 py-1 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Finaler Bonus</p>
                <p className="text-2xl font-semibold tabular-nums">{formatBonus(finalBonus)}</p>
                <p className="text-[11px] text-muted-foreground">d20 {formatBonus(finalBonus)}</p>
              </button>
              <Select value={String(startBonus)} onValueChange={(value) => { setBaseAttribute(attribute.key, Number.parseInt(value, 10)); setConnectedAttribute(attribute.key); }}>
                <SelectTrigger className="min-h-11 w-full justify-center gap-1.5 px-2" aria-label={`${attribute.label} Startbonus`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((value) => {
                    const wouldExceedBudget = startBonusUsed - startBonus + value > SAGA_DRIVE_START_ATTRIBUTE_BONUS_BUDGET;
                    const optionFinalValue = value + milestoneBonus;
                    const extraHint = getAttributeOptionExtraDerivedHint(attribute.key, optionFinalValue, attributes, finalSkillRanks.athletics, finalSkillRanks.acrobatics);
                    return (
                      <SelectItem key={value} value={String(value)} textValue={formatBonus(value)} disabled={wouldExceedBudget || value > SAGA_DRIVE_START_ATTRIBUTE_BONUS_CAP} className={extraHint ? 'pr-10' : undefined}>
                        <SelectItemText>{formatBonus(value)} Startbonus</SelectItemText>
                        {extraHint ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" aria-label="Zusätzlichen abgeleiteten Wert erklären" className="pointer-events-auto ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-primary hover:bg-primary/10" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); }}>
                                <CircleHelp className="pointer-events-none size-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={8} className="max-w-[260px] text-left leading-relaxed">{extraHint}</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="flex min-h-6 flex-wrap justify-center gap-1">
                <Badge variant="outline">Start {formatBonus(startBonus)}</Badge>
                {level >= 8 && advancements.level8 === attribute.key ? <Badge variant="secondary">Stufe 8 +1</Badge> : null}
                {level >= 16 && advancements.level16 === attribute.key ? <Badge variant="secondary">Stufe 16 +1</Badge> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-semibold">Attributsentwicklung</h4>
          <p className="mt-1 text-xs text-muted-foreground">Die 15 Start-Bonuspunkte werden beim Stufenaufstieg nicht neu verteilt. Auf Stufe 8 und 16 kommt jeweils ein neues permanentes +1 hinzu; der reguläre Endbonus ist auf {formatBonus(SAGA_DRIVE_ATTRIBUTE_BONUS_CAP)} begrenzt.</p>
        </div>
        {level < 8 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">Nächste Attributssteigerung: <strong>Stufe 8 · +1</strong>.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AttributeAdvancementSelect milestone="level8" label="Stufe 8 · +1" baseAttributes={baseAttributes} attributes={attributes} advancements={advancements} level={level} onChange={onAdvancementChange} />
            {level >= 16 ? <AttributeAdvancementSelect milestone="level16" label="Stufe 16 · +1" baseAttributes={baseAttributes} attributes={attributes} advancements={advancements} level={level} onChange={onAdvancementChange} /> : null}
          </div>
        )}
      </div>

      {activeAttribute === 'charisma' ? <p className="text-center text-[11px] text-muted-foreground">Charisma fließt in keinen abgeleiteten Wert ein.</p> : null}
      <div className="space-y-1">
        {!activeAttribute ? (
          <div className="mb-3"><h3 className="font-semibold">Abgeleitete Werte</h3><p className="text-sm text-muted-foreground">Diese Werte werden aus finalen Attributboni, Fertigkeiten und Erfahrungsbonus berechnet und nicht direkt bearbeitet. Klicke auf den finalen Bonus einer Attributkarte, um nur die relevanten Werte zu sehen.</p></div>
        ) : null}
        <AttributeDerivedConnector sourceAttribute={activeAttribute} animated={attributeConnectorAnimated} targetSelectors={connectedTargetSelectors} />
        <div className={activeAttribute ? (visibleDerivedCards.length <= 1 ? 'grid max-w-md grid-cols-1 gap-3' : visibleDerivedCards.length === 2 ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-3') : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
          {visibleDerivedCards.map((entry) => (
            <div key={entry.label} data-derived-card={DERIVED_SELECTOR_BY_LABEL[entry.label]} className="[&>div]:h-full"><DerivedStatCard {...entry} highlighted={Boolean(activeAttribute)} /></div>
          ))}
        </div>
        {activeAttribute && dimmedDerivedCards.length > 0 ? (
          <div className="mt-4 grid gap-3 opacity-40 sm:grid-cols-2 xl:grid-cols-3">
            {dimmedDerivedCards.map((entry) => (
              <div key={entry.label} data-derived-card={DERIVED_SELECTOR_BY_LABEL[entry.label]} className="[&>div]:h-full"><DerivedStatCard {...entry} /></div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
