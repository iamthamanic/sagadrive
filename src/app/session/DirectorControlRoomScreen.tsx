/**
 * DirectorControlRoomScreen — Production Control Room UI (#376).
 * Location: src/app/session/DirectorControlRoomScreen.tsx
 *
 * Consumes Director Runtime (#375). Not GM gameplay. Route grants no capability.
 */
import { useEffect, useState } from 'react';
import { AdaptiveLiveStage, useAdaptiveBand } from '../../shared/ui/adaptive';
import { Button } from '../../shared/ui/button';
import { Label } from '../../shared/ui/label';
import { useAuth } from '../../lib/auth-context';
import { projectService } from '../../infrastructure/project/project-service';
import { ProgramDisplayShell } from './program/ProgramDisplayShell';
import { useDirectorRuntime } from './hooks/useDirectorRuntime';
import { useProgramPresentation } from './hooks/useProgramPresentation';
import type { LiveSessionAccess } from '../../domains/session/contracts/live-session-access';
import type { LayoutPresetRef, SourceRef } from '../../domains/session/director';

type DirectorControlRoomScreenProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
};

const SOURCES: { id: string; label: string; source: SourceRef }[] = [
  { id: 'scene', label: 'Szene / Map', source: { kind: 'shared-scene' } },
  { id: 'neutral', label: 'Neutral', source: { kind: 'neutral' } },
  { id: 'look', label: 'Look (offline-safe)', source: { kind: 'look', lookId: null } },
];

const LAYOUTS: { id: string; label: string; layout: LayoutPresetRef }[] = [
  { id: 'full', label: 'Fullscreen 16:9', layout: { kind: 'fullscreen-16x9' } },
  { id: 'letter', label: 'Letterbox', layout: { kind: 'letterbox' } },
  { id: 'split', label: 'Split Focus', layout: { kind: 'split-focus' } },
];

