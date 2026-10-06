/**
 * SessionLobbyScreen — Canonical Player/GM preflight lobby (#491).
 * Location: src/app/session/SessionLobbyScreen.tsx
 *
 * Shared surface with role-projected CTAs. Media/LiveAct only after user gesture.
 */
import { Button } from '../../shared/ui/button';
import { AdaptivePage } from '../../shared/ui/adaptive';
import { decideLobbyEnterLive, lobbyLiveActStatusLabelDe, lobbyMediaStatusLabelDe } from '../../domains/session/contracts/session-lobby';
import { buildSessionJoinPath } from '../../domains/session/contracts/session-entry-routing';
import { pathForSessionLive } from '../shell';
import { useSessionLobby } from './hooks/useSessionLobby';

type SessionLobbyScreenProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigateHome: () => void;
  onNavigate: (path: string) => void;
};

export function SessionLobbyScreen({
  sagaPublicId,
  sessionPublicId,
  onNavigateHome,
  onNavigate,
}: SessionLobbyScreenProps) {
  const {
    model,
    isLoading,
    error,
    setReady,
    probeCamera,
    probeMicrophone,
    probeLiveAct,
    refresh,
  } = useSessionLobby({ sagaPublicId, sessionPublicId });

  const selfReady = model?.roster.find((m) => m.isSelf)?.isReady === true;

  const handleEnter = () => {
    if (!model) return;
    const decision = decideLobbyEnterLive({
      role: model.selfRole,
      sagaPublicId: model.summary.sagaPublicId,
      sessionPublicId: model.summary.sessionPublicId,
      characterPublicId: model.selfCharacterPublicId,
    });
    if (decision.kind === 'blocked') {
      return;
    }
    if (decision.kind === 'gamemaster-live') {
      onNavigate(
        pathForSessionLive(decision.sagaPublicId, decision.sessionPublicId, 'gamemaster'),
      );
      return;
    }
    onNavigate(
      pathForSessionLive(
        decision.sagaPublicId,
        decision.sessionPublicId,
        'player',
        decision.characterPublicId,
      ),
    );
  };

  const handleChangeCharacter = () => {
    onNavigate(
      buildSessionJoinPath({
        sagaPublicId,
        intent: 'join',
      }),
    );
  };

  return (
    <AdaptivePage data-au-surface="session-lobby" className="h-full w-full">
      <div
        className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto p-4 sm:p-6"
        data-session-lobby="v1"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Session-Lobby
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              {model?.summary.sessionName ?? 'Lobby'}
            </h1>
            {model?.summary.sagaName ? (
              <p className="text-sm text-muted-foreground">{model.summary.sagaName}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" className="min-h-11" onClick={onNavigateHome}>
            Verlassen
          </Button>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lobby wird geladen…</p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert" data-session-lobby-error>
            {error}
          </p>
        ) : null}

        {model ? (
          <>
            <section
              className="rounded-lg border border-border bg-card/40 p-4"
              data-session-lobby-self
            >
              <h2 className="text-sm font-medium">Dein Platz</h2>
              <dl className="mt-2 grid gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Rolle</dt>
                  <dd>
                    {model.selfRole === 'gamemaster'
                      ? 'Spielleitung'
                      : model.selfRole === 'player'
                        ? 'Spieler'
                        : 'Viewer'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Charakter</dt>
                  <dd data-session-lobby-character>
                    {model.selfCharacterName ??
                      (model.selfRole === 'gamemaster' ? '—' : 'Nicht zugewiesen')}
                    {model.selfCharacterPublicId
                      ? ` (${model.selfCharacterPublicId})`
                      : ''}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Code</dt>
                  <dd className="font-mono">{model.summary.code || '—'}</dd>
                </div>
              </dl>
              {model.canChangeCharacter ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 min-h-11"
                  onClick={handleChangeCharacter}
                  data-session-lobby-change-character
                >
                  Charakter ändern
                </Button>
              ) : null}
            </section>

            <section
              className="rounded-lg border border-border bg-card/40 p-4"
              data-session-lobby-roster
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Teilnehmer</h2>
                <p className="text-xs text-muted-foreground">
                  Online {model.onlineCount} · Bereit {model.readyCount}
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {model.roster.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Noch keine Teilnehmer</li>
                ) : (
                  model.roster.map((member) => (
                    <li
                      key={member.userId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                      data-session-lobby-member={member.isSelf ? 'self' : 'peer'}
                    >
                      <div>
                        <p className="font-medium">
                          {member.characterName ??
                            (member.role === 'gamemaster' ? 'Spielleitung' : 'Ohne Charakter')}
                          {member.isSelf ? ' (du)' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.role === 'gamemaster' ? 'GM' : 'Player'}
                          {member.characterPublicId ? ` · ${member.characterPublicId}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span
                          className={
                            member.isOnline ? 'text-emerald-600' : 'text-muted-foreground'
                          }
                          data-lobby-online={member.isOnline ? '1' : '0'}
                        >
                          {member.isOnline ? 'Online' : 'Offline'}
                        </span>
                        <span
                          className={
                            member.isReady ? 'text-emerald-600' : 'text-muted-foreground'
                          }
                          data-lobby-ready={member.isReady ? '1' : '0'}
                        >
                          {member.isReady ? 'Bereit' : 'Wartet'}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <Button
                type="button"
                variant={selfReady ? 'secondary' : 'default'}
                className="mt-3 min-h-11"
                onClick={() => setReady(!selfReady)}
                data-session-lobby-ready-toggle
              >
                {selfReady ? 'Bereitschaft zurücknehmen' : 'Bereit markieren'}
              </Button>
            </section>

            <section
              className="rounded-lg border border-border bg-card/40 p-4"
              data-session-lobby-media
            >
              <h2 className="text-sm font-medium">Geräte & LiveAct</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Kamera, Mikrofon und LiveAct starten nur nach deinem Klick — nie automatisch.
                Fehlende Geräte blockieren den Session-Start nicht.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">Kamera</p>
                  <p className="text-sm" data-lobby-camera-status>
                    {lobbyMediaStatusLabelDe(model.cameraStatus)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 min-h-11 w-full"
                    onClick={() => void probeCamera()}
                    data-session-lobby-probe-camera
                  >
                    Kamera prüfen
                  </Button>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">Mikrofon</p>
                  <p className="text-sm" data-lobby-mic-status>
                    {lobbyMediaStatusLabelDe(model.microphoneStatus)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 min-h-11 w-full"
                    onClick={() => void probeMicrophone()}
                    data-session-lobby-probe-mic
                  >
                    Mikrofon prüfen
                  </Button>
                </div>
                <div className="rounded-md border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">LiveAct</p>
                  <p className="text-sm" data-lobby-liveact-status>
                    {lobbyLiveActStatusLabelDe(model.liveActStatus)}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 min-h-11 w-full"
                    onClick={probeLiveAct}
                    data-session-lobby-probe-liveact
                  >
                    LiveAct prüfen
                  </Button>
                </div>
              </div>
            </section>

            <footer className="mt-auto flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button
                type="button"
                className="min-h-11"
                disabled={Boolean(model.enterDisabledReasonDe)}
                onClick={handleEnter}
                data-session-lobby-enter
              >
                {model.enterCtaLabelDe}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => void refresh()}
                data-session-lobby-refresh
              >
                Aktualisieren
              </Button>
              {model.enterDisabledReasonDe ? (
                <p className="text-sm text-destructive" role="status">
                  {model.enterDisabledReasonDe}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Bereitschaft ist nur ein Signal — keine Spielberechtigung.
                </p>
              )}
            </footer>
          </>
        ) : null}
      </div>
    </AdaptivePage>
  );
}
