/**
 * DerivedStatCard — Abgeleiteter Wert mit sichtbarer Formel-Aufschlüsselung im Character Editor.
 * Location: src/components/DerivedStatCard.tsx
 */
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
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

export function DerivedStatCard({ label, displayValue, base, prefix, terms, help, footnote }: DerivedStatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/15 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {help ? <RuleHelp label={label}>{help}</RuleHelp> : null}
        </div>
        <span className="shrink-0 text-lg font-semibold">{displayValue}</span>
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
