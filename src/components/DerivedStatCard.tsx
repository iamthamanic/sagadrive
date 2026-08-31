/**
 * DerivedStatCard — Abgeleiteter Wert mit sichtbarer Formel-Aufschlüsselung im Character Editor.
 * Die Anzeigezahl leuchtet kurz auf, wenn sich der berechnete Wert ändert (z.B. nach
 * Änderung eines verbundenen Grundattributs).
 * Location: src/components/DerivedStatCard.tsx
 */
import { useEffect, useRef, useState } from 'react';
import { RuleHelp } from '../modules/characters/components/RuleHelp';

export interface DerivedStatTerm {
  label: string;
  contribution: number;
  detail?: string;
  active?: boolean;
}

export interface DerivedStatCardProps {
  label: string;
  displayValue: string;
  base?: number;
  prefix?: string;
  terms: DerivedStatTerm[];
  help?: string;
  footnote?: string;
  /** Verbunden mit dem aktiven Grundattribut — gleiche Primary-Umrandung wie die Attributkarte. */
  highlighted?: boolean;
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

const FLASH_CSS = `
  @keyframes derived-value-flash {
    0% { color: var(--primary); text-shadow: 0 0 12px color-mix(in srgb, var(--primary) 55%, transparent); transform: scale(1.08); }
    100% { color: inherit; text-shadow: 0 0 0 transparent; transform: scale(1); }
  }
  .derived-value-flash {
    display: inline-block;
    animation: derived-value-flash 700ms ease-out;
  }
`;

export function DerivedStatCard({ label, displayValue, base, prefix, terms, help, footnote, highlighted = false }: DerivedStatCardProps) {
  const previousValueRef = useRef(displayValue);
  const [flashGeneration, setFlashGeneration] = useState(0);

  useEffect(() => {
    if (previousValueRef.current === displayValue) return;
    previousValueRef.current = displayValue;
    setFlashGeneration((generation) => generation + 1);
  }, [displayValue]);

  return (
    <div className={`rounded-lg border p-3 transition-colors ${highlighted ? 'border-primary bg-primary/5' : 'border-border bg-muted/15'}`}>
      {flashGeneration > 0 ? <style>{FLASH_CSS}</style> : null}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {help ? <RuleHelp label={label}>{help}</RuleHelp> : null}
        </div>
        <span
          key={flashGeneration}
          className={`shrink-0 text-lg font-semibold ${flashGeneration > 0 ? 'derived-value-flash' : ''}`}
        >
          {displayValue}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {prefix ? (
          <span className="rounded-md border border-border/70 bg-background/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
            {prefix}
          </span>
        ) : null}
        {base !== undefined ? (
          <span className="rounded-md border border-border/70 bg-background/70 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
            {base}
          </span>
        ) : null}
        {terms.map((term) => (
          <span
            key={`${term.label}-${term.detail ?? term.contribution}`}
            className={`rounded-md border px-1.5 py-0.5 text-[11px] ${term.active === false ? 'border-border/50 bg-muted/20 text-muted-foreground/70' : 'border-primary/25 bg-primary/10 text-foreground'}`}
            title={term.detail}
          >
            {formatSigned(term.contribution)}
            <span className="ml-1 text-muted-foreground">{term.label}</span>
          </span>
        ))}
      </div>

      {(terms.some((term) => term.detail) || footnote) && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {terms
            .filter((term) => term.detail)
            .map((term) => `${term.label}: ${term.detail}`)
            .join(' · ')}
          {terms.some((term) => term.detail) && footnote ? ' · ' : ''}
          {footnote}
        </p>
      )}
    </div>
  );
}
