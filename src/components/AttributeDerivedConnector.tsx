/**
 * AttributeDerivedConnector — Bracket-Linien zwischen einer gewählten Attributkarte und
 * den darunter angezeigten, gefilterten abgeleiteten-Werte-Boxen (max. 3 nebeneinander).
 *
 * Technik wie ArchetypeConnector (browo-hr TreeHook): ein px-genaues SVG im Zwischenraum
 * (nicht als Overlay über dem gesamten Grid), gemessen per getBoundingClientRect +
 * ResizeObserver. Stiel von der Attributkarten-Mitte, Sammelschiene, Abfälle zu den
 * Zielboxen — Junctions teilen sich Koordinaten für durchgehende Linien.
 *
 * Interaktion (wie beim Archetyp):
 *  - Klick-Auswahl: blau (text-primary) + dauerhafte Flow-Animation.
 *  - Hover-Vorschau: weiß + einmaliger Draw-in.
 *  - Keine Aktiv-Zelle / keine Ziele: rendert nichts.
 *  - CHA-Hinweis kommt vom Parent (kein Baum).
 *
 * Rein dekorativ (aria-hidden), rein clientseitig, Vercel-kompatibel.
 * Location: src/components/AttributeDerivedConnector.tsx
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface AttributeDerivedConnectorProps {
  sourceAttribute: string | null;
  animated: boolean;
  targetSelectors: string[];
}

interface TreeLayout {
  width: number;
  height: number;
  stemX: number;
  railY: number;
  targets: number[];
}

const CSS = `
  @keyframes attr-connector-draw {
    from { stroke-dashoffset: 1; }
    to { stroke-dashoffset: 0; }
  }
  @keyframes attr-connector-flow {
    from { stroke-dashoffset: 0; }
    to { stroke-dashoffset: -14; }
  }
  /* Draw-in: pathLength=1 → Dash relativ zur Pfadlänge (kurze + lange Routen gleich). */
  .attr-connector-route {
    stroke-dasharray: 1;
    animation: attr-connector-draw 450ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  /* Flow: echte Pixel-Abstände, KEIN pathLength — sonst wirken kurze Routen (z.B. GES→Reflex) dichter. */
  .attr-connector-route--flow {
    stroke-dasharray: 8 6;
    animation: attr-connector-flow 0.75s linear infinite;
  }
`;

const clampRound = (value: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, value)) * 10) / 10;

export function AttributeDerivedConnector({ sourceAttribute, animated, targetSelectors }: AttributeDerivedConnectorProps) {
  const connectorRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<TreeLayout | null>(null);
  const open = Boolean(sourceAttribute) && targetSelectors.length > 0;
  const selectorKey = targetSelectors.join('|');

  const measure = useCallback(() => {
    const el = connectorRef.current;
    if (!el || !sourceAttribute || targetSelectors.length === 0) {
      setLayout((current) => (current === null ? current : null));
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const section = el.closest('[data-attr-connector-section]');
    const sourceEl = section?.querySelector(`[data-attr-card="${sourceAttribute}"]`);
    if (!sourceEl) return;
    const sourceRect = sourceEl.getBoundingClientRect();
    const stemX = clampRound(sourceRect.left + sourceRect.width / 2 - rect.left, 0, rect.width);

    const targets: number[] = [];
    const seen = new Set<number>();
    for (const selector of targetSelectors) {
      const targetEl = section?.querySelector(`[data-derived-card="${selector}"]`);
      if (!targetEl) continue;
      const targetRect = targetEl.getBoundingClientRect();
      const x = clampRound(targetRect.left + targetRect.width / 2 - rect.left, 0, rect.width);
      if (seen.has(x)) continue;
      seen.add(x);
      targets.push(x);
    }
    if (targets.length === 0) {
      setLayout((current) => (current === null ? current : null));
      return;
    }

    const next: TreeLayout = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      stemX,
      railY: rect.height >= 56 ? 20 : 14,
      targets,
    };
    setLayout((current) => {
      const same =
        current !== null &&
        current.width === next.width &&
        current.height === next.height &&
        current.stemX === next.stemX &&
        current.targets.length === next.targets.length &&
        current.targets.every((x, i) => x === next.targets[i]);
      return same ? current : next;
    });
  }, [sourceAttribute, targetSelectors, selectorKey]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure, open]);

  useEffect(() => {
    if (!open) return;
    const el = connectorRef.current;
    const section = el?.closest('[data-attr-connector-section]') ?? null;
    const observer = new ResizeObserver(() => measure());
    if (el) observer.observe(el);
    if (section) observer.observe(section);
    window.addEventListener('resize', measure);
    const t1 = window.setTimeout(measure, 60);
    const t2 = window.setTimeout(measure, 280);
    const t3 = window.setTimeout(measure, 600);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [measure, open]);

  if (!open) return null;

  // Eine Route pro Ziel (Stiel → seitlich → Abfall). Keine durchgehende L→R-Schiene:
  // die würde links vom Stiel wie Rückwärtsfluss wirken.
  const routeClass = animated ? 'attr-connector-route attr-connector-route--flow' : 'attr-connector-route';
  const routeKeyBase = `${sourceAttribute}-${animated ? 'flow' : 'static'}-${selectorKey}`;

  return (
    <div ref={connectorRef} className="relative -mt-px h-12 md:h-14" data-attr-connector aria-hidden="true">
      <style>{CSS}</style>
      {layout ? (
        <svg
          className={`pointer-events-none absolute inset-0 overflow-visible ${animated ? 'text-primary' : 'text-foreground'}`}
          width={layout.width}
          height={layout.height}
          fill="none"
        >
          {layout.targets.map((targetX, index) => (
            <path
              key={`${routeKeyBase}-${index}-${Math.round(targetX)}`}
              d={`M ${layout.stemX} 0 L ${layout.stemX} ${layout.railY} L ${targetX} ${layout.railY} L ${targetX} ${layout.height}`}
              pathLength={animated ? undefined : 1}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={routeClass}
            />
          ))}
        </svg>
      ) : null}
    </div>
  );
}
