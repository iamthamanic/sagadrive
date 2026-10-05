/**
 * PlayerLiveScreen — Canonical Player Live V2: Program stage + private UI (#368).
 * Location: src/app/session/PlayerLiveScreen.tsx
 *
 * Reuses PlayerPanel / Program / Knowledge contracts. Private controls never enter Program.
 */
import { useEffect, useState } from 'react';
import { AdaptiveLiveStage, useAdaptiveBand } from '../../shared/ui/adaptive';
import { Button } from '../../shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import type { LiveSessionAccess } from '../../domains/session/contracts/live-session-access';
import { KnowledgeFeed } from './knowledge/KnowledgeFeed';
import { PlayerPanel } from './PlayerPanel';
import { ProgramDisplayShell } from './program/ProgramDisplayShell';
import { useProgramPresentation } from './hooks/useProgramPresentation';
import { useSessionKnowledge } from './hooks/useSessionKnowledge';
import { usePlayerPanel } from './hooks/usePlayerPanel';

type PlayerLiveScreenProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  characterPublicId: string | null;
  onNavigateHome: () => void;
};

type PrivateTab = 'play' | 'knowledge' | 'roster';

export function PlayerLiveScreen({
  sagaPublicId,
  sessionPublicId,
  characterPublicId,
  onNavigateHome,
}: PlayerLiveScreenProps) {
  const band = useAdaptiveBand();
  const phone = band === 'phone';
  const [tab, setTab] = useState<PrivateTab>('play');
  const [access, setAccess] = useState<LiveSessionAccess | null>(null);

  const program = useProgramPresentation({
    sagaPublicId,
    sessionPublicId,
  });
  const panel = usePlayerPanel({
    sagaPublicId,
    sessionPublicId,
    characterPublicId,
  });
  const knowledge = useSessionKnowledge({
    sagaPublicId,
    sessionPublicId,
    access,
  });

  useEffect(() => {
    const characterId = panel.model.characterId;
    if (!characterId) {
      setAccess(null);
      return;
    }
    setAccess({
      role: 'player',
      capabilities: [],
      characterId,
    });
  }, [panel.model.characterId]);

  const privateTabs = (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as PrivateTab)}
      className="flex h-full min-h-0 flex-col"
      data-player-live-private-tabs="v1"
    >
      <TabsList className="mx-2 mt-2 grid h-auto w-auto grid-cols-3 gap-1 p-1">
        <TabsTrigger
          value="play"
          className="min-h-11 px-2 text-xs sm:text-sm"
          data-player-live-tab="play"
        >
          Spiel
        </TabsTrigger>
        <TabsTrigger
          value="knowledge"
          className="min-h-11 px-2 text-xs sm:text-sm"
          data-player-live-tab="knowledge"
        >
          Wissen
        </TabsTrigger>
        <TabsTrigger
          value="roster"
          className="min-h-11 px-2 text-xs sm:text-sm"
          data-player-live-tab="roster"
        >
          Roster
        </TabsTrigger>
      </TabsList>
      <TabsContent value="play" className="mt-0 min-h-0 flex-1 overflow-hidden">
        <PlayerPanel
          sagaPublicId={sagaPublicId}
          sessionPublicId={sessionPublicId}
          characterPublicId={characterPublicId}
          onNavigateHome={onNavigateHome}
          embedMode="rail"
        />
      </TabsContent>
      <TabsContent value="knowledge" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
        <h2 className="mb-2 text-sm font-medium">Freigegebenes Wissen</h2>
        {knowledge.error ? (
          <p className="text-sm text-destructive" role="alert">
            {knowledge.error}
          </p>
        ) : (
          <KnowledgeFeed
            projection={knowledge.projection}
            emptyLabel="Noch keine freigegebenen Informationen für dich."
          />
        )}
      </TabsContent>
      <TabsContent value="roster" className="mt-0 min-h-0 flex-1 overflow-y-auto p-3">
        <h2 className="mb-2 text-sm font-medium">Session</h2>
        <p className="mb-2 text-xs text-muted-foreground">
          {sagaPublicId} / {sessionPublicId}
          {characterPublicId ? ` · ${characterPublicId}` : ''}
          {' — '}
          URL gewährt keine Rechte
        </p>
        <ul className="space-y-1 text-sm" data-player-live-roster="v1">
          {panel.model.roster.length === 0 ? (
            <li className="text-muted-foreground">Noch keine Mitspieler.</li>
          ) : (
            panel.model.roster.map((entry) => (
              <li key={entry.userId} className="flex justify-between gap-2">
                <span>
                  {entry.isSelf ? 'Du' : entry.userId.slice(0, 8)}
                  {entry.characterId ? ` · ${entry.characterId.slice(0, 8)}` : ''}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.isOnline ? 'online' : 'offline'}
                </span>
              </li>
            ))
          )}
        </ul>
        <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={onNavigateHome}>
          Zurück
        </Button>
      </TabsContent>
    </Tabs>
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-player-live-screen="v2"
      data-au-surface="player-live"
    >
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground sm:px-4">
        Live Spieler · Program + private UI
        {characterPublicId ? ` · ${characterPublicId}` : ''}
      </div>
      <AdaptiveLiveStage
        className="min-h-0 flex-1"
        stage={
          <ProgramDisplayShell
            readModel={program.readModel}
            isLoading={program.isLoading}
            error={program.error}
          />
        }
        rightRail={
          phone ? undefined : (
            <div className="flex h-full min-h-0 flex-col" data-player-live-rail="desktop">
              {privateTabs}
            </div>
          )
        }
        bottomRail={
          phone ? (
            <div className="max-h-[45vh] overflow-hidden" data-player-live-rail="mobile">
              {privateTabs}
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
