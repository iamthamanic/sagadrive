/**
 * SessionLookSettings — GM Session Look inheritance / override (#349).
 * Location: src/app/session/SessionLookSettings.tsx
 *
 * Default inherit saga Look; optional session override. No Look authoring knobs.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  buildLookResolutionContextFromSaga,
  resolveLookProfileId,
  type LookProfileRecord,
  type LookResolutionResult,
} from '../../domains/look';
import { projectService } from '../../infrastructure/project/project-service';
import { listLookProfiles, getLookProfile } from '../../infrastructure/look';
import { pathForLookEdit } from '../shell';
import { lookOriginLabelDe } from '../look';
import { Button } from '../../shared/ui/button';
import { Label } from '../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/ui/select';

const INHERIT_SENTINEL = '__inherit_saga__';

export type SessionLookSettingsProps = {
  sagaPublicId: string;
  sessionPublicId: string;
  onNavigate?: (path: string) => void;
};

export function SessionLookSettings({
  sagaPublicId,
  sessionPublicId,
  onNavigate,
}: SessionLookSettingsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gmUserId, setGmUserId] = useState<string | null>(null);
  const [sagaDefaultId, setSagaDefaultId] = useState<string | null>(null);
  const [looks, setLooks] = useState<LookProfileRecord[]>([]);
  const [selectedLookId, setSelectedLookId] = useState<string>(INHERIT_SENTINEL);
  const [resolution, setResolution] = useState<LookResolutionResult | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [archivedNotice, setArchivedNotice] = useState<string | null>(null);

  const isGm = Boolean(user?.id && gmUserId && user.id === gmUserId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { project, session } = await projectService.getSessionByPublicIds(
          sagaPublicId,
          sessionPublicId,
        );
        if (cancelled) return;
        setSessionId(session.id);
        setGmUserId(project.gmUserId);
        setSagaDefaultId(project.defaultLookProfileId);

        const catalog = await listLookProfiles({ includeArchived: false });
        if (cancelled) return;
        const active = catalog.filter((row) => row.status === 'active');
        setLooks(active);

        let overrideId = session.lookProfileId;
        if (overrideId) {
          const owned = active.find((row) => row.profile.id === overrideId) ?? null;
          if (!owned) {
            const maybe = await getLookProfile(overrideId);
            if (cancelled) return;
            if (maybe?.status === 'archived') {
              setArchivedNotice(
                `Session-Look „${maybe.current.displayName}“ ist archiviert — Override wird zurückgesetzt.`,
              );
            } else {
              setArchivedNotice(
                'Session-Look ist nicht sichtbar — Fallback auf Saga-Vererbung.',
              );
            }
            overrideId = null;
            // Persist clear only after we know GM; handled below when userId matches project.gmUserId.
          }
        }

        setSelectedLookId(overrideId ?? INHERIT_SENTINEL);
        if (
          session.lookProfileId &&
          overrideId === null &&
          user?.id &&
          user.id === project.gmUserId
        ) {
          try {
            await projectService.updateSessionLookSettings(session.id, {
              lookProfileId: null,
            });
          } catch {
            // Soft-fail: local state already inherits; next save clears.
          }
        }
        const ctx = buildLookResolutionContextFromSaga({
          sagaDefaultProfileId: project.defaultLookProfileId,
          allowPlayerCharacterLookOverride: project.allowPlayerCharacterLookOverride,
          sessionOverrideProfileId: overrideId,
        });
        const resolved = resolveLookProfileId('world', ctx);
        if (cancelled) return;
        setResolution(resolved);
        const record = await getLookProfile(resolved.profileId);
        if (cancelled) return;
        setResolvedName(record?.current.displayName ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Session-Look konnte nicht geladen werden.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sagaPublicId, sessionPublicId, user?.id]);

  const refreshResolution = async (
    overrideId: string | null,
    sagaDefault: string | null,
  ) => {
    const ctx = buildLookResolutionContextFromSaga({
      sagaDefaultProfileId: sagaDefault,
      allowPlayerCharacterLookOverride: true,
      sessionOverrideProfileId: overrideId,
    });
    const resolved = resolveLookProfileId('world', ctx);
    setResolution(resolved);
    const record = await getLookProfile(resolved.profileId);
    setResolvedName(record?.current.displayName ?? null);
  };

  const save = async (nextSelect: string) => {
    if (!sessionId || !isGm || saving) return;
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      const nextId = nextSelect === INHERIT_SENTINEL ? null : nextSelect;
      if (nextId) {
        const owned = looks.some((row) => row.profile.id === nextId && row.status === 'active');
        if (!owned) {
          throw new Error('Look nicht sichtbar oder nicht aktiv — Auswahl abgelehnt.');
        }
      }
      await projectService.updateSessionLookSettings(sessionId, {
        lookProfileId: nextId,
      });
      setSelectedLookId(nextSelect);
      setArchivedNotice(null);
      await refreshResolution(nextId, sagaDefaultId);
      setStatusMessage(
        nextId
          ? 'Session-Look-Override gespeichert.'
          : 'Saga-Look-Vererbung aktiv — Override entfernt.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const openLookEditor = () => {
    if (!resolution?.profileId) return;
    const path = pathForLookEdit(resolution.profileId);
    if (onNavigate) {
      onNavigate(path);
      return;
    }
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-2" data-session-look-settings="loading">
        <p className="text-sm text-muted-foreground">Session-Look wird geladen…</p>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-3" data-session-look-settings="v1">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Session-Look</h3>
        <p className="text-xs text-muted-foreground">
          Standard: Saga-Look übernehmen. Override gilt nur für diese Session.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {archivedNotice ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {archivedNotice}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="text-xs text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}

      <div className="rounded-md bg-muted/30 px-3 py-2 text-sm" data-session-look-resolved>
        <p className="text-xs text-muted-foreground">Aktuell aufgelöst</p>
        <p className="font-medium">
          <span data-session-look-origin={resolution?.reason ?? 'unknown'}>
            {resolution ? lookOriginLabelDe(resolution.reason) : '—'}
          </span>
          {resolvedName ? <> · {resolvedName}</> : null}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="session-look-select">Look für diese Session</Label>
        <Select
          value={selectedLookId}
          onValueChange={(value) => {
            void save(value);
          }}
          disabled={!isGm || saving}
        >
          <SelectTrigger
            id="session-look-select"
            className="min-h-11"
            data-session-look-select
          >
            <SelectValue placeholder="Saga-Look übernehmen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={INHERIT_SENTINEL}>Saga-Look übernehmen</SelectItem>
            {looks.map((row) => (
              <SelectItem key={row.profile.id} value={row.profile.id}>
                {row.current.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isGm ? (
          <p className="text-xs text-muted-foreground" data-session-look-readonly>
            Nur der Spielleiter kann den Session-Look ändern.
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={!resolution?.profileId}
        onClick={openLookEditor}
        data-session-look-library-link
      >
        In Bibliothek bearbeiten
      </Button>
    </section>
  );
}
