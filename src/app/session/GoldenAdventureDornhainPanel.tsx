/**
 * GoldenAdventureDornhainPanel — Instantiate Dornhain Golden Package into session (#377).
 * Location: src/app/session/GoldenAdventureDornhainPanel.tsx
 *
 * Uses normal adventure runtime commands — no admin DB seed.
 */
import { useState } from 'react';
import type { LiveSessionAccess } from '../../domains/session/contracts/live-session-access';
import {
  assertGoldenAdventureDornhainIntegrity,
  dornhainInstantiateCommands,
  getGoldenAdventureDornhainPackage,
} from '../../domains/session/contracts/golden-adventure-dornhain';
import { Button } from '../../shared/ui/button';
import { useAdventureRuntime } from './hooks/useAdventureRuntime';

type GoldenAdventureDornhainPanelProps = {
  sessionId: string | null;
  access: LiveSessionAccess | null;
};

export function GoldenAdventureDornhainPanel({
  sessionId,
  access,
}: GoldenAdventureDornhainPanelProps) {
  const pkg = getGoldenAdventureDornhainPackage();
  const adventure = useAdventureRuntime({ sessionId, access });
  const [stress, setStress] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const instantiate = async () => {
    try {
      assertGoldenAdventureDornhainIntegrity(pkg);
      const cmds = dornhainInstantiateCommands({ stressDeathStart: stress });
      for (const cmd of cmds) {
        const ok = await adventure.run(cmd);
        if (!ok) {
          setMessage(adventure.error ?? 'Instantiate fehlgeschlagen');
          return;
        }
      }
      setMessage(`Dornhain geladen · ${pkg.packageId}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Package ungültig');
    }
  };

  return (
    <div
      className="space-y-2 rounded-md border border-border/70 p-3"
      data-golden-adventure-dornhain="v1"
    >
      <h3 className="text-sm font-medium">{pkg.title}</h3>
      <p className="text-xs text-muted-foreground">{pkg.synopsis}</p>
      <p className="text-xs text-muted-foreground" data-dornhain-package-id>
        {pkg.packageId} · Foundation {pkg.foundationFixtureId}
      </p>
      <ul className="text-xs text-muted-foreground">
        <li>{pkg.locations.length} Orte (freie Reihenfolge)</li>
        <li>{pkg.pregens.length} Pregens · {pkg.knowledgeFacts.length} Knowledge-Facts</li>
        <li>Items: Siegelstein-Narrativ, Consumable, Equippable</li>
      </ul>
      <label className="flex min-h-11 items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={stress}
          data-dornhain-stress
          onChange={(e) => setStress(e.target.checked)}
        />
        Developer Stress: Death-Start
      </label>
      <Button
        type="button"
        size="sm"
        className="min-h-11"
        disabled={adventure.isBusy || access?.role !== 'gamemaster'}
        data-dornhain-instantiate
        onClick={() => void instantiate()}
      >
        Dornhain in Session laden
      </Button>
      {message ? (
        <p className="text-xs text-muted-foreground" data-dornhain-message>
          {message}
        </p>
      ) : null}
    </div>
  );
}
