/**
 * WorldLookPreviewPanel — Saga World „Look“ preview / apply / reset (#350).
 * Location: src/app/project/WorldLookPreviewPanel.tsx
 *
 * Temporary preview only until „Anwenden“. No Look Inspector; Library owns authoring.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  SYSTEM_DEFAULT_LOOK_PROFILE_ID,
  lookCapabilityUnavailableLabel,
  lookPreviewUri,
  lookStatusLabel,
  listReservedLookCapabilityMetadata,
  type LookProfileRecord,
} from '../../domains/look';
import { projectService } from '../../infrastructure/project/project-service';
import { listLookProfiles, getLookProfile } from '../../infrastructure/look';
import { pathForLookEdit, pathForSagaSection } from '../shell';
import { setLookEditorReturnPath } from '../look';
import { Button } from '../../shared/ui/button';
import { Label } from '../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/ui/select';

const SYSTEM_SENTINEL = '__system_default__';

export type WorldLookPreviewPanelProps = {
  sagaPublicId: string;
  onNavigate?: (path: string) => void;
};

function resolveDisplayRecord(
  lookId: string,
  looks: LookProfileRecord[],
): LookProfileRecord | null {
  if (lookId === SYSTEM_SENTINEL) return null;
  return looks.find((row) => row.profile.id === lookId) ?? null;
}

export function WorldLookPreviewPanel({
  sagaPublicId,
  onNavigate,
}: WorldLookPreviewPanelProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [gmUserId, setGmUserId] = useState<string | null>(null);
  const [allowOverride, setAllowOverride] = useState(true);
  const [looks, setLooks] = useState<LookProfileRecord[]>([]);
  /** Persisted saga default (SYSTEM_SENTINEL = null). */
  const [savedLookId, setSavedLookId] = useState<string>(SYSTEM_SENTINEL);
  /** Temporary preview selection — not persisted until Apply. */
  const [previewLookId, setPreviewLookId] = useState<string>(SYSTEM_SENTINEL);
  const [archivedNotice, setArchivedNotice] = useState<string | null>(null);

  const isGm = Boolean(user?.id && gmUserId && user.id === gmUserId);
  const dirtyPreview = previewLookId !== savedLookId;

  const previewRecord = useMemo(
    () => resolveDisplayRecord(previewLookId, looks),
    [previewLookId, looks],
  );
  const savedRecord = useMemo(
    () => resolveDisplayRecord(savedLookId, looks),
    [savedLookId, looks],
  );

  const reservedWorldDomains = listReservedLookCapabilityMetadata();
  const previewUri = previewRecord ? lookPreviewUri(previewRecord) : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const project = await projectService.getProjectByPublicId(sagaPublicId);
        if (cancelled) return;
        setProjectId(project.id);
        setGmUserId(project.gmUserId);
        setAllowOverride(project.allowPlayerCharacterLookOverride);

        const catalog = await listLookProfiles({ includeArchived: false });
        if (cancelled) return;
        const active = catalog.filter((row) => row.status === 'active');
        setLooks(active);

        const savedId = project.defaultLookProfileId;
        if (!savedId) {
          setSavedLookId(SYSTEM_SENTINEL);
          setPreviewLookId(SYSTEM_SENTINEL);
          setArchivedNotice(null);
        } else {
          const owned = active.find((row) => row.profile.id === savedId) ?? null;
          if (owned) {
            setSavedLookId(savedId);
            setPreviewLookId(savedId);
            setArchivedNotice(null);
          } else {
            const maybe = await getLookProfile(savedId);
            if (cancelled) return;
            setSavedLookId(SYSTEM_SENTINEL);
            setPreviewLookId(SYSTEM_SENTINEL);
            if (maybe?.status === 'archived') {
              setArchivedNotice(
                `Gespeicherter Saga-Look „${maybe.current.displayName}“ ist archiviert — System-Default aktiv.`,
              );
            } else {
              setArchivedNotice(
                'Gespeicherter Saga-Look ist nicht sichtbar — Fallback auf System-Default.',
              );
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Welt-Look konnte nicht geladen werden.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sagaPublicId]);

  const apply = async () => {
    if (!projectId || !isGm || saving || !dirtyPreview) return;
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      const nextId = previewLookId === SYSTEM_SENTINEL ? null : previewLookId;
      if (nextId) {
        const owned = looks.some((row) => row.profile.id === nextId && row.status === 'active');
        if (!owned) {
          throw new Error('Look nicht sichtbar oder nicht aktiv — Anwenden abgelehnt.');
        }
        const fresh = await getLookProfile(nextId);
        if (!fresh || fresh.status === 'archived') {
          throw new Error('Preview-Look ist archiviert — bitte neu wählen.');
        }
      }
      await projectService.updateProjectLookSettings(projectId, {
        defaultLookProfileId: nextId,
        allowPlayerCharacterLookOverride: allowOverride,
      });
      setSavedLookId(previewLookId);
      setArchivedNotice(null);
      setStatusMessage('Look als Saga-Default angewendet.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anwenden fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const resetPreview = () => {
    setPreviewLookId(savedLookId);
    setStatusMessage('Preview zurückgesetzt — Saga-Default unverändert.');
    setError(null);
  };

  const openLookEditor = () => {
    const lookId =
      previewLookId !== SYSTEM_SENTINEL
        ? previewLookId
        : savedLookId !== SYSTEM_SENTINEL
          ? savedLookId
          : null;
    if (!lookId) {
      setError('Kein Look ausgewählt — wähle einen Look oder setze zuerst einen Saga-Default.');
      return;
    }
    const returnPath = pathForSagaSection(sagaPublicId, 'world');
    setLookEditorReturnPath(returnPath);
    const path = pathForLookEdit(lookId);
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
      <div className="space-y-2" data-world-look-preview="loading">
        <p className="text-sm text-muted-foreground">Welt-Look wird geladen…</p>
      </div>
    );
  }

  const savedLabel =
    savedLookId === SYSTEM_SENTINEL
      ? `System-Default (${SYSTEM_DEFAULT_LOOK_PROFILE_ID})`
      : savedRecord?.current.displayName ?? savedLookId;

  return (
    <section className="space-y-4" data-world-look-preview="v1">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Look</h2>
        <p className="text-sm text-muted-foreground">
          Beurteile Looks in der Weltansicht. Preview ändert nichts dauerhaft — erst
          „Anwenden“ setzt den Saga-Default. Authoring bleibt in Bibliothek › Looks.
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

      <div
        className="rounded-lg border border-border bg-muted/20 p-3 text-sm"
        data-world-look-current
      >
        <p className="text-xs text-muted-foreground">Aktueller Saga-Default</p>
        <p className="font-medium" data-world-look-saved-name>
          {savedLabel}
        </p>
        {dirtyPreview ? (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400" data-world-look-preview-dirty>
            Temporäre Preview aktiv — noch nicht angewendet.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Keine ungespeicherte Preview.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="world-look-preview-select">Temporäre Preview</Label>
        <Select
          value={previewLookId}
          onValueChange={(value) => {
            setPreviewLookId(value);
            setStatusMessage(null);
            setError(null);
          }}
          disabled={saving}
        >
          <SelectTrigger
            id="world-look-preview-select"
            className="min-h-11"
            data-world-look-preview-select
          >
            <SelectValue placeholder="Look wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SYSTEM_SENTINEL}>
              System-Default ({SYSTEM_DEFAULT_LOOK_PROFILE_ID})
            </SelectItem>
            {looks.map((row) => (
              <SelectItem key={row.profile.id} value={row.profile.id}>
                {row.current.displayName}
                {row.status !== 'active' ? ` · ${lookStatusLabel(row.status)}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="space-y-3 rounded-lg border border-dashed border-border bg-[#0B1220] p-4 text-slate-100"
        data-world-look-world-view
      >
        <p className="text-xs uppercase tracking-wide text-slate-400">Weltansicht · Look-Kontext</p>
        <p className="text-sm font-medium" data-world-look-preview-name>
          {previewLookId === SYSTEM_SENTINEL
            ? `System-Default (${SYSTEM_DEFAULT_LOOK_PROFILE_ID})`
            : previewRecord?.current.displayName ?? 'Look nicht ladbar'}
        </p>
        {previewUri ? (
          <p className="truncate text-xs text-slate-400" data-world-look-preview-uri>
            Stil-Referenz: {previewUri}
          </p>
        ) : (
          <p className="text-xs text-slate-400">Keine Stil-Referenz — nur Profil-Metadaten.</p>
        )}
        <ul className="grid gap-2 text-xs sm:grid-cols-2" data-world-look-domain-grid>
          <li className="rounded border border-slate-700/80 px-2 py-2">Charaktere · unterstützt</li>
          <li className="rounded border border-slate-700/80 px-2 py-2">Beleuchtung · unterstützt</li>
          <li className="rounded border border-slate-700/80 px-2 py-2">Post-FX · unterstützt</li>
          {reservedWorldDomains.map((row) => (
            <li
              key={row.id}
              className="rounded border border-slate-700/80 px-2 py-2 text-slate-400"
              data-world-look-domain-reserved={row.id}
            >
              {row.labelDe}
              {' · '}
              {lookCapabilityUnavailableLabel(row.id) ?? 'Noch nicht verfügbar'}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          disabled={!isGm || saving || !dirtyPreview}
          onClick={() => void apply()}
          data-world-look-apply
        >
          Anwenden
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={saving || !dirtyPreview}
          onClick={resetPreview}
          data-world-look-reset
        >
          Zurücksetzen
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={openLookEditor}
          data-world-look-edit-link
        >
          Look bearbeiten
        </Button>
      </div>
      {!isGm ? (
        <p className="text-xs text-muted-foreground" data-world-look-readonly>
          Nur der Spielleiter kann den Saga-Default anwenden.
        </p>
      ) : null}
    </section>
  );
}
