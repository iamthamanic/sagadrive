/**
 * GamemasterLiveScreen — GM Control Room V2 (gameplay, not Director) (#369).
 * Location: src/app/session/GamemasterLiveScreen.tsx
 *
 * Reuses SharedScene/Program/Knowledge/Combat GM controls. Route grants no rights.
 */
import { useState } from 'react';
import { AdaptiveLiveStage, useAdaptiveBand } from '../../shared/ui/adaptive';
import { Button } from '../../shared/ui/button';
import { Label } from '../../shared/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs';
import { useAuth } from '../../lib/auth-context';
import { useProjectSummaries } from '../project';
import { AdventureNpcCreatureInstancesPanel } from './AdventureNpcCreatureInstancesPanel';
import { CombatEncounterGmPanel } from './CombatEncounterGmPanel';
import { KnowledgeFeed } from './knowledge/KnowledgeFeed';
import { KnowledgeGmControls } from './knowledge/KnowledgeGmControls';
import { ProgramDisplayShell } from './program/ProgramDisplayShell';
import { ProgramGmControls } from './program/ProgramGmControls';
import { SharedSceneGmControls } from './SharedSceneGmControls';
import { SessionAvatarStrip } from './SessionAvatarStrip';
import { useCombatEncounter } from './hooks/useCombatEncounter';
import { useProgramPresentation } from './hooks/useProgramPresentation';
import { useSessionKnowledge } from './hooks/useSessionKnowledge';
import { useSharedScenePresentation } from './hooks/useSharedScenePresentation';

type GamemasterLiveScreenProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
};

type NavTab = 'scenes' | 'npcs' | 'knowledge' | 'items' | 'world';
type ViewAsMode = 'gm' | 'player';

