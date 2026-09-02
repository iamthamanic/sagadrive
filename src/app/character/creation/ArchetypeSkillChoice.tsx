/**
 * ArchetypeSkillChoice — Auswahl des Archetyp-Fertigkeitspunkts mit sichtbarer Regelwirkung.
 * Location: src/modules/characters/components/ArchetypeSkillChoice.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '../../../components/ui/badge';
import {
  SAGA_DRIVE_START_SKILL_CAP,
  getSagaDriveAttribute,
  getSagaDriveSkill,
  type SagaDriveAttributeKey,
  type SagaDriveSkillKey,
} from '../../../modules/rulesets/characterCreation';
import { RuleHelp } from '../shared/RuleHelp';
import type { CarouselScrollPhase } from './ArchetypeCarousel';

interface ArchetypeSkillChoiceProps {
  skills: readonly SagaDriveSkillKey[];
  selectedSkill?: SagaDriveSkillKey;
  onSelect: (skill: SagaDriveSkillKey) => void;
  backgroundTrainedSkills: readonly SagaDriveSkillKey[];
  freeRanks: Record<SagaDriveSkillKey, number>;
  attributes: Record<SagaDriveAttributeKey, number>;
  experienceBonus?: number;
  scrollPhase?: CarouselScrollPhase;
  onStandstill?: () => void;
}

function getCompetencyLabel(rank: number): string {
  if (rank === 0) return 'Untrainiert';
  if (rank === 1) return 'Trainiert';
  if (rank === 2) return 'Geübt';
  if (rank === 3) return 'Fachkundig';
  return 'Meisterlich';
}

function getProjectedRank(
  skillKey: SagaDriveSkillKey,
  backgroundTrainedSkills: readonly SagaDriveSkillKey[],
  freeRanks: Record<SagaDriveSkillKey, number>,
): number {
  return freeRanks[skillKey] + (backgroundTrainedSkills.includes(skillKey) ? 1 : 0) + 1;
}

function getDerivedStatHints(skillKey: SagaDriveSkillKey): string[] {
  if (skillKey === 'melee' || skillKey === 'acrobatics') {
    return ['Erhöht deine Verteidigung, wenn dieser Wert höher ist als Nahkampf/Akrobatik der Alternative.'];
  }
  if (skillKey === 'awareness') {
    return ['Trainierte Aufmerksamkeit zählt für Initiative (d20 + Wahrnehmung + Aufmerksamkeit + Erfahrungsbonus).'];
  }
  if (skillKey === 'athletics') {
    return ['Zählt für Manöverwiderstand zusammen mit Stärke bzw. Geschicklichkeit.'];
  }
  return [];
}

/**
 * Bracket-Verbindung nach dem browo-hr TreeHook-Muster (HrKo_TreeHook.tsx):
 * ein einziges px-genaues SVG-Overlay, gemessen per getBoundingClientRect +
 * ResizeObserver statt skalierten Prozent-ViewBoxes. Jedes Segment (Stiel,
 * Sammelschiene, Abfaelle) wird genau einmal gezeichnet und trifft exakt an
 * denselben Junction-Koordinaten — dadurch durchgehende Linien. Der Basislayer
 * ist grau wie Sekundaertext. Die Route zur gewaehlten Box laeuft dauerhaft
 * als Primary-blauer Flow (Marching-Ants); beim Hover ueber eine andere Box
 * zeichnet sich zusaetzlich eine weisse, statische Route nach. Waehrend eines
 * Carousel-Slides (scrollPhase='scrolling') wird die Geometrie eingefroren und
 * das Overlay ausgeblendet; der Standstill-Watcher meldet das echte Ende der
 * Bewegung, dann misst der Connector neu und remountet das SVG per Key mit
 * Fade-in (Opacity + Clip-Wipe von oben nach unten). Rein dekorativ (aria-hidden).
 */
interface ArchetypeConnectorProps {
  skills: readonly SagaDriveSkillKey[];
  activeSkill: SagaDriveSkillKey | null;
  selectedSkill: SagaDriveSkillKey | null;
  scrollPhase: CarouselScrollPhase;
  onStandstill: () => void;
}

