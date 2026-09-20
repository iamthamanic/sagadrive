/**
 * PlayerPanel — Slim live-session player surface (Epic #210 Phase 3 / #298).
 * Location: src/app/session/PlayerPanel.tsx
 *
 * Read-first character + runtime state. Session play surface only (no full sheet editor).
 */
import { useState } from 'react';
import type { SagaDriveSkillKey } from '../../domains/rules/sagadrive/character-creation';
import { playerPanelCheckSkillOptions } from '../../domains/session/contracts/player-panel';
import { Button } from '../../shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/select';
import { usePlayerPanel } from './hooks/usePlayerPanel';
import { PlayerPanelStatusBanner } from './PlayerPanelStatusBanner';

type PlayerPanelProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  characterPublicId: string | null;
  onNavigateHome: () => void;
};

export function PlayerPanel({
  sagaPublicId,
  sessionPublicId,
  characterPublicId,
  onNavigateHome,
}: PlayerPanelProps) {
  const { model, resync, requestCheck } = usePlayerPanel({
    sagaPublicId,
    sessionPublicId,
    characterPublicId,
  });
  const skillOptions = playerPanelCheckSkillOptions(model);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [checkBusy, setCheckBusy] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const effectiveSkill =
    selectedSkill ||
    (skillOptions[0] ? skillOptions[0].key : '');

  const onCheck = async () => {
    if (!effectiveSkill || !model.canAttemptCheck) return;
    setCheckBusy(true);
    setCheckMessage(null);
    try {
      const ok = await requestCheck(effectiveSkill as SagaDriveSkillKey);
      setCheckMessage(
        ok
          ? 'Check gesendet — Ergebnis erscheint als Session-Ereignis.'
          : 'Check konnte nicht gesendet werden.',
      );
    } finally {
      setCheckBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-player-panel="v1">
      <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
        Live Spieler · {sagaPublicId} / {sessionPublicId}
        {characterPublicId ? ` · ${characterPublicId}` : ''}
        {' '}
        — URL gewährt keine Rechte
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 md:p-6">
          <PlayerPanelStatusBanner
            kind={model.connection}
            label={model.connectionLabel}
            detail={model.connectionDetail}
            onResync={() => {
              void resync();
            }}
          />

          <header className="flex flex-wrap items-start gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              {model.portraitUrl ? (
                <img
                  src={model.portraitUrl}
                  alt={`Portrait von ${model.characterName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  Portrait
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="text-2xl font-semibold text-foreground">{model.characterName}</h1>
              <p className="text-sm text-muted-foreground">
                Stufe {model.level} · {model.classLabel} · {model.raceLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                Szene: {model.sceneId ?? '—'}
                {model.combatActive ? ' · Kampf aktiv' : ''}
              </p>
            </div>
          </header>

          <section aria-label="Kampfwerte" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatChip label="TP" value={`${model.hpCurrent}/${model.hpMax}`} />
            <StatChip label="Verteidigung" value={String(model.defense)} />
            <StatChip label="Drive" value={String(model.drive)} />
            <StatChip
              label={model.momentumShared ? 'Momentum (geteilt)' : 'Momentum'}
              value={String(model.momentum)}
            />
          </section>

          <section aria-label="Widerstände" className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Widerstände</h2>
            {model.resistances.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Widerstände verfügbar.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {model.resistances.map((line) => (
                  <li
                    key={line.key}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>{line.label}</span>
                    <span className="font-medium tabular-nums">{line.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Attribute" className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Attribute</h2>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {model.attributes.map((attr) => (
                <li
                  key={attr.key}
                  className="rounded-md border border-border px-2 py-2 text-center"
                  title={attr.label}
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {attr.shortLabel}
                  </div>
                  <div className="text-base font-semibold tabular-nums">{attr.value}</div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Fertigkeiten" className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Fertigkeiten</h2>
            {model.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine trainierten Fertigkeiten.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {model.skills.map((skill) => (
                  <li
                    key={skill.key}
                    className="flex items-center justify-between rounded-md border border-border/70 px-3 py-1.5 text-sm"
                  >
                    <span>{skill.label}</span>
                    <span className="tabular-nums text-muted-foreground">{skill.rank}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Check" className="space-y-2 rounded-md border border-border p-3">
            <h2 className="text-sm font-medium text-foreground">Würfel / Check</h2>
            <p className="text-xs text-muted-foreground">
              Sendet einen Check als Session-Befehl. Autoritative Auflösung folgt in Shared Rolls.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1 space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="player-panel-skill">
                  Fertigkeit
                </label>
                <Select
                  value={effectiveSkill}
                  onValueChange={setSelectedSkill}
                  disabled={!model.canAttemptCheck || skillOptions.length === 0}
                >
                  <SelectTrigger id="player-panel-skill">
                    <SelectValue placeholder="Fertigkeit wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {skillOptions.map((skill) => (
                      <SelectItem key={skill.key} value={skill.key}>
                        {skill.label} ({skill.rank})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                disabled={!model.canAttemptCheck || !effectiveSkill || checkBusy}
                onClick={() => {
                  void onCheck();
                }}
              >
                {checkBusy ? 'Senden…' : 'Check würfeln'}
              </Button>
            </div>
            {checkMessage ? (
              <p className="text-xs text-muted-foreground" role="status">
                {checkMessage}
              </p>
            ) : null}
          </section>

          <section aria-label="Zustände" className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Zustände</h2>
            {model.conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine aktiven Zustände.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {model.conditions.map((condition) => (
                  <li
                    key={condition}
                    className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
                  >
                    {condition}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Inventar" className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Inventar (nur Lesen)</h2>
            {model.inventory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Kein Inventar / keine Ausrüstung.</p>
            ) : (
              <ul className="space-y-1">
                {model.inventory.map((line, index) => (
                  <li
                    key={`${line.slot}-${line.name}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground">{line.label}</span>
                    <span className="truncate font-medium">{line.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Roster" className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Roster</h2>
            {model.roster.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Teilnehmer.</p>
            ) : (
              <ul className="space-y-1">
                {model.roster.map((entry) => (
                  <li
                    key={entry.userId}
                    className="flex items-center justify-between rounded-md border border-border/70 px-3 py-1.5 text-sm"
                  >
                    <span className="truncate font-mono text-xs">
                      {entry.isSelf ? 'Du' : entry.userId.slice(0, 8)}
                      {entry.characterId ? ` · ${entry.characterId.slice(0, 8)}` : ''}
                    </span>
                    <span className={entry.isOnline ? 'text-primary' : 'text-muted-foreground'}>
                      {entry.isOnline ? 'online' : 'offline'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Button type="button" variant="ghost" className="self-start" onClick={onNavigateHome}>
            Zurück
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