export function GamemasterLiveScreen({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
}: GamemasterLiveScreenProps) {
  const band = useAdaptiveBand();
  const phone = band === 'phone';
  const [navTab, setNavTab] = useState<NavTab>('scenes');
  const [viewAs, setViewAs] = useState<ViewAsMode>('gm');
  const [viewAsCharacterId, setViewAsCharacterId] = useState<string>('');

  const { user } = useAuth();
  const { projects } = useProjectSummaries({ enabled: true });
  const gmProjects = projects.filter(
    (project) => user !== null && project.gmUserId === user.id,
  );
  const activeProjectId = gmProjects[0]?.id ?? null;

  const sharedScene = useSharedScenePresentation({ sagaPublicId, sessionPublicId });
  const program = useProgramPresentation({ sagaPublicId, sessionPublicId });
  const knowledge = useSessionKnowledge({
    sagaPublicId,
    sessionPublicId,
    access:
      viewAs === 'player' && viewAsCharacterId
        ? { role: 'player', capabilities: [], characterId: viewAsCharacterId }
        : { role: 'gamemaster', capabilities: [], characterId: null },
  });
  const combat = useCombatEncounter({ sagaPublicId, sessionPublicId });

  const leftNav = (
    <div className="flex h-full min-h-0 flex-col p-2" data-gm-live-navigator="v1">
      <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Adventure</p>
      <Tabs
        value={navTab}
        onValueChange={(value) => setNavTab(value as NavTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 lg:grid-cols-1">
          {(
            [
              ['scenes', 'Szenen'],
              ['npcs', 'NPCs'],
              ['knowledge', 'Wissen'],
              ['items', 'Items'],
              ['world', 'World'],
            ] as const
          ).map(([id, label]) => (
            <TabsTrigger key={id} value={id} className="min-h-11 justify-start text-xs">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="scenes" className="mt-2 min-h-0 flex-1 overflow-y-auto space-y-3">
          <SharedSceneGmControls
            presentation={sharedScene.presentation}
            isBusy={sharedScene.isPublishing || sharedScene.isLoading}
            error={sharedScene.error}
            onPublish={sharedScene.publishScene}
          />
          <ProgramGmControls
            isSwitching={program.isSwitching}
            onSwitch={program.switchProgram}
          />
        </TabsContent>
        <TabsContent value="npcs" className="mt-2 min-h-0 flex-1 overflow-y-auto">
          <AdventureNpcCreatureInstancesPanel gmProjects={gmProjects} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-2 min-h-0 flex-1 overflow-y-auto space-y-3">
          <KnowledgeGmControls
            isBusy={knowledge.isRevealing || knowledge.isLoading}
            onReveal={knowledge.reveal}
          />
          <KnowledgeFeed projection={knowledge.projection} />
        </TabsContent>
        <TabsContent value="items" className="mt-2 p-2 text-sm text-muted-foreground">
          Item-Steuerung folgt über generische GM Actions (#371) / Inventory (#372).
          <div data-gm-generic-action-slot="items" className="mt-2 min-h-11 rounded-md border border-dashed border-border p-2 text-xs">
            Action extension point
          </div>
        </TabsContent>
        <TabsContent value="world" className="mt-2 p-2 text-sm text-muted-foreground">
          Persistenter World State folgt in #374.
          <div data-gm-generic-action-slot="world" className="mt-2 min-h-11 rounded-md border border-dashed border-border p-2 text-xs">
            Action extension point
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const rightRail = (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3" data-gm-live-session-rail="v1">
      <div className="space-y-2" data-gm-view-as-player="v1">
        <Label className="text-xs">Ansicht</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="min-h-11 flex-1"
            variant={viewAs === 'gm' ? 'default' : 'outline'}
            onClick={() => setViewAs('gm')}
          >
            GM
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-11 flex-1"
            variant={viewAs === 'player' ? 'default' : 'outline'}
            onClick={() => setViewAs('player')}
          >
            View-as-Player
          </Button>
        </div>
        {viewAs === 'player' ? (
          <div className="space-y-1">
            <Label htmlFor="view-as-character" className="text-xs">
              Character ID (Read Projection)
            </Label>
            <input
              id="view-as-character"
              className="input input-bordered input-sm w-full min-h-11"
              value={viewAsCharacterId}
              onChange={(e) => setViewAsCharacterId(e.target.value.trim())}
              placeholder="character uuid"
              data-gm-view-as-character
            />
            <p className="text-[10px] text-muted-foreground">
              Ändert keine Membership — nur Knowledge-Projektion.
            </p>
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Spieler</h3>
        <SessionAvatarStrip
          characters={combat.roster
            .filter((r) => Boolean(r.characterId))
            .slice(0, 8)
            .map((r) => ({
              characterId: r.characterId ?? r.userId,
              displayName: r.characterId
                ? `PC ${r.characterId.slice(0, 8)}`
                : `User ${r.userId.slice(0, 8)}`,
            }))}
        />
        {combat.roster.length === 0 ? (
          <p className="text-xs text-muted-foreground">Noch kein Roster geladen.</p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Encounter</h3>
        <p className="text-xs text-muted-foreground">
          {combat.combatActive ? 'Kampf aktiv' : 'Kein aktiver Kampf'}
          {combat.encounter?.round != null ? ` · Runde ${combat.encounter.round}` : ''}
        </p>
      </div>

      <Button type="button" variant="outline" className="min-h-11" onClick={onNavigateHome}>
        Zurück
      </Button>
    </div>
  );

  const actionRail = (
    <div
      className="max-h-[40vh] overflow-y-auto border-t border-border p-2 md:max-h-none"
      data-gm-live-action-rail="v1"
    >
      <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
        Actions (generic extension in #371)
      </p>
      <div data-gm-generic-action-slot="primary" className="mb-2 min-h-11 rounded-md border border-dashed border-border px-2 py-2 text-xs text-muted-foreground">
        Reserved: freeform GM action rail
      </div>
      <CombatEncounterGmPanel
        projectId={activeProjectId}
        roster={combat.roster}
        encounter={combat.encounter}
        combatActive={combat.combatActive}
        isBusy={combat.isBusy || combat.isLoading}
        error={combat.error}
        onStart={async (participants) => combat.runCombat({ action: 'start', participants })}
        onEnd={async () => combat.runCombat({ action: 'end' })}
        onNextTurn={async () => combat.runCombat({ action: 'nextTurn' })}
        onDamage={async (participantId, amount, mode) =>
          combat.applyDamage({ participantId, amount, mode })
        }
        onCondition={async (participantId, op, condition) =>
          combat.applyCondition({ participantId, op, condition })
        }
        onSpendAction={async (participantId, slot) =>
          combat.runCombat({ action: 'spendAction', participantId, slot })
        }
      />
    </div>
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-gm-live-screen="v2"
      data-au-surface="gamemaster-live"
    >
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground sm:px-4">
        Live Gamemaster · Control Room · {sagaPublicId} / {sessionPublicId} — URL gewährt keine Rechte
      </div>
      <AdaptiveLiveStage
        className="min-h-0 flex-1"
        leftRail={phone ? undefined : leftNav}
        stage={
          <ProgramDisplayShell
            readModel={program.readModel}
            isLoading={program.isLoading}
            error={program.error}
          />
        }
        rightRail={phone ? undefined : rightRail}
        bottomRail={
          phone ? (
            <div className="max-h-[50vh] overflow-y-auto">
              {leftNav}
              {rightRail}
              {actionRail}
            </div>
          ) : (
            actionRail
          )
        }
      />
    </div>
  );
}
