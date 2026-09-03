/**
 * CharacterBackgroundPanel — Hintergrund-Auswahl per Karussell mit Bracket-Connector
 * zu den Pool-Skill-Nodes (stackbare 2 Hintergrundpunkte + Spezialisierungs-Branch).
 * Location: src/app/character/creation/CharacterBackgroundPanel.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  getSagaDriveBackgroundTemplate,
  getSagaDriveBackgroundTemplatesForWorldProfile,
} from '../../../modules/rulesets/backgroundTemplates';
import {
  getSagaDriveAttribute,
  getSagaDriveSkill,
  isSagaDriveSkillKey,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import type { CarouselScrollPhase } from '../../../modules/characters/hooks/carousel.types';
import type { SagaDriveBackgroundSkillPoints } from '../../../modules/rulesets/skillProgression';
import { SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS } from '../../../modules/rulesets/skillProgression';
import { BackgroundCarousel } from './BackgroundCarousel';
import {
  adjustBackgroundSkillPoints,
  backgroundSkillsWithPoints,
  sumBackgroundSkillPointsUsed,
} from './BackgroundSkillPointsAllocator';
import { RuleHelp } from '../shared/RuleHelp';
import { SkillSelectField } from '../progression';

type SkillSlot = SagaDriveSkillKey | '';

interface CharacterBackgroundPanelProps {
  backgroundTemplateId: string | null | undefined;
  worldProfileId?: string | null;
  backgroundName: string;
  skillPool: readonly SkillSlot[];
  backgroundSkillPoints: SagaDriveBackgroundSkillPoints;
  onBackgroundSkillPointsChange: (points: SagaDriveBackgroundSkillPoints) => void;
  specializationSkill: SkillSlot;
  specializationName: string;
  milieuAccess: string;
  contact: string;
  complication: string;
  communication: string;
  validationAttempted: boolean;
  complete: boolean;
  onTemplateSelect: (templateId: string | null) => void;
  onBackgroundNameChange: (value: string) => void;
  onPoolSkillChange: (index: number, value: string) => void;
  onSpecializationSkillChange: (skill: SkillSlot) => void;
  onSpecializationNameChange: (value: string) => void;
  onSpecializationApply?: (skill: SagaDriveSkillKey, name: string) => void;
  onMilieuAccessChange: (value: string) => void;
  onContactChange: (value: string) => void;
  onComplicationChange: (value: string) => void;
  onCommunicationChange: (value: string) => void;
}

function SuggestionButtons({ values, onSelect }: { values: readonly string[] | undefined; onSelect: (value: string) => void }) {
  if (!values || values.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {values.slice(0, 3).map((value) => (
        <Button key={value} type="button" size="sm" variant="outline" className="min-h-11 px-2 text-xs" onClick={() => onSelect(value)}>
          {value}
        </Button>
      ))}
    </div>
  );
}

interface BackgroundSkillNodeProps {
  skillKey: SagaDriveSkillKey;
  pointValue: 0 | 1 | 2;
  pointsUsed: number;
  specializationName?: string;
  onHoverChange: (skill: SagaDriveSkillKey | null) => void;
  onAdjust: (skill: SagaDriveSkillKey, delta: 1 | -1) => void;
}

function BackgroundSkillNode({
  skillKey,
  pointValue,
  pointsUsed,
  specializationName,
  onHoverChange,
  onAdjust,
}: BackgroundSkillNodeProps) {
  const skill = getSagaDriveSkill(skillKey);
  const attribute = getSagaDriveAttribute(skill.attribute);
  const hasSpecialization = Boolean(pointValue > 0 && specializationName?.trim());
  const selected = pointValue > 0;
  const canDecrease = pointValue > 0;
  const canIncrease =
    pointsUsed < SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS && pointValue < 2;

  const handleCardActivate = () => {
    if (canIncrease) onAdjust(skillKey, 1);
  };

  return (
    <div className="min-w-0" data-background-skill-node={skillKey}>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-disabled={!canIncrease}
        aria-label={
          canIncrease
            ? `${skill.label} Hintergrundpunkt hinzufügen`
            : `${skill.label} Hintergrundpunkte: ${pointValue}`
        }
        onMouseEnter={() => onHoverChange(skillKey)}
        onMouseLeave={() => onHoverChange(null)}
        onFocus={() => onHoverChange(skillKey)}
        onBlur={() => onHoverChange(null)}
        onClick={handleCardActivate}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardActivate();
          }
        }}
        className={`flex min-h-28 w-full flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          selected
            ? 'border-primary bg-primary/5'
            : 'border-border bg-card hover:border-primary/60'
        } ${canIncrease ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center justify-center gap-2">
          <div className="min-w-0">
            <p className="font-medium">{skill.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">Standard: {attribute.shortLabel}</p>
          </div>
          {selected ? <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
        </div>
        <div className="mt-3 flex min-h-6 flex-wrap items-center justify-center gap-2">
          {pointValue > 0 ? <Badge variant="outline">Hintergrund +{pointValue}</Badge> : <Badge variant="outline">Pool</Badge>}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              disabled={!canDecrease}
              onClick={(event) => {
                event.stopPropagation();
                onAdjust(skillKey, -1);
              }}
              aria-label={`${skill.label} Hintergrundpunkt verringern`}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="w-6 text-center text-lg font-semibold tabular-nums" aria-hidden="true">
              {pointValue}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10"
              disabled={!canIncrease}
              onClick={(event) => {
                event.stopPropagation();
                onAdjust(skillKey, 1);
              }}
              aria-label={`${skill.label} Hintergrundpunkt erhöhen`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {hasSpecialization ? (
        <div className="relative mx-auto mt-0 max-w-[12rem] pt-5 text-center">
          <span className="absolute left-1/2 top-0 h-5 -translate-x-1/2 border-l border-primary/60" aria-hidden="true" />
          <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Spezialisierung</p>
            <p className="mt-0.5 text-sm font-medium">{specializationName}</p>
            <Badge className="mt-1.5">+2 auf passende Checks</Badge>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Bracket-Connector vom zentrierten Hintergrund-Karussell zu den aktuell sichtbaren Skill-Nodes.
 * Vor Abschluss sind das vier Pool-Skills, danach nur die beiden gewählten Trainings.
 */
