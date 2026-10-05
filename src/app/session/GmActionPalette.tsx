/**
 * GmActionPalette — Searchable GM Action catalog for freeform TTRPG beats (#371).
 * Location: src/app/session/GmActionPalette.tsx
 *
 * Delegates to existing runtime commands; no raw world_state JSON editor.
 */
import { useState } from 'react';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';
import {
  assertGmActionAllowed,
  composeUnexpectedBeat,
  getGmAction,
  isExecutableGmRuntimeKind,
  listGmActions,
  resolveGmActionCommand,
  type GmActionId,
} from '../../domains/session/contracts/generic-gm-actions';
import type { LiveSessionAccess } from '../../domains/session/contracts/live-session-access';

type GmActionPaletteProps = {
  access: LiveSessionAccess;
  isBusy?: boolean;
  onExecute: (command: {
    kind: string;
    payload: Record<string, unknown>;
    actionId: GmActionId;
  }) => Promise<boolean>;
};

export function GmActionPalette({
  access,
  isBusy = false,
  onExecute,
}: GmActionPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<GmActionId | null>('request-check');
  const [targetId, setTargetId] = useState('');
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');
  const [beat, setBeat] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [recent, setRecent] = useState<GmActionId[]>([]);

  const actions = listGmActions(query);
  const selected = selectedId ? getGmAction(selectedId) : null;

  const run = async () => {
    if (!selected) return;
    setMessage(null);
    try {
      assertGmActionAllowed(access, selected);
      const resolved = resolveGmActionCommand({
        actionId: selected.id,
        targetId: targetId || null,
        amount: Number(amount),
        note: note || null,
      });
      if (!isExecutableGmRuntimeKind(resolved.kind)) {
        setMessage(
          `${selected.label} ist katalogisiert; Runtime-Kind „${resolved.kind}“ folgt in späterem Slice.`,
        );
        return;
      }
      if (resolved.requiresConfirm) {
        const ok =
          typeof window === 'undefined' ||
          window.confirm(`„${selected.label}“ wirklich ausführen?`);
        if (!ok) return;
      }
      const success = await onExecute({
        kind: resolved.kind,
        payload: resolved.payload,
        actionId: selected.id,
      });
      setMessage(success ? `${selected.label} gesendet.` : `${selected.label} fehlgeschlagen.`);
      if (success) {
        setRecent((prev) => [selected.id, ...prev.filter((id) => id !== selected.id)].slice(0, 5));
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Action fehlgeschlagen');
    }
  };

  return (
    <div className="space-y-3" data-gm-action-palette="v1">
      <div className="space-y-1">
        <Label htmlFor="gm-action-search" className="text-xs">
          GM Actions
        </Label>
        <Input
          id="gm-action-search"
          className="min-h-11"
          placeholder="Suchen… z.B. Schaden, Reveal, Szene"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-gm-action-search
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="gm-unexpected-beat" className="text-xs">
          Unerwartete Aktion beschreiben
        </Label>
        <div className="flex gap-2">
          <Input
            id="gm-unexpected-beat"
            className="min-h-11"
            placeholder='z.B. „Taverne anzünden“'
            value={beat}
            onChange={(e) => setBeat(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="min-h-11 shrink-0"
            onClick={() => {
              const ids = composeUnexpectedBeat(beat);
              if (ids[0]) setSelectedId(ids[0]);
              setMessage(
                ids.length
                  ? `Vorschlag: ${ids.map((id) => getGmAction(id)?.label ?? id).join(' → ')}`
                  : 'Kein Vorschlag',
              );
            }}
          >
            Komponieren
          </Button>
        </div>
      </div>

      <ul className="max-h-40 space-y-1 overflow-y-auto" data-gm-action-list>
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              className={`flex min-h-11 w-full flex-col items-start rounded-md border px-2 py-1.5 text-left text-xs ${
                selectedId === action.id ? 'border-primary bg-muted/40' : 'border-border'
              }`}
              onClick={() => setSelectedId(action.id)}
              data-gm-action-id={action.id}
            >
              <span className="font-medium">{action.label}</span>
              <span className="text-muted-foreground">{action.group} · {action.runtimeKind}</span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <div className="space-y-2 rounded-md border border-border p-2" data-gm-action-preview>
          <p className="text-xs text-muted-foreground">{selected.description}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="gm-action-target" className="text-xs">
                Target ID
              </Label>
              <Input
                id="gm-action-target"
                className="min-h-11"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="character / participant / scene"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gm-action-amount" className="text-xs">
                Betrag
              </Label>
              <Input
                id="gm-action-amount"
                className="min-h-11"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="gm-action-note" className="text-xs">
              Notiz
            </Label>
            <Input
              id="gm-action-note"
              className="min-h-11"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="optional"
            />
          </div>
          <Button
            type="button"
            className="min-h-11 w-full"
            disabled={isBusy || !selected}
            onClick={() => {
              void run();
            }}
            data-gm-action-execute
          >
            {isBusy ? 'Senden…' : `${selected.label} ausführen`}
          </Button>
        </div>
      ) : null}

      {message ? (
        <p className="text-xs text-muted-foreground" role="status" data-gm-action-status>
          {message}
        </p>
      ) : null}

      {recent.length > 0 ? (
        <div className="text-xs text-muted-foreground" data-gm-action-recent>
          Zuletzt: {recent.map((id) => getGmAction(id)?.label ?? id).join(' · ')}
        </div>
      ) : null}
    </div>
  );
}
