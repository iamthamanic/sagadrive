/**
 * CombatEncounterGmPanel — GM controls for encounter start/turn/HP/conditions (#300).
 * Location: src/app/session/CombatEncounterGmPanel.tsx
 */
import { useEffect, useState } from 'react';
import type { NpcCreatureInstance } from '../../domains/npc-creature';
import {
  currentEncounterActor,
  type EncounterActionSlot,
  type EncounterParticipant,
  type EncounterState,
} from '../../domains/session/contracts/combat-encounter';
import type { SessionPresenceEntry } from '../../domains/session/contracts/session-runtime';
import { listNpcCreatureInstances } from '../../infrastructure/npc-creature/npc-creature-service';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';

type CombatEncounterGmPanelProps = {
  projectId: string | null;
  roster: readonly SessionPresenceEntry[];
  encounter: EncounterState | null;
  combatActive: boolean;
  isBusy: boolean;
  error: string | null;
  onStart: (participants: Array<{ kind: 'pc' | 'npc'; refId: string; name?: string }>) => Promise<boolean>;
  onEnd: () => Promise<boolean>;
  onNextTurn: () => Promise<boolean>;
  onDamage: (participantId: string, amount: number, mode: 'damage' | 'heal') => Promise<boolean>;
  onCondition: (participantId: string, op: 'add' | 'remove', condition: string) => Promise<boolean>;
  onSpendAction: (participantId: string, slot: EncounterActionSlot) => Promise<boolean>;
};

