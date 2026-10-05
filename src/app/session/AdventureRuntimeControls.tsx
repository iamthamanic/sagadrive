/**
 * AdventureRuntimeControls — GM World State inspector/editor (#374).
 * Location: src/app/session/AdventureRuntimeControls.tsx
 *
 * Typed flags/clocks/consequences — not raw world_state JSON dump.
 */
import { useState } from 'react';
import type { LiveSessionAccess } from '../../domains/session/contracts/live-session-access';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';
import { useAdventureRuntime } from './hooks/useAdventureRuntime';

type AdventureRuntimeControlsProps = {
  sessionId: string | null;
  access: LiveSessionAccess | null;
};

export function AdventureRuntimeControls({
  sessionId,
  access,
}: AdventureRuntimeControlsProps) {
  const { state, run, isBusy, error } = useAdventureRuntime({ sessionId, access });
  const [flagKey, setFlagKey] = useState('relic_recovered');
  const [flagValue, setFlagValue] = useState('true');
  const [clockId, setClockId] = useState('danger');
  const [consequence, setConsequence] = useState('');
  const [definitionRef, setDefinitionRef] = useState('package:dornhain');
  const [message, setMessage] = useState<string | null>(null);

  const disabled = isBusy || access?.role !== 'gamemaster';

  const parseValue = (raw: string): boolean | number | string => {
    const t = raw.trim();
    if (t === 'true') return true;
    if (t === 'false') return false;
    const n = Number(t);
    if (Number.isFinite(n) && t !== '') return n;
    return t;
  };

  return (
    <div
      className="space-y-3 rounded-md border border-border/70 p-3"
      data-adventure-runtime-controls="v1"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-foreground">Adventure Runtime</h3>
        <p className="text-xs text-muted-foreground" data-adventure-runtime-rev>
          Rev {state.sliceRevision}
          {state.definitionRef ? ` · ${state.definitionRef}` : ''}
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Definition-Ref (kein Definition-Body)</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-h-11"
            value={definitionRef}
            disabled={disabled}
            data-adventure-runtime-definition-ref
            onChange={(e) => setDefinitionRef(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            disabled={disabled}
            data-adventure-runtime-set-ref
            onClick={() =>
              void run({ op: 'set_definition_ref', definitionRef }).then((ok) =>
                setMessage(ok ? 'Definition-Ref gesetzt.' : null),
              )
            }
          >
            Setzen
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Flag-Key</Label>
          <Input
            className="min-h-11"
            value={flagKey}
            disabled={disabled}
            data-adventure-runtime-flag-key
            onChange={(e) => setFlagKey(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Wert</Label>
          <Input
            className="min-h-11"
            value={flagValue}
            disabled={disabled}
            data-adventure-runtime-flag-value
            onChange={(e) => setFlagValue(e.target.value)}
          />
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="min-h-11"
        disabled={disabled || !flagKey.trim()}
        data-adventure-runtime-set-flag
        onClick={() =>
          void run({
            op: 'set_flag',
            key: flagKey.trim(),
            value: parseValue(flagValue),
            visibility: 'shared',
          }).then((ok) => setMessage(ok ? 'Flag gesetzt.' : null))
        }
      >
        Flag setzen
      </Button>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[8rem] flex-1 space-y-1">
          <Label className="text-xs">Escalation Clock</Label>
          <Input
            className="min-h-11"
            value={clockId}
            disabled={disabled}
            data-adventure-runtime-clock-id
            onChange={(e) => setClockId(e.target.value)}
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          disabled={disabled}
          data-adventure-runtime-tick-clock
          onClick={() =>
            void run({
              op: 'tick_clock',
              clockId: clockId.trim() || 'danger',
              clockDelta: 1,
              visibility: 'shared',
            }).then((ok) => setMessage(ok ? 'Clock +1.' : null))
          }
        >
          Clock +1
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Consequence</Label>
        <Input
          className="min-h-11"
          value={consequence}
          disabled={disabled}
          placeholder="z. B. Relikt gestohlen"
          data-adventure-runtime-consequence
          onChange={(e) => setConsequence(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          disabled={disabled || !consequence.trim()}
          data-adventure-runtime-add-consequence
          onClick={() =>
            void run({
              op: 'add_consequence',
              summary: consequence.trim(),
              consequenceKind: 'story',
              visibility: 'shared',
            }).then((ok) => {
              setMessage(ok ? 'Consequence hinzugefügt.' : null);
              if (ok) setConsequence('');
            })
          }
        >
          Consequence speichern
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          disabled={disabled}
          data-adventure-runtime-hydrate
          onClick={() =>
            void run({ op: 'hydrate_from_project' }).then((ok) =>
              setMessage(ok ? 'Aus Saga geladen.' : null),
            )
          }
        >
          Aus Saga laden
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          disabled={disabled}
          data-adventure-runtime-persist
          onClick={() =>
            void run({ op: 'persist_to_project' }).then((ok) =>
              setMessage(ok ? 'In Saga persistiert.' : null),
            )
          }
        >
          In Saga speichern
        </Button>
      </div>

      <section aria-label="Aktueller World State" className="space-y-1 text-xs">
        <p className="font-medium text-foreground">Flags</p>
        {Object.keys(state.flags).length === 0 ? (
          <p className="text-muted-foreground">Keine Flags.</p>
        ) : (
          <ul data-adventure-runtime-flags>
            {Object.values(state.flags).map((f) => (
              <li key={f.key}>
                {f.key} = {String(f.value)} ({f.visibility})
              </li>
            ))}
          </ul>
        )}
        <p className="font-medium text-foreground">Clocks</p>
        {Object.keys(state.clocks).length === 0 ? (
          <p className="text-muted-foreground">Keine Clocks.</p>
        ) : (
          <ul data-adventure-runtime-clocks>
            {Object.values(state.clocks).map((c) => (
              <li key={c.id}>
                {c.label}: {c.value}/{c.max}
              </li>
            ))}
          </ul>
        )}
        <p className="font-medium text-foreground">Consequences</p>
        {state.consequences.length === 0 ? (
          <p className="text-muted-foreground">Keine Consequences.</p>
        ) : (
          <ul data-adventure-runtime-consequences>
            {state.consequences.map((c) => (
              <li key={c.id}>{c.summary}</li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="text-xs text-destructive" role="alert" data-adventure-runtime-error>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-muted-foreground" data-adventure-runtime-message>
          {message}
        </p>
      ) : null}
    </div>
  );
}
