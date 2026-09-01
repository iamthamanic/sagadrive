/**
 * CharacterBackgroundPanel — Hintergrund-Auswahl per Karussell mit Bracket-Connector
 * zu den Pool-Skill-Nodes (2-aus-4-Training + Spezialisierungs-Branch).
 * Location: src/modules/characters/components/CharacterBackgroundPanel.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  getSagaDriveBackgroundTemplate,
  getSagaDriveBackgroundTemplatesForWorldProfile,
} from '../../rulesets/backgroundTemplates';
import {
  getSagaDriveAttribute,
  getSagaDriveSkill,
  isSagaDriveSkillKey,
  type SagaDriveSkillKey,
} from '../../rulesets/characterCreation';
import type { CarouselScrollPhase } from './ArchetypeCarousel';
import { BackgroundCarousel } from './BackgroundCarousel';
import { RuleHelp } from './RuleHelp';
import { SkillSelectField } from './SkillSelectField';

type SkillSlot = SagaDriveSkillKey | '';

interface CharacterBackgroundPanelProps {
  backgroundTemplateId: string | null | undefined;
  worldProfileId?: string | null;
  backgroundName: string;
  skillPool: readonly SkillSlot[];
  training: readonly SkillSlot[];
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
  onTrainingToggle: (skill: SagaDriveSkillKey) => void;
  onSpecializationSkillChange: (skill: SkillSlot) => void;
  onSpecializationNameChange: (value: string) => void;
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
  selected: boolean;
  disabled: boolean;
  specializationName?: string;
  onToggle: () => void;
  onHoverChange: (skill: SagaDriveSkillKey | null) => void;
}

function BackgroundSkillNode({
  skillKey,
  selected,
  disabled,
  specializationName,
  onToggle,
  onHoverChange,
}: BackgroundSkillNodeProps) {
  const skill = getSagaDriveSkill(skillKey);
  const attribute = getSagaDriveAttribute(skill.attribute);
  const hasSpecialization = Boolean(selected && specializationName?.trim());

  return (
    <div className="min-w-0" data-background-skill-node={skillKey}>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        onMouseEnter={() => onHoverChange(skillKey)}
        onMouseLeave={() => onHoverChange(null)}
        onFocus={() => onHoverChange(skillKey)}
        onBlur={() => onHoverChange(null)}
        aria-pressed={selected}
        className={`min-h-28 w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default ${disabled && !selected ? 'disabled:opacity-45' : ''} ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50 hover:bg-muted/20'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{skill.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">Standard: {attribute.shortLabel}</p>
          </div>
          {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
        </div>
        <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
          {selected ? <Badge variant="outline">Hintergrund +1</Badge> : <Badge variant="outline">Pool</Badge>}
        </div>
      </button>

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
      const button = node.querySelector('button');
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
  training,
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
  onTrainingToggle,
  onSpecializationSkillChange,
  onSpecializationNameChange,
  onMilieuAccessChange,
  onContactChange,
  onComplicationChange,
  onCommunicationChange,
}: CharacterBackgroundPanelProps) {
  const templates = getSagaDriveBackgroundTemplatesForWorldProfile(worldProfileId);
  const selectedTemplate = getSagaDriveBackgroundTemplate(backgroundTemplateId);
  const poolSkills = skillPool.filter(isSagaDriveSkillKey);
  const trainedSkills = training.filter(isSagaDriveSkillKey);
  const trainingSet = new Set(trainedSkills);
  const allSkillKeys = getAllSkillKeys();
  const customMode = backgroundTemplateId === null;
  const hasChoice = backgroundTemplateId !== undefined;
  const trainingComplete = trainedSkills.length === 2;
  const specializationSuggestions = selectedTemplate?.specializationSuggestions.filter((entry) => trainedSkills.includes(entry.skillId)) ?? [];
  const showSkillGraph = hasChoice && poolSkills.length === 4;
  const poolIdentity = poolSkills.join('|');

  const [scrollPhase, setScrollPhase] = useState<CarouselScrollPhase>('settled');
  const [activeSkill, setActiveSkill] = useState<SagaDriveSkillKey | null>(null);
  const [editingTraining, setEditingTraining] = useState(false);
  const visibleSkillNodes = trainingComplete && !editingTraining ? trainedSkills : poolSkills;

  useEffect(() => {
    setEditingTraining(false);
    setActiveSkill(null);
  }, [backgroundTemplateId, poolIdentity]);

  useEffect(() => {
    if (activeSkill && !visibleSkillNodes.includes(activeSkill)) setActiveSkill(null);
  }, [activeSkill, visibleSkillNodes]);

  const handleScrollPhaseChange = useCallback((phase: CarouselScrollPhase) => {
    setScrollPhase(phase);
  }, []);
  const handleStandstill = useCallback(() => setScrollPhase('settled'), []);
  const handleTrainingToggle = (skill: SagaDriveSkillKey) => {
    const wasSelected = trainingSet.has(skill);
    onTrainingToggle(skill);
    if (editingTraining && !wasSelected && trainedSkills.length === 1) {
      setEditingTraining(false);
      setActiveSkill(null);
    }
  };

  return (
    <section className="space-y-5" aria-labelledby="background-competency-heading" data-background-panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <h3 id="background-competency-heading" className="font-semibold">Hintergrund</h3>
            <RuleHelp label="Hintergrund">
              Dein Hintergrund erklärt, welche vier Fertigkeiten zu deiner Vergangenheit passen. Zwei davon erhalten je +1. Attribute werden dadurch nicht erhöht.
            </RuleHelp>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Wähle eine Vergangenheit im Karussell und entscheide selbst, welche zwei der vier Pool-Fertigkeiten du trainierst. Nach der Wahl zeigt der Graph nur noch deine beiden Trainings.</p>
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
          Wähle einen Hintergrund im Karussell. Danach siehst du die vier Pool-Fertigkeiten und trainierst zwei davon direkt im Graphen.
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
                    <p className="text-sm text-muted-foreground">Diese Auswahl definiert deinen Kompetenzrahmen. Training folgt direkt darunter.</p>
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
                trainedSkills={trainedSkills}
                activeSkill={activeSkill}
                scrollPhase={scrollPhase}
                onStandstill={handleStandstill}
              />

              <div
                className={`grid gap-3 sm:grid-cols-2 ${visibleSkillNodes.length > 2 ? 'xl:grid-cols-4' : 'mx-auto w-full max-w-2xl'}`}
                data-background-skill-grid
                data-training-view={trainingComplete && !editingTraining ? 'selected' : 'pool'}
              >
                {visibleSkillNodes.map((skillKey) => (
                  <BackgroundSkillNode
                    key={skillKey}
                    skillKey={skillKey}
                    selected={trainingSet.has(skillKey)}
                    disabled={
                      (trainingComplete && !editingTraining)
                      || (editingTraining && !trainingSet.has(skillKey) && trainedSkills.length >= 2)
                    }
                    specializationName={!editingTraining && specializationSkill === skillKey ? specializationName : undefined}
                    onToggle={() => handleTrainingToggle(skillKey)}
                    onHoverChange={(skill) => setActiveSkill(skill)}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{trainingComplete && !editingTraining ? 'Deine Hintergrund-Trainings' : 'Training · 2 wählen'}</p>
                  <p className="text-sm text-muted-foreground">
                    {trainingComplete && !editingTraining
                      ? 'Der Graph zeigt nur noch deine zwei gewählten Fertigkeiten. Beide erhalten Hintergrund +1.'
                      : editingTraining && trainingComplete
                        ? 'Wähle zuerst eines deiner bisherigen Trainings ab und anschließend einen anderen Pool-Skill.'
                        : 'Klicke direkt auf zwei der vier Nodes. Beide erhalten Hintergrund +1.'}
                  </p>
                </div>
                <div className="flex min-h-11 flex-wrap items-center gap-2">
                  <Badge variant={trainingComplete ? 'default' : 'outline'}>{trainedSkills.length} / 2</Badge>
                  {trainingComplete && !editingTraining ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => { setEditingTraining(true); setActiveSkill(null); }}>
                      Auswahl ändern
                    </Button>
                  ) : null}
                  {editingTraining && trainingComplete ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => { setEditingTraining(false); setActiveSkill(null); }}>
                      Auswahl beibehalten
                    </Button>
                  ) : null}
                </div>
              </div>

              {trainingComplete && !editingTraining ? (
                <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-medium">Spezialisierung</p>
                      <RuleHelp label="Spezialisierung">Eine passende Spezialisierung gibt +2 auf anwendbare Checks. Die erste Spezialisierung benötigt Fertigkeitswert 1.</RuleHelp>
                    </div>
                    <p className="text-sm text-muted-foreground">Wähle ein Fachgebiet auf einem deiner beiden trainierten Nodes. Nach der Wahl erscheint es direkt als untergeordneter Branch am Skill.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SkillSelectField
                      value={specializationSkill}
                      onValueChange={(value) => onSpecializationSkillChange(isSagaDriveSkillKey(value) ? value : '')}
                      skillOptions={trainedSkills}
                      placeholder="Trainierte Fertigkeit wählen"
                      ariaLabel="Spezialisierung Fertigkeit wählen"
                    />
                    <Input value={specializationName} onChange={(event) => onSpecializationNameChange(event.target.value)} placeholder="Fachgebiet, z. B. Notfallmedizin" aria-label="Spezialisierung Fachgebiet" />
                  </div>
                  {specializationSuggestions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>Vorschläge:</span>
                      {specializationSuggestions.map((entry) => (
                        <Button key={`${entry.skillId}-${entry.name}`} type="button" size="sm" variant="outline" className="min-h-11 px-2 text-xs" onClick={() => { onSpecializationSkillChange(entry.skillId); onSpecializationNameChange(entry.name); }}>
                          {getSagaDriveSkill(entry.skillId).label}: {entry.name}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                  {editingTraining && trainingComplete
                    ? 'Bearbeite deine zwei Trainings. Die Spezialisierung bleibt gespeichert und erscheint wieder, sobald du die Auswahl bestätigst.'
                    : 'Wähle zuerst zwei Trainings. Danach wird die Spezialisierung freigeschaltet.'}
                </div>
              )}
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
          <p className="font-medium">{complete ? 'Hintergrund ist regelkonform vollständig.' : 'Noch offen: Template/Name, 4 Pool-Skills, 2 Trainings, 1 Spezialisierung sowie Milieu, Kontakt, Komplikation und Kommunikationsform.'}</p>
          <span className="text-xs">{poolSkills.length}/4 Pool · {trainedSkills.length}/2 Training · {specializationSkill && specializationName.trim() ? '1/1 Spezialisierung' : '0/1 Spezialisierung'}</span>
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