function ArchetypeConnector({ skills, activeSkill, selectedSkill, scrollPhase, onStandstill }: ArchetypeConnectorProps) {
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

    const panel = el.closest('[data-archetype-panel]');
    const card = panel?.querySelector('.archetype-carousel-item.is-center [data-slot="card"]');
    const cardRect = card?.getBoundingClientRect();
    const sourceX = cardRect ? cardRect.left + cardRect.width / 2 - rect.left : rect.width / 2;

    const grid = panel?.querySelector('[data-archetype-skill-grid]');
    const seen = new Set<number>();
    const targets: number[] = [];
    for (const button of Array.from(grid?.querySelectorAll(':scope > button') ?? [])) {
      const b = button.getBoundingClientRect();
      const center = Math.round(Math.min(rect.width, Math.max(0, b.left + b.width / 2 - rect.left)) * 10) / 10;
      if (seen.has(center)) continue;
      seen.add(center);
      targets.push(center);
    }

    const round1 = (v: number) => Math.round(v * 10) / 10;
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
        current.targets.every((t, i) => t === next.targets[i]);
      return same ? current : next;
    });
  }, []);

  useEffect(() => {
    scrollPhaseRef.current = scrollPhase;
    if (scrollPhase === 'settled') {
      measure();
      setFadeGeneration((gen) => gen + 1);
    }
  }, [scrollPhase, measure]);

  // Standstill-Watcher: Solange 'scrolling', beobachtet ein rAF-Loop die
  // Position der mittleren Archetyp-Karte pro Frame. Erst 3 stabile Frames
  // (±0.5px) melden Bewegungsende nach oben — unabhaengig von Emblas
  // Event-Sparsamkeit beim programmatischen scrollTo und timing-sicher
  // gegenueber dem Ease-out-Schwanz.
  useEffect(() => {
    if (scrollPhase !== 'scrolling') return;
    let frame: number | undefined;
    let stableCount = 0;
    let lastX: number | null = null;
    const getCardX = () => {
      const panel = connectorRef.current?.closest('[data-archetype-panel]');
      const card = panel?.querySelector('.archetype-carousel-item.is-center [data-slot="card"]');
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
    const grid = el?.closest('[data-archetype-panel]')?.querySelector('[data-archetype-skill-grid]') ?? null;
    const ro = new ResizeObserver(() => measure());
    if (el) ro.observe(el);
    if (grid) ro.observe(grid);
    window.addEventListener('resize', measure);
    const t1 = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 350);
    const t3 = setTimeout(measure, 700);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [measure, skills, selectedSkill]);

  const railY = layout.height >= 72 ? 24 : layout.height >= 56 ? 18 : layout.height >= 36 ? 12 : 10;
  const railLeft = layout.targets.length ? Math.min(...layout.targets, layout.sourceX) : 0;
  const railRight = layout.targets.length ? Math.max(...layout.targets, layout.sourceX) : layout.width;
  const selectedIndex = selectedSkill ? skills.indexOf(selectedSkill) : -1;
  const hoverIndex = activeSkill ? skills.indexOf(activeSkill) : -1;
  const selectedTarget = selectedIndex >= 0 ? layout.targets[selectedIndex] : undefined;
  const hoverTarget = hoverIndex >= 0 && hoverIndex !== selectedIndex ? layout.targets[hoverIndex] : undefined;
  const hasGeometry = layout.width > 0 && layout.targets.length > 0;

  return (
    <div ref={connectorRef} className="relative h-14 md:h-[72px] -mt-px" aria-hidden="true">
      <style>{`
        @keyframes archetype-connector-draw {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes archetype-connector-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -15; }
        }
        @keyframes archetype-connector-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes archetype-connector-reveal {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0% 0); }
        }
        .archetype-connector-fade {
          animation:
            archetype-connector-fade 200ms ease-out both,
            archetype-connector-reveal 340ms cubic-bezier(0.33, 1, 0.68, 1) both;
        }
        .archetype-connector-hide {
          opacity: 0;
          pointer-events: none;
        }
        .archetype-connector-route {
          stroke-dasharray: 100;
          animation: archetype-connector-draw 450ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .archetype-connector-route--flow {
          stroke-dasharray: 10 5;
          animation: archetype-connector-flow 0.75s linear infinite;
        }
      `}</style>
      {hasGeometry && (
        <svg
          key={`${skills.join('|')}-${fadeGeneration}`}
          className={`${scrollPhase === 'settled' ? 'archetype-connector-fade' : 'archetype-connector-hide'} absolute inset-0 overflow-visible`}
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
          {selectedTarget !== undefined && (
            <g className="text-primary">
              <path
                key={`sel-${selectedIndex}-${Math.round(selectedTarget)}`}
                d={`M ${layout.sourceX} 0 L ${layout.sourceX} ${railY} L ${selectedTarget} ${railY} L ${selectedTarget} ${layout.height}`}
                className="archetype-connector-route archetype-connector-route--flow"
                pathLength={100}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
          {hoverTarget !== undefined && (
            <g className="text-foreground">
              <path
                key={`hover-${hoverIndex}-${Math.round(hoverTarget)}`}
                d={`M ${layout.sourceX} 0 L ${layout.sourceX} ${railY} L ${hoverTarget} ${railY} L ${hoverTarget} ${layout.height}`}
                className="archetype-connector-route"
                pathLength={100}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
        </svg>
      )}
    </div>
  );
}

export function ArchetypeSkillChoice({
  skills,
  selectedSkill,
  onSelect,
  backgroundTrainedSkills,
  freeRanks,
  attributes,
  experienceBonus = 1,
  scrollPhase = 'settled',
  onStandstill,
}: ArchetypeSkillChoiceProps) {
  const [activeSkill, setActiveSkill] = useState<SagaDriveSkillKey | null>(null);

  return (
    <div className="space-y-2 -mt-6">
      <ArchetypeConnector
        skills={skills}
        activeSkill={activeSkill}
        selectedSkill={selectedSkill}
        scrollPhase={scrollPhase}
        onStandstill={onStandstill ?? (() => {})}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-archetype-skill-grid>
        {skills.map((skillKey) => {
          const skill = getSagaDriveSkill(skillKey);
          const attribute = getSagaDriveAttribute(skill.attribute);
          const selected = selectedSkill === skillKey;
          const projectedRank = getProjectedRank(skillKey, backgroundTrainedSkills, freeRanks);
          const disabled = !selected && projectedRank > SAGA_DRIVE_START_SKILL_CAP;
          const hasBackground = backgroundTrainedSkills.includes(skillKey);
          const freeRank = freeRanks[skillKey];
          const probeModifier = attributes[skill.attribute] + projectedRank + (projectedRank > 0 ? experienceBonus : 0);
          const derivedHints = getDerivedStatHints(skillKey);

          return (
            <button
              key={skillKey}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(skillKey)}
              onMouseEnter={() => setActiveSkill(skillKey)}
              onMouseLeave={() => setActiveSkill((current) => (current === skillKey ? null : current))}
              onFocus={() => setActiveSkill(skillKey)}
              onBlur={() => setActiveSkill((current) => (current === skillKey ? null : current))}
              className={
                selected
                  ? 'flex flex-col rounded-lg border border-primary bg-primary/10 p-3 text-left transition-colors'
                  : 'flex flex-col rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-45'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-medium">{skill.label}</p>
                    <RuleHelp label={skill.label}>
                      <span className="block font-semibold">{skill.label} · {attribute.label}</span>
                      <span className="mt-1 block">{skill.summary}</span>
                      {skill.excludes && <span className="mt-1 block opacity-90">Nicht: {skill.excludes}</span>}
                      <span className="mt-1 block opacity-90">Typische Spezialisierungen: {skill.specializations.join(', ')}.</span>
                    </RuleHelp>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{attribute.shortLabel} · {skill.summary}</p>
                </div>
                <Badge variant={selected ? 'default' : 'outline'}>{projectedRank}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">Archetyp +1</Badge>
                {hasBackground && <Badge variant="outline">Hintergrund +1</Badge>}
                {freeRank > 0 && <Badge variant="secondary">Frei +{freeRank}</Badge>}
              </div>

              <p className="mt-2 text-xs">
                <span className="font-medium">{getCompetencyLabel(projectedRank)}</span>
                <span className="text-muted-foreground"> · Check typisch d20 + {attribute.shortLabel} + {projectedRank} + {projectedRank > 0 ? experienceBonus : 0} = </span>
                <span className="font-semibold">{probeModifier > 0 ? `+${probeModifier}` : probeModifier}</span>
              </p>

              {derivedHints.length > 0 && (
                <p className="mt-2 text-[11px] leading-relaxed text-primary/90">{derivedHints[0]}</p>
              )}

              {disabled && (
                <p className="mt-2 text-[11px] text-destructive">Würde Startcap {SAGA_DRIVE_START_SKILL_CAP} überschreiten.</p>
              )}
            </button>
          );
        })}
      </div>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Archetyp-Punkt (1 von 10) · welche typische Fertigkeit?</span>
        <RuleHelp label="Archetyp-Punkt">
          Du legst genau 1 der 10 Start-Fertigkeitspunkte in eine typische Fertigkeit deines Archetyps. Die Wahl bestimmt, welche Checks du ab Stufe 1 trainiert würfeln kannst und welche abgeleiteten Werte sich ändern.
        </RuleHelp>
      </p>
    </div>
  );
}