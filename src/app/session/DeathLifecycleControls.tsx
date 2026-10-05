/**
 * DeathLifecycleControls — GM controls for downed / death save / stabilize / dead (#373).
 * Location: src/app/session/DeathLifecycleControls.tsx
 *
 * Desktop + mobile (min-h-11). Irreversible death requires confirmDead checkbox.
 */
import { useState } from 'react';
import type { LiveSessionAccess } from '../../domains/session/contracts/live-session-access';
import {
  lifeStatusLabel,
  type CharacterLifeState,
  type DeathSaveGrade,
  type LifeDifficulty,
} from '../../domains/session/contracts/session-death-lifecycle';
import { Button } from '../../shared/ui/button';
import { Label } from '../../shared/ui/label';
import { useDeathLifecycle } from './hooks/useDeathLifecycle';

type DeathLifecycleControlsProps = {
  sessionId: string | null;
  access: LiveSessionAccess | null;
  characterId: string | null;
  participantId?: string | null;
  characterName?: string | null;
};

const GRADES: { value: DeathSaveGrade; label: string }[] = [
  { value: 'crit_success', label: 'Krit. Erfolg' },
  { value: 'success', label: 'Erfolg' },
  { value: 'failure', label: 'Fehlschlag' },
  { value: 'crit_failure', label: 'Krit. Fehlschlag' },
];

const DIFFS: LifeDifficulty[] = ['Heroisch', 'Standard', 'Hart'];

export function DeathLifecycleControls({
  sessionId,
  access,
  characterId,
  participantId,
  characterName,
}: DeathLifecycleControlsProps) {
  const { run, isBusy, error, sessionDifficulty, lifeFor } = useDeathLifecycle({
    sessionId,
    access,
  });
  const [grade, setGrade] = useState<DeathSaveGrade>('success');
  const [confirmDead, setConfirmDead] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const life: CharacterLifeState | null = lifeFor(characterId);
  const disabled = isBusy || !characterId || access?.role !== 'gamemaster';

  return (
    <div
      className="space-y-2 rounded-md border border-border/70 p-3"
      data-death-lifecycle-controls="v1"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">Leben / Tod</h3>
        <p className="text-xs text-muted-foreground" data-death-lifecycle-difficulty>
          Härte: {sessionDifficulty}
        </p>
      </div>
      <p className="text-xs text-muted-foreground" data-death-lifecycle-target>
        Ziel: {characterName ?? characterId ?? '—'}
      </p>
      <p
        className="text-sm font-medium tabular-nums"
        data-death-lifecycle-status
        data-life-status={life?.status ?? 'alive'}
      >
        {life ? lifeStatusLabel(life) : 'Lebend (kein Life-State)'}
        {life && life.status !== 'alive' && life.status !== 'dead'
          ? ` · Sterbend ${life.dyingLevel}`
          : ''}
        {life && life.wounds > 0 ? ` · Wunden ${life.wounds}` : ''}
      </p>

      <div className="flex flex-wrap gap-2">
        {DIFFS.map((d) => (
          <Button
            key={d}
            type="button"
            size="sm"
            variant={sessionDifficulty === d ? 'default' : 'outline'}
            className="min-h-11"
            disabled={disabled}
            data-death-lifecycle-set-difficulty={d}
            onClick={() =>
              void run({
                op: 'set_difficulty',
                characterId: characterId ?? '',
                difficulty: d,
              }).then((ok) => setMessage(ok ? `Härte ${d}` : null))
            }
          >
            {d}
          </Button>
        ))}
      </div>

      <div className="space-y-1">
        <Label htmlFor="death-save-grade" className="text-xs">
          Todeswurf-Ergebnis
        </Label>
        <select
          id="death-save-grade"
          className="min-h-11 w-full rounded-md border border-border bg-background px-2 text-sm"
          value={grade}
          disabled={disabled}
          data-death-lifecycle-grade
          onChange={(e) => setGrade(e.target.value as DeathSaveGrade)}
        >
          {GRADES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          disabled={disabled || life?.status !== 'downed'}
          data-death-lifecycle-death-save
          onClick={() =>
            void run({
              op: 'death_save',
              characterId: characterId!,
              participantId,
              grade,
            }).then((ok) => setMessage(ok ? 'Todeswurf angewandt.' : null))
          }
        >
          Todeswurf
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          disabled={
            disabled
            || (life?.status !== 'downed' && life?.status !== 'stable')
          }
          data-death-lifecycle-stabilize
          onClick={() =>
            void run({
              op: 'stabilize',
              characterId: characterId!,
              participantId,
            }).then((ok) => setMessage(ok ? 'Stabilisiert.' : null))
          }
        >
          Stabilisieren
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          disabled={disabled}
          data-death-lifecycle-clear
          onClick={() =>
            void run({
              op: 'clear_alive',
              characterId: characterId!,
              participantId,
              note: 'GM correction',
            }).then((ok) => setMessage(ok ? 'Wieder lebendig (Korrektur).' : null))
          }
        >
          Korrektur: lebend
        </Button>
      </div>

      <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={confirmDead}
          disabled={disabled}
          data-death-lifecycle-confirm-dead
          onChange={(e) => setConfirmDead(e.target.checked)}
        />
        Tod bestätigen (irreversibel ohne Korrektur)
      </label>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="min-h-11"
        disabled={disabled || !confirmDead || life?.status === 'dead'}
        data-death-lifecycle-mark-dead
        onClick={() =>
          void run({
            op: 'mark_dead',
            characterId: characterId!,
            participantId,
            confirmDead: true,
          }).then((ok) => {
            setMessage(ok ? 'Charakter tot.' : null);
            if (ok) setConfirmDead(false);
          })
        }
      >
        Als tot markieren
      </Button>

      {error ? (
        <p className="text-xs text-destructive" role="alert" data-death-lifecycle-error>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-muted-foreground" data-death-lifecycle-message>
          {message}
        </p>
      ) : null}
    </div>
  );
}
