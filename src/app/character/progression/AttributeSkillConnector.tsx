/**
 * AttributeSkillConnector — SVG bracket lines from the centered attribute carousel
 * card down to the visible skill nodes (same visual language as BackgroundSkillConnector).
 * Location: src/app/character/progression/AttributeSkillConnector.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SagaDriveSkillKey } from '../../../modules/rulesets/characterCreation';
import type { CarouselScrollPhase } from '../../../modules/characters/hooks/carousel.types';

interface AttributeSkillConnectorProps {
  skills: readonly SagaDriveSkillKey[];
  rankedSkills: readonly SagaDriveSkillKey[];
  activeSkill: SagaDriveSkillKey | null;
  scrollPhase: CarouselScrollPhase;
  onStandstill: () => void;
}

export function AttributeSkillConnector({
  skills,
  rankedSkills,
  activeSkill,
  scrollPhase,
  onStandstill,
}: AttributeSkillConnectorProps) {
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

    const panel = el.closest('[data-attribute-skills-panel]');
    const card = panel?.querySelector('.attribute-carousel-item.is-center [data-slot="card"]');
    const cardRect = card?.getBoundingClientRect();
    const sourceX = cardRect ? cardRect.left + cardRect.width / 2 - rect.left : rect.width / 2;

    const grid = panel?.querySelector('[data-attribute-skill-grid]');
    const seen = new Set<number>();
    const targets: number[] = [];
    for (const node of Array.from(grid?.querySelectorAll(':scope > [data-attribute-skill-node]') ?? [])) {
      const box = node.getBoundingClientRect();
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
      const panel = connectorRef.current?.closest('[data-attribute-skills-panel]');
      const card = panel?.querySelector('.attribute-carousel-item.is-center [data-slot="card"]');
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
    const grid = el?.closest('[data-attribute-skills-panel]')?.querySelector('[data-attribute-skill-grid]') ?? null;
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
  }, [measure, skills, rankedSkills]);

  const railY = layout.height >= 72 ? 24 : layout.height >= 56 ? 18 : layout.height >= 36 ? 12 : 10;
  const railLeft = layout.targets.length ? Math.min(...layout.targets, layout.sourceX) : 0;
  const railRight = layout.targets.length ? Math.max(...layout.targets, layout.sourceX) : layout.width;
  const rankedIndexes = new Set(rankedSkills.map((skill) => skills.indexOf(skill)).filter((index) => index >= 0));
  const hoverIndex = activeSkill ? skills.indexOf(activeSkill) : -1;
  const hasGeometry = layout.width > 0 && layout.targets.length > 0;

  return (
    <div ref={connectorRef} className="relative -mt-px h-14 md:h-[72px]" aria-hidden="true">
      <style>{`
        @keyframes attribute-connector-draw {
          from { stroke-dashoffset: 100; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes attribute-connector-flow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -15; }
        }
        @keyframes attribute-connector-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes attribute-connector-reveal {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0% 0); }
        }
        .attribute-connector-fade {
          animation:
            attribute-connector-fade 200ms ease-out both,
            attribute-connector-reveal 340ms cubic-bezier(0.33, 1, 0.68, 1) both;
        }
        .attribute-connector-hide {
          opacity: 0;
          pointer-events: none;
        }
        .attribute-connector-route {
          stroke-dasharray: 100;
          animation: attribute-connector-draw 450ms cubic-bezier(0.4, 0, 0.2, 1) both;
        }
        .attribute-connector-route--flow {
          stroke-dasharray: 10 5;
          animation: attribute-connector-flow 0.75s linear infinite;
        }
      `}</style>
      {hasGeometry ? (
        <svg
          key={`${skills.join('|')}-${fadeGeneration}`}
          className={`${scrollPhase === 'settled' ? 'attribute-connector-fade' : 'attribute-connector-hide'} absolute inset-0 overflow-visible`}
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
          {Array.from(rankedIndexes).map((index) => {
            const targetX = layout.targets[index];
            if (targetX === undefined) return null;
            return (
              <g key={`ranked-${index}`} className="text-primary">
                <path
                  d={`M ${layout.sourceX} 0 L ${layout.sourceX} ${railY} L ${targetX} ${railY} L ${targetX} ${layout.height}`}
                  className="attribute-connector-route attribute-connector-route--flow"
                  pathLength={100}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          {hoverIndex >= 0 && !rankedIndexes.has(hoverIndex) && layout.targets[hoverIndex] !== undefined ? (
            <g className="text-foreground">
              <path
                d={`M ${layout.sourceX} 0 L ${layout.sourceX} ${railY} L ${layout.targets[hoverIndex]} ${railY} L ${layout.targets[hoverIndex]} ${layout.height}`}
                className="attribute-connector-route"
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