export function CombatEncounterGmPanel({
  projectId,
  roster,
  encounter,
  combatActive,
  isBusy,
  error,
  onStart,
  onEnd,
  onNextTurn,
  onDamage,
  onCondition,
  onSpendAction,
}: CombatEncounterGmPanelProps) {
  const [instances, setInstances] = useState<NpcCreatureInstance[]>([]);
  const [selectedPcs, setSelectedPcs] = useState<Record<string, boolean>>({});
  const [selectedNpcs, setSelectedNpcs] = useState<Record<string, boolean>>({});
  const [targetId, setTargetId] = useState('');
  const [amount, setAmount] = useState('5');
  const [condition, setCondition] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      setInstances([]);
      return;
    }
    void listNpcCreatureInstances(projectId)
      .then((rows) => {
        if (!cancelled) setInstances(rows);
      })
      .catch(() => {
        if (!cancelled) setInstances([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (encounter?.status === 'active' && encounter.participants.length > 0) {
      const first = encounter.participants[0];
      if (first && !targetId) setTargetId(first.id);
    }
  }, [encounter, targetId]);

  const actor = encounter ? currentEncounterActor(encounter) : null;
  const active = encounter?.status === 'active';

  const togglePc = (characterId: string) => {
    setSelectedPcs((prev) => ({ ...prev, [characterId]: !prev[characterId] }));
  };

  const toggleNpc = (instanceId: string) => {
    setSelectedNpcs((prev) => ({ ...prev, [instanceId]: !prev[instanceId] }));
  };

  const startEncounter = async () => {
    setMessage(null);
    const participants: Array<{ kind: 'pc' | 'npc'; refId: string; name?: string }> = [];
    for (const entry of roster) {
      if (entry.characterId && selectedPcs[entry.characterId]) {
        participants.push({ kind: 'pc', refId: entry.characterId });
      }
    }
    for (const instance of instances) {
      if (selectedNpcs[instance.id]) {
        participants.push({
          kind: 'npc',
          refId: instance.id,
          name: instance.displayName,
        });
      }
    }
    if (participants.length === 0) {
      setMessage('Wähle mindestens einen PC oder eine NPC-Instanz.');
      return;
    }
    const ok = await onStart(participants);
    setMessage(ok ? 'Encounter gestartet.' : 'Encounter konnte nicht gestartet werden.');
  };

  const runDamage = async (mode: 'damage' | 'heal') => {
    setMessage(null);
    if (!targetId) {
      setMessage('Ziel wählen.');
      return;
    }
    const n = Number.parseInt(amount, 10);
    if (!Number.isFinite(n) || n < 0) {
      setMessage('Ungültiger Betrag.');
      return;
    }
    const ok = await onDamage(targetId, n, mode);
    setMessage(ok ? (mode === 'heal' ? 'Heilung angewendet.' : 'Schaden angewendet.') : 'Aktion fehlgeschlagen.');
  };

  const runCondition = async (op: 'add' | 'remove') => {
    setMessage(null);
    if (!targetId || !condition.trim()) {
      setMessage('Ziel und Zustand angeben.');
      return;
    }
    const ok = await onCondition(targetId, op, condition.trim());
    setMessage(ok ? 'Zustand aktualisiert.' : 'Zustand fehlgeschlagen.');
  };

  return (
    <div className="space-y-4" data-combat-encounter-gm="v1">
      <div>
        <h4 className="mb-1 text-sm md:text-base">Kampf & Encounter</h4>
        <p className="mb-3 text-xs text-muted-foreground">
          Starte einen Testkampf mit PCs und NPC-Instanzen. Initiative, Züge und TP sind
          serverseitig autoritativ — nach Reload fortsetzbar.
        </p>
      </div>

      {!active ? (
        <div className="space-y-3 rounded-md border border-border/60 p-3">
          <p className="text-xs font-medium">Teilnehmer wählen</p>
          <div className="space-y-2">
            <Label className="text-xs">Spieler-Charaktere (Roster)</Label>
            {roster.filter((r) => r.characterId).length === 0 ? (
              <p className="text-xs text-muted-foreground">Keine Charaktere im Roster.</p>
            ) : (
              roster
                .filter((r) => r.characterId)
                .map((r) => (
                  <label
                    key={r.userId}
                    className="flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(r.characterId && selectedPcs[r.characterId])}
                      onChange={() => r.characterId && togglePc(r.characterId)}
                      disabled={isBusy}
                      data-combat-select-pc={r.characterId ?? undefined}
                    />
                    <span className="truncate">{r.characterId}</span>
                  </label>
                ))
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">NPC-/Kreatur-Instanzen</Label>
            {instances.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Keine Instanzen — zuerst unter NPCs spawnen.
              </p>
            ) : (
              instances.map((instance) => (
                <label key={instance.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(selectedNpcs[instance.id])}
                    onChange={() => toggleNpc(instance.id)}
                    disabled={isBusy}
                    data-combat-select-npc={instance.id}
                  />
                  <span className="truncate">
                    {instance.displayName} ({instance.runtime.currentHp}/{instance.snapshot.maxHealth} TP)
                  </span>
                </label>
              ))
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void startEncounter()}
            disabled={isBusy || !projectId}
            data-combat-start
          >
            Encounter starten
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className="rounded-md border border-cyan-500/40 bg-cyan-500/5 p-3 text-xs"
            data-combat-active-banner
          >
            <p className="font-medium">
              Runde {encounter?.round ?? 1}
              {actor ? ` · Zug: ${actor.name}` : ''}
              {combatActive ? ' · Kampf aktiv' : ''}
            </p>
          </div>

          <div className="space-y-2" data-combat-initiative-list>
            {(encounter?.participants ?? []).map((p, index) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                isCurrent={index === (encounter?.currentTurnIndex ?? -1)}
                selected={targetId === p.id}
                onSelect={() => setTargetId(p.id)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={() => void onNextTurn().then((ok) => setMessage(ok ? 'Nächster Zug.' : 'Zug fehlgeschlagen.'))}
              data-combat-next-turn
            >
              Nächster Zug
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isBusy}
              onClick={() => void onEnd().then((ok) => setMessage(ok ? 'Encounter beendet.' : 'Beenden fehlgeschlagen.'))}
              data-combat-end
            >
              Encounter beenden
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="combat-amount" className="text-xs">Schaden / Heilung</Label>
              <Input
                id="combat-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isBusy}
                data-combat-amount
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy || !targetId}
                onClick={() => void runDamage('damage')}
                data-combat-damage
              >
                Schaden
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy || !targetId}
                onClick={() => void runDamage('heal')}
                data-combat-heal
              >
                Heilen
              </Button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="combat-condition" className="text-xs">Zustand</Label>
              <Input
                id="combat-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="z. B. verwundet"
                disabled={isBusy}
                data-combat-condition
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBusy || !targetId}
                onClick={() => void runCondition('add')}
                data-combat-condition-add
              >
                Hinzufügen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isBusy || !targetId}
                onClick={() => void runCondition('remove')}
                data-combat-condition-remove
              >
                Entfernen
              </Button>
            </div>
          </div>

          {actor ? (
            <div className="flex flex-wrap gap-2">
              {(['main', 'move', 'free', 'reaction'] as const).map((slot) => (
                <Button
                  key={slot}
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isBusy || actor.actions[slot] < 1}
                  onClick={() =>
                    void onSpendAction(actor.id, slot).then((ok) =>
                      setMessage(ok ? `${slot} verbraucht.` : 'Aktion fehlgeschlagen.'),
                    )
                  }
                  data-combat-spend={slot}
                >
                  {slot} ({actor.actions[slot]})
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="text-xs text-destructive" role="alert" data-combat-error>
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-muted-foreground" data-combat-message>
          {message}
        </p>
      ) : null}
    </div>
  );
}

function ParticipantRow({
  participant,
  isCurrent,
  selected,
  onSelect,
}: {
  participant: EncounterParticipant;
  isCurrent: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs ${
        selected ? 'border-cyan-500 bg-cyan-500/10' : 'border-border/60'
      } ${isCurrent ? 'ring-1 ring-cyan-400' : ''}`}
      data-combat-participant={participant.id}
      data-combat-current={isCurrent ? 'true' : 'false'}
    >
      <span className="truncate font-medium">
        {isCurrent ? '▶ ' : ''}
        {participant.name}
        <span className="ml-1 text-muted-foreground">
          ({participant.kind === 'pc' ? 'PC' : 'NPC'} · Init {participant.initiative})
        </span>
      </span>
      <span className="shrink-0 tabular-nums">
        {participant.hpCurrent}/{participant.hpMax} TP
        {participant.conditions.length > 0
          ? ` · ${participant.conditions.join(', ')}`
          : ''}
      </span>
    </button>
  );
}
