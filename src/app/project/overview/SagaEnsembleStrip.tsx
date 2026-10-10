/**
 * SagaEnsembleStrip — Active characters / members on the saga hub (#571).
 * Location: src/app/project/overview/SagaEnsembleStrip.tsx
 *
 * Presentational; no cards — compact horizontal strip.
 */
import type { SagaEnsembleMemberVm } from '../../../domains/project/contracts/saga-overview';

export type SagaEnsembleStripProps = {
  ensemble: readonly SagaEnsembleMemberVm[];
};

function roleLabel(role: string): string {
  if (role === 'gamemaster' || role === 'gm') return 'SL';
  if (role === 'viewer' || role === 'observer') return 'Beobachter';
  return 'Spieler';
}

export function SagaEnsembleStrip({ ensemble }: SagaEnsembleStripProps) {
  return (
    <section className="space-y-3" data-saga-overview-ensemble aria-labelledby="saga-overview-ensemble-title">
      <div className="space-y-1">
        <h3 id="saga-overview-ensemble-title" className="text-lg font-semibold text-foreground">
          Ensemble
        </h3>
        <p className="text-sm text-muted-foreground">
          {ensemble.length === 0
            ? 'Noch keine aktiven Mitglieder.'
            : `${ensemble.length} aktiv`}
        </p>
      </div>

      {ensemble.length === 0 ? null : (
        <ul className="flex flex-wrap gap-x-4 gap-y-2" data-saga-overview-ensemble-list>
          {ensemble.map((member) => {
            const label = member.characterName?.trim() || roleLabel(String(member.role));
            return (
              <li
                key={member.userId}
                className="text-sm text-foreground"
                data-saga-overview-ensemble-member={member.userId}
              >
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · {roleLabel(String(member.role))}
                  {member.isSelf ? ' · du' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
