/**
 * ViewerLiveScreen — Read-only Program + minimal public session context (#370).
 * Location: src/app/session/ViewerLiveScreen.tsx
 *
 * Not a player without character. No gameplay mutations, no private knowledge.
 */
import { AdaptiveLiveStage } from '../../shared/ui/adaptive';
import { Button } from '../../shared/ui/button';
import { KnowledgeFeed } from './knowledge/KnowledgeFeed';
import { ProgramDisplayShell } from './program/ProgramDisplayShell';
import { useProgramPresentation } from './hooks/useProgramPresentation';
import { useSessionKnowledge } from './hooks/useSessionKnowledge';

type ViewerLiveScreenProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
};

export function ViewerLiveScreen({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
}: ViewerLiveScreenProps) {
  const program = useProgramPresentation({ sagaPublicId, sessionPublicId });
  const knowledge = useSessionKnowledge({
    sagaPublicId,
    sessionPublicId,
    access: { role: 'viewer', capabilities: [], characterId: null },
  });

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-viewer-live-screen="v1"
      data-au-surface="viewer-live"
    >
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground sm:px-4">
        Live Viewer · read-only · {sagaPublicId} / {sessionPublicId} — URL gewährt keine Rechte
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
          <aside className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3" data-viewer-context="v1">
            <div>
              <h2 className="text-sm font-medium">Session</h2>
              <p className="text-xs text-muted-foreground">
                Zuschauer — keine Checks, kein Inventar, keine GM-Aktionen.
              </p>
            </div>
            <div>
              <h3 className="mb-1 text-sm font-medium">Öffentlicher Kontext</h3>
              <KnowledgeFeed
                projection={knowledge.projection}
                emptyLabel="Kein öffentlicher Session-Kontext freigegeben."
              />
            </div>
            <Button type="button" variant="outline" className="min-h-11" onClick={onNavigateHome}>
              Zurück
            </Button>
          </aside>
        }
      />
    </div>
  );
}