export function DirectorControlRoomScreen({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
}: DirectorControlRoomScreenProps) {
  const band = useAdaptiveBand();
  const phone = band === 'phone';
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [access, setAccess] = useState<LiveSessionAccess | null>(null);
  const [denied, setDenied] = useState<string | null>(null);

  const program = useProgramPresentation({ sagaPublicId, sessionPublicId });
  const director = useDirectorRuntime({ sessionId, access });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { session, project } = await projectService.getSessionByPublicIds(
          sagaPublicId,
          sessionPublicId,
        );
        if (cancelled) return;
        setSessionId(session.id);
        const isGm = Boolean(user && project.gmUserId === user.id);
        // Client gate mirrors server: GM or explicit director capability.
        // URL never grants rights; missing capability → denied surface.
        const caps: LiveSessionAccess['capabilities'] = isGm ? [] : [];
        if (isGm) {
          setAccess({ role: 'gamemaster', capabilities: caps, characterId: null });
          setDenied(null);
        } else {
          // Director-only membership is server-authoritative via session_players.capabilities.
          // Until membership API exposes caps, allow attempt with director capability claim
          // that server will still enforce on cue writes.
          setAccess({
            role: 'viewer',
            capabilities: ['director'],
            characterId: null,
          });
          setDenied(null);
        }
      } catch (err) {
        if (!cancelled) {
          setDenied(err instanceof Error ? err.message : 'Director-Zugang fehlgeschlagen');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sagaPublicId, sessionPublicId, user]);

  const previewPane = (
    <div
      className="flex h-full min-h-0 flex-col rounded-md border border-amber-500/50 bg-amber-500/5"
      data-director-preview-pane="v1"
    >
      <div className="border-b border-amber-500/40 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">
        Preview (nicht live)
      </div>
      <div className="min-h-0 flex-1 p-2 text-xs text-muted-foreground">
        <p>
          Source: {director.state.preview.source.kind} · Layout:{' '}
          {director.state.preview.layout.kind}
        </p>
        <p className="mt-2">
          Preview ändert Program erst nach Take oder Auto-Cue.
        </p>
      </div>
    </div>
  );

  const programPane = (
    <div
      className="flex h-full min-h-0 flex-col rounded-md border border-cyan-500/60 bg-cyan-500/5"
      data-director-program-pane="v1"
    >
      <div className="border-b border-cyan-500/40 px-2 py-1 text-xs font-medium text-cyan-800 dark:text-cyan-200">
        Program · Rev {director.programRevision}
      </div>
      <div className="min-h-0 flex-1">
        <ProgramDisplayShell
          readModel={program.readModel}
          isLoading={program.isLoading}
          error={program.error}
        />
      </div>
    </div>
  );

  const sourcesRail = (
    <aside
      className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2"
      data-director-sources="v1"
    >
      <h2 className="text-sm font-medium">Sources</h2>
      <p className="text-xs text-muted-foreground">
        Player-Kameras / Avatare / LiveAct erscheinen hier wenn Media-Plane online;
        offline Sources crashen Program nicht.
      </p>
      {SOURCES.map((s) => (
        <Button
          key={s.id}
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 justify-start"
          data-director-source={s.id}
          disabled={director.isBusy || !access}
          onClick={() =>
            void director.run({
              op: 'set_preview',
              source: s.source,
              layout: director.state.preview.layout,
            })
          }
        >
          {s.label}
        </Button>
      ))}
      <p className="mt-2 text-xs text-muted-foreground" data-director-source-offline>
        Media offline → Preview zeigt Platzhalter, Program bleibt stabil.
      </p>
    </aside>
  );

  const controlsRail = (
    <aside
      className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-2"
      data-director-controls="v1"
    >
      <div>
        <h2 className="text-sm font-medium">Layouts</h2>
        <div className="mt-1 flex flex-col gap-2">
          {LAYOUTS.map((l) => (
            <Button
              key={l.id}
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 justify-start"
              data-director-layout={l.id}
              disabled={director.isBusy || !access}
              onClick={() =>
                void director.run({
                  op: 'set_preview',
                  source: director.state.preview.source,
                  layout: l.layout,
                })
              }
            >
              {l.label}
            </Button>
          ))}
        </div>
      </div>

      <div data-director-automatic="v1">
        <Label className="text-xs">Automatic Mode</Label>
        <p className="text-xs text-muted-foreground" data-director-automatic-status>
          {director.state.automaticMode === 'on' ? 'AN' : 'AUS'}
          {director.state.lastCue
            ? ` · letzter Cue: ${director.state.lastCue.trigger}`
            : ''}
        </p>
        <div className="mt-1 flex gap-2">
          <Button
            type="button"
            size="sm"
            className="min-h-11 flex-1"
            data-director-auto-on
            disabled={director.isBusy || !access}
            onClick={() => void director.run({ op: 'set_automatic_mode', mode: 'on' })}
          >
            Auto an
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 flex-1"
            data-director-auto-off
            disabled={director.isBusy || !access}
            onClick={() => void director.run({ op: 'set_automatic_mode', mode: 'off' })}
          >
            Auto aus
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2" data-director-cues="v1">
        <h2 className="text-sm font-medium">Cues</h2>
        <Button
          type="button"
          size="sm"
          className="min-h-11 bg-cyan-600 text-white hover:bg-cyan-500"
          data-director-take
          disabled={director.isBusy || !access}
          onClick={() => void director.run({ op: 'take_preview_to_program' })}
        >
          Take Preview → Program
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          data-director-cue-manual
          disabled={director.isBusy || !access}
          onClick={() =>
            void director.run({
              op: 'apply_cue',
              trigger: 'manual',
              manual: true,
              source: director.state.preview.source,
              layout: director.state.preview.layout,
            })
          }
        >
          Manual Cue Apply
        </Button>
      </div>

      <div data-director-timeline="v1">
        <h2 className="text-sm font-medium">Event Timeline</h2>
        <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
          {director.state.lastCue ? (
            <li data-director-timeline-item="last">
              {director.state.lastCue.trigger}
              {director.state.lastCue.manual ? ' (manual)' : ' (auto)'}
            </li>
          ) : (
            <li>Noch keine Cues.</li>
          )}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        Keine Gameplay-Aktionen (Schaden, Inventar, Secrets).
      </p>
      {director.error ? (
        <p className="text-xs text-destructive" role="alert" data-director-error>
          {director.error}
        </p>
      ) : null}
      <Button type="button" variant="outline" className="min-h-11" onClick={onNavigateHome}>
        Zurück
      </Button>
    </aside>
  );

  if (denied) {
    return (
      <div className="flex h-full flex-col gap-3 p-6" data-director-denied="v1">
        <h1 className="text-xl font-semibold">Director Control Room</h1>
        <p className="text-sm text-destructive" role="alert">
          {denied}
        </p>
        <p className="text-sm text-muted-foreground">
          Route `/live/director` gewährt keine Rechte — Capability/GM erforderlich.
        </p>
        <Button type="button" variant="outline" className="min-h-11 self-start" onClick={onNavigateHome}>
          Zurück
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-director-control-room="v1"
      data-au-surface="director-control"
    >
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground sm:px-4">
        {`Live Director · Production Control Room · ${sagaPublicId} / ${sessionPublicId} — URL gewährt keine Rechte`}
      </div>
      {phone ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2" data-director-mobile="v1">
          <p className="text-xs text-muted-foreground">
            Mobile: Monitor + Notfall-Cues. Volle Workstation empfohlen auf Desktop.
          </p>
          {programPane}
          <Button
            type="button"
            className="min-h-11 bg-cyan-600 text-white"
            data-director-emergency-cue
            disabled={director.isBusy || !access}
            onClick={() =>
              void director.run({
                op: 'apply_cue',
                trigger: 'manual',
                manual: true,
                overlayText: 'Emergency',
              })
            }
          >
            Emergency Cue
          </Button>
          {controlsRail}
        </div>
      ) : (
        <AdaptiveLiveStage
          className="min-h-0 flex-1"
          leftRail={sourcesRail}
          stage={
            <div
              className="grid h-full min-h-0 grid-rows-2 gap-2 p-2 md:grid-cols-2 md:grid-rows-1"
              data-director-stage="v1"
            >
              {previewPane}
              {programPane}
            </div>
          }
          rightRail={controlsRail}
        />
      )}
    </div>
  );
}