interface BackgroundSkillConnectorProps {
  skills: readonly SagaDriveSkillKey[];
  trainedSkills: readonly SagaDriveSkillKey[];
  activeSkill: SagaDriveSkillKey | null;
  scrollPhase: CarouselScrollPhase;
  onStandstill: () => void;
}

function BackgroundSkillConnector({
  skills,
  trainedSkills,
  activeSkill,
  scrollPhase,
  onStandstill,
}: BackgroundSkillConnectorProps) {
  const connectorRef = useRef<HTMLDivElement>(null);
  const scrollPhaseRef = useRef<CarouselScrollPhase>(scrollPhase);
  const onStandstillRef = useRef(onStandstill);
  onStandstillRef.current = onStandstill;

  const [layout, setLayout] = useState<{ width: number; height: number; sourceX: number; targets: number[] }>({
    width: 0,
    height: 0,
    sourceX: 0,
    targets: [],
  });
  const [fadeGeneration, setFadeGeneration] = useState(0);

  const measure = useCallback(() => {
    const el = connectorRef.current;
    if (!el) return;
    if (scrollPhaseRef.current === 'scrolling') return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;

    const panel = el.closest('[data-background-panel]');
    const card = panel?.querySelector('.background-carousel-item.is-center [data-slot="card"]');
    const cardRect = card?.getBoundingClientRect();
    const sourceX = cardRect ? cardRect.left + cardRect.width / 2 - rect.left : rect.width / 2;

    const grid = panel?.querySelector('[data-background-skill-grid]');
    const seen = new Set<number>();
    const targets: number[] = [];
    for (const node of Array.from(grid?.querySelectorAll(':scope > [data-background-skill-node]') ?? [])) {
      const button = node.querySelector('[role="group"]');
      const box = (button ?? node).getBoundingClientRect();
      const center = Math.round(Math.min(rect.width, Math.max(0, box.left + box.width / 2 - rect.left)) * 10) / 10;
      if (seen.has(center)) continue;
      seen.add(center);
      targets.push(center);
    }

    const round1 = (value: number) => Math.round(value * 10) / 10;
    const next = {
      width: round1(rect.width),
      height: round1(rect.height),
      sourceX: round1(Math.min(rect.width, Math.max(0, sourceX))),
      targets: targets.map(round1),
    };
    setLayout((current) => {
      const same =
        current.width === next.width &&
        current.height === next.height &&
        current.sourceX === next.sourceX &&
        current.targets.length === next.targets.length &&
        current.targets.every((target, index) => target === next.targets[index]);
      return same ? current : next;
    });
  }, []);

  useEffect(() => {
    scrollPhaseRef.current = scrollPhase;
    if (scrollPhase === 'settled') {
      measure();
      setFadeGeneration((generation) => generation + 1);
    }
  }, [scrollPhase, measure]);

  useEffect(() => {
    if (scrollPhase !== 'scrolling') return;
    let frame: number | undefined;
    let stableCount = 0;
    let lastX: number | null = null;
    const getCardX = () => {
      const panel = connectorRef.current?.closest('[data-background-panel]');
      const card = panel?.querySelector('.background-carousel-item.is-center [data-slot="card"]');
      return card ? card.getBoundingClientRect().left : null;
    };
    const tick = () => {
      const x = getCardX();
      if (x !== null && lastX !== null && Math.abs(x - lastX) <= 0.5) {
        stableCount += 1;
        if (stableCount >= 3) {
          onStandstillRef.current();
          return;
        }
      } else {
        stableCount = 0;
      }
      lastX = x;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollPhase]);

  useEffect(() => {
    measure();
    const el = connectorRef.current;
    const grid = el?.closest('[data-background-panel]')?.querySelector('[data-background-skill-grid]') ?? null;
    const observer = new ResizeObserver(() => measure());
    if (el) observer.observe(el);
    if (grid) observer.observe(grid);
    window.addEventListener('resize', measure);
    const t1 = window.setTimeout(measure, 50);
    const t2 = window.setTimeout(measure, 350);
    const t3 = window.setTimeout(measure, 700);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [measure, skills, trainedSkills]);

  const railY = layout.height >= 72 ? 24 : layout.height >= 56 ? 18 : layout.height >= 36 ? 12 : 10;
  const railLeft = layout.targets.length ? Math.min(...layout.targets, layout.sourceX) : 0;
  const railRight = layout.targets.length ? Math.max(...layout.targets, layout.sourceX) : layout.width;
  const trainedIndexes = new Set(trainedSkills.map((skill) => skills.indexOf(skill)).filter((index) => index >= 0));
  const hoverIndex = activeSkill ? skills.indexOf(activeSkill) : -1;
  const hasGeometry = layout.width > 0 && layout.targets.length > 0;

  return (
    <div ref={connectorRef} className="relative -mt-px h-14 md:h-[72px]" aria-hidden="true">
      <style>{`
        @keyframes background-connector-draw {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes background-connector-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -15; }
        }
        @keyframes background-connector-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes background-connector-reveal {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0% 0); }
        }
        .background-connector-fade {
          animation:
            background-connector-fade 200ms ease-out both,
            background-connector-reveal 340ms cubic-bezier(0.33, 1, 0.68, 1) both;
        }
        .background-connector-hide {
          opacity: 0;
          pointer-events: none;
        }
        .background-connector-route {
          stroke-dasharray: 100;
          animation: background-connector-draw 450ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .background-connector-route--flow {
          stroke-dasharray: 10 5;
          animation: background-connector-flow 0.75s linear infinite;
        }
      `}</style>
      {hasGeometry ? (
        <svg
          key={`${skills.join('|')}-${fadeGeneration}`}
          className={`${scrollPhase === 'settled' ? 'background-connector-fade' : 'background-connector-hide'} absolute inset-0 overflow-visible`}
          width={layout.width}
          height={layout.height}
          fill="none"
        >
          <g className="text-muted-foreground" strokeLinecap="round">
            <line x1={layout.sourceX} y1={0} x2={layout.sourceX} y2={railY} stroke="currentColor" strokeWidth={1} />
            <line x1={railLeft} y1={railY} x2={railRight} y2={railY} stroke="currentColor" strokeWidth={1} />
            {layout.targets.map((targetX, index) => (
              <line key={`drop-${index}`} x1={targetX} y1={railY} x2={targetX} y2={layout.height} stroke="currentColor" strokeWidth={1} />
            ))}
          </g>
          {Array.from(trainedIndexes).map((index) => {
            const targetX = layout.targets[index];
            if (targetX === undefined) return null;
            return (
              <g key={`trained-${index}`} className="text-primary">
                <path
                  d={`M ${layout.sourceX} 0 L ${layout.sourceX} ${railY} L ${targetX} ${railY} L ${targetX} ${layout.height}`}
                  className="background-connector-route background-connector-route--flow"
                  pathLength={100}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          {hoverIndex >= 0 && !trainedIndexes.has(hoverIndex) && layout.targets[hoverIndex] !== undefined ? (
            <g className="text-foreground">
              <path
                d={`M ${layout.sourceX} 0 L ${layout.sourceX} ${railY} L ${layout.targets[hoverIndex]} ${railY} L ${layout.targets[hoverIndex]} ${layout.height}`}
                className="background-connector-route"
                pathLength={100}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}

export function CharacterBackgroundPanel({
  backgroundTemplateId,
  worldProfileId,
  backgroundName,
  skillPool,
  backgroundSkillPoints,
  onBackgroundSkillPointsChange,
  specializationSkill,
  specializationName,
  milieuAccess,
  contact,
  complication,
  communication,
  validationAttempted,
  complete,
  onTemplateSelect,
  onBackgroundNameChange,
  onPoolSkillChange,
  onSpecializationSkillChange,
  onSpecializationNameChange,
  onSpecializationApply,
  onMilieuAccessChange,
  onContactChange,
  onComplicationChange,
  onCommunicationChange,
}: CharacterBackgroundPanelProps) {
  const templates = getSagaDriveBackgroundTemplatesForWorldProfile(worldProfileId);
  const selectedTemplate = getSagaDriveBackgroundTemplate(backgroundTemplateId);
  const poolSkills = skillPool.filter(isSagaDriveSkillKey);
  const backgroundPointsUsed = sumBackgroundSkillPointsUsed(backgroundSkillPoints);
  const backgroundPointsComplete = backgroundPointsUsed === SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS;
  const occupiedBackgroundSkills = backgroundSkillsWithPoints(backgroundSkillPoints);
  const allSkillKeys = getAllSkillKeys();
  const customMode = backgroundTemplateId === null;
  const hasChoice = backgroundTemplateId !== undefined;
  const showSkillGraph = hasChoice && poolSkills.length === 4;
  const visibleSkillNodes = backgroundPointsComplete ? occupiedBackgroundSkills : poolSkills;
  const skillGraphViewMode = backgroundPointsComplete ? 'collapsed' : 'pool';

  const [scrollPhase, setScrollPhase] = useState<CarouselScrollPhase>('settled');
  const [activeSkill, setActiveSkill] = useState<SagaDriveSkillKey | null>(null);
  const specializationSuggestions = selectedTemplate?.specializationSuggestions.filter((entry) => occupiedBackgroundSkills.includes(entry.skillId)) ?? [];

  const handleScrollPhaseChange = useCallback((phase: CarouselScrollPhase) => {
    setScrollPhase(phase);
  }, []);
  const handleStandstill = useCallback(() => setScrollPhase('settled'), []);
  const handleBackgroundPointAdjust = useCallback(
    (skill: SagaDriveSkillKey, delta: 1 | -1) => {
      onBackgroundSkillPointsChange(adjustBackgroundSkillPoints(backgroundSkillPoints, skill, delta));
    },
    [backgroundSkillPoints, onBackgroundSkillPointsChange],
  );

  return (
    <section className="space-y-5" aria-labelledby="background-competency-heading" data-background-panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h3 id="background-competency-heading" className="font-semibold">Hintergrund</h3>
            <RuleHelp label="Hintergrund">
              Dein Hintergrund definiert vier Framework-Fertigkeiten. Du verteilst 2 stackbare Hintergrundpunkte (+2 auf einen Skill oder +1/+1). Attribute werden dadurch nicht erhöht.
            </RuleHelp>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Wähle eine Vergangenheit im Karussell, verteile 2 Hintergrundpunkte auf die vier Pool-Fertigkeiten und lege danach eine Spezialisierung fest. Nach Abschluss zeigt der Graph nur noch belegte Skills.</p>
        </div>
        <Badge variant={complete ? 'default' : 'outline'}>{complete ? 'Hintergrund vollständig' : 'Hintergrund offen'}</Badge>
      </div>

      <BackgroundCarousel
        templates={templates}
        selectedId={backgroundTemplateId}
        onSelect={onTemplateSelect}
        labelledBy="background-competency-heading"
        onScrollPhaseChange={handleScrollPhaseChange}
      />

      {!hasChoice ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground">
          Wähle einen Hintergrund im Karussell. Danach siehst du die vier Pool-Fertigkeiten und verteilst 2 Hintergrundpunkte darauf.
        </div>
      ) : (
        <div className="space-y-4">
          {customMode ? (
            <div className="space-y-4 rounded-lg border border-border bg-muted/5 p-4">
              <div className="space-y-2">
                <Label htmlFor="background-name">Name des Hintergrunds</Label>
                <Input id="background-name" value={backgroundName} onChange={(event) => onBackgroundNameChange(event.target.value)} placeholder="z. B. Feldheiler, Kurierin, Hofgelehrter" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Vier Pool-Fertigkeiten festlegen</p>
                    <p className="text-sm text-muted-foreground">Diese Auswahl definiert deinen Kompetenzrahmen. Hintergrundpunkte folgen direkt darunter.</p>
                  </div>
                  <Badge variant={poolSkills.length === 4 ? 'default' : 'outline'}>{poolSkills.length} / 4</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {skillPool.map((skill, index) => (
                    <SkillSelectField
                      key={index}
                      value={skill}
                      onValueChange={(value) => onPoolSkillChange(index, value)}
                      skillOptions={allSkillKeys}
                      disabledSkillKeys={skillPool.filter((current, currentIndex): current is SagaDriveSkillKey => currentIndex !== index && isSagaDriveSkillKey(current))}
                      placeholder={`Fertigkeit ${index + 1}`}
                      ariaLabel={`Hintergrund-Fertigkeit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {showSkillGraph ? (
            <div className="space-y-2 -mt-2">
              <BackgroundSkillConnector
                skills={visibleSkillNodes}
                trainedSkills={occupiedBackgroundSkills}
                activeSkill={activeSkill}
                scrollPhase={scrollPhase}
                onStandstill={handleStandstill}
              />

              {/* Centered pool block on large screens; mobile stays full-width stacked. */}
              <div className="mx-auto w-full max-w-5xl space-y-2">
                <div
                  className={`mx-auto grid w-full gap-3 sm:grid-cols-2 ${visibleSkillNodes.length > 2 ? 'xl:grid-cols-4' : 'max-w-2xl'}`}
                  data-background-skill-grid
                  data-training-view={skillGraphViewMode}
                >
                  {visibleSkillNodes.map((skillKey) => (
                    <BackgroundSkillNode
                      key={skillKey}
                      skillKey={skillKey}
                      pointValue={(backgroundSkillPoints[skillKey] ?? 0) as 0 | 1 | 2}
                      pointsUsed={backgroundPointsUsed}
                      specializationName={backgroundPointsComplete && specializationSkill === skillKey ? specializationName : undefined}
                      onHoverChange={(skill) => setActiveSkill(skill)}
                      onAdjust={handleBackgroundPointAdjust}
                    />
                  ))}
                </div>

                {/* Budget copy sits under the skill boxes so the graph leads with the nodes. */}
                <div
                  className="flex flex-wrap items-center justify-between gap-2 px-0.5"
                  data-background-points-budget
                >
                  <div>
                    <p className="font-medium">2 Hintergrund-Fertigkeitspunkte</p>
                    <p className="text-sm text-muted-foreground">Direkt an den Pool-Skills verteilen. +2 auf einen Skill oder +1/+1.</p>
                  </div>
                  <Badge variant={backgroundPointsComplete ? 'default' : 'outline'}>
                    {backgroundPointsUsed} / {SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS} verteilt
                  </Badge>
                </div>

                {backgroundPointsComplete ? (
                  <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-medium">Spezialisierung</p>
                        <RuleHelp label="Spezialisierung">Eine passende Spezialisierung gibt +2 auf anwendbare Checks. Die erste Spezialisierung benötigt Fertigkeitswert 1.</RuleHelp>
                      </div>
                      <p className="text-sm text-muted-foreground">Wähle ein Fachgebiet auf einem deiner Hintergrund-Skills. Nach der Wahl erscheint es direkt als untergeordneter Branch am Skill.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SkillSelectField
                        value={specializationSkill}
                        onValueChange={(value) => onSpecializationSkillChange(isSagaDriveSkillKey(value) ? value : '')}
                        skillOptions={occupiedBackgroundSkills}
                        placeholder="Hintergrund-Fertigkeit wählen"
                        ariaLabel="Spezialisierung Fertigkeit wählen"
                      />
                      <Input value={specializationName} onChange={(event) => onSpecializationNameChange(event.target.value)} placeholder="Fachgebiet, z. B. Notfallmedizin" aria-label="Spezialisierung Fachgebiet" />
                    </div>
                    {specializationSuggestions.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Vorschläge:</span>
                        {specializationSuggestions.map((entry) => (
                          <Button key={`${entry.skillId}-${entry.name}`} type="button" size="sm" variant="outline" className="min-h-11 px-2 text-xs" onClick={() => {
                            if (onSpecializationApply) {
                              onSpecializationApply(entry.skillId, entry.name);
                            } else {
                              onSpecializationSkillChange(entry.skillId);
                              onSpecializationNameChange(entry.name);
                            }
                          }}>
                            {getSagaDriveSkill(entry.skillId).label}: {entry.name}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                    Verteile zuerst alle 2 Hintergrundpunkte. Danach wird die Spezialisierung freigeschaltet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
              {customMode
                ? 'Vervollständige zuerst alle vier Pool-Fertigkeiten. Danach verbindet der Graph sie mit dem gewählten Hintergrund.'
                : 'Pool wird geladen …'}
            </div>
          )}
        </div>
      )}

      {hasChoice ? (
        <div className="rounded-lg border border-border bg-muted/10 p-4">
          <div className="mb-4">
            <p className="font-medium">Verankerung in der Welt</p>
            <p className="mt-1 text-sm text-muted-foreground">Milieu, Kontakt, Komplikation und Kommunikation gehören zu deiner Vergangenheit, aber nicht in den mechanischen Skill-Graphen.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="milieu">Milieuzugang</Label><Input id="milieu" value={milieuAccess} onChange={(event) => onMilieuAccessChange(event.target.value)} placeholder="z. B. Notaufnahmen, Unterwelt, Akademien" /><SuggestionButtons values={selectedTemplate?.milieuSuggestions} onSelect={onMilieuAccessChange} /></div>
            <div className="space-y-2"><Label htmlFor="contact">Kontakt</Label><Input id="contact" value={contact} onChange={(event) => onContactChange(event.target.value)} placeholder="Wer kann dir helfen?" /><SuggestionButtons values={selectedTemplate?.contactSuggestions} onSelect={onContactChange} /></div>
            <div className="space-y-2"><Label htmlFor="complication">Komplikation</Label><Input id="complication" value={complication} onChange={(event) => onComplicationChange(event.target.value)} placeholder="z. B. alte Schulden, gesuchte Identität" /><SuggestionButtons values={selectedTemplate?.complicationSuggestions} onSelect={onComplicationChange} /></div>
            <div className="space-y-2"><Label htmlFor="communication">Zusätzliche Kommunikationsform</Label><Input id="communication" value={communication} onChange={(event) => onCommunicationChange(event.target.value)} placeholder="z. B. Gebärdensprache, Funkcodes" /><SuggestionButtons values={selectedTemplate?.communicationSuggestions} onSelect={onCommunicationChange} /></div>
          </div>
        </div>
      ) : null}

      <div className={`rounded-lg border px-4 py-3 text-sm ${complete ? 'border-primary/30 bg-primary/5' : validationAttempted ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'border-border bg-muted/10'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">{complete ? 'Hintergrund ist regelkonform vollständig.' : 'Noch offen: Template/Name, 4 Pool-Skills, 2 Hintergrundpunkte, 1 Spezialisierung sowie Milieu, Kontakt, Komplikation und Kommunikationsform.'}</p>
          <span className="text-xs">{poolSkills.length}/4 Pool · {backgroundPointsUsed}/2 Punkte · {specializationSkill && specializationName.trim() ? '1/1 Spezialisierung' : '0/1 Spezialisierung'}</span>
        </div>
      </div>
    </section>
  );
}

function getAllSkillKeys(): SagaDriveSkillKey[] {
  return [
    'athletics', 'acrobatics', 'sleight', 'stealth', 'melee', 'ranged', 'awareness', 'insight', 'survival',
    'investigation', 'knowledge', 'technology', 'medicine', 'driving', 'persuasion', 'deception', 'intimidation', 'performance',
  ];
}
