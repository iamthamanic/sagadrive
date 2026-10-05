/**
 * SagaVisualStyleSettings — Saga settings „Visueller Stil“ (#348).
 * Location: src/app/project/SagaVisualStyleSettings.tsx
 *
 * GM picks default Look + player override flag. Links to Look Editor; no authoring knobs.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import {
  SYSTEM_DEFAULT_LOOK_PROFILE_ID,
  lookPreviewUri,
  lookStatusLabel,
  type LookProfileRecord,
} from '../../domains/look';
import { projectService } from '../../infrastructure/project/project-service';
import { listLookProfiles, getLookProfile } from '../../infrastructure/look';
import { pathForLookEdit } from '../shell';
import { Button } from '../../shared/ui/button';
import { Label } from '../../shared/ui/label';
import { Switch } from '../../shared/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/ui/select';

const SYSTEM_SENTINEL = '__system_default__';

export type SagaVisualStyleSettingsProps = {
  sagaPublicId: string;
  onNavigate?: (path: string) => void;
};

export function SagaVisualStyleSettings({
  sagaPublicId,
  onNavigate,
}: SagaVisualStyleSettingsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [gmUserId, setGmUserId] = useState<string | null>(null);
  const [looks, setLooks] = useState<LookProfileRecord[]>([]);
  const [selectedLookId, setSelectedLookId] = useState<string>(SYSTEM_SENTINEL);
  const [allowOverride, setAllowOverride] = useState(true);
  const [previewRecord, setPreviewRecord] = useState<LookProfileRecord | null>(null);
  const [archivedNotice, setArchivedNotice] = useState<string | null>(null);

  const isGm = Boolean(user?.id && gmUserId && user.id === gmUserId);

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
          setSelectedLookId(SYSTEM_SENTINEL);
          setPreviewRecord(null);
          setArchivedNotice(null);
        } else {
          const owned = active.find((row) => row.profile.id === savedId) ?? null;
          if (owned) {
            setSelectedLookId(savedId);
            setPreviewRecord(owned);
            setArchivedNotice(null);
          } else {
            const maybeArchived = await getLookProfile(savedId);
            if (cancelled) return;
            setSelectedLookId(SYSTEM_SENTINEL);
            setPreviewRecord(null);
            if (maybeArchived?.status === 'archived') {
              setArchivedNotice(
                `Gespeicherter Look „${maybeArchived.current.displayName}“ ist archiviert — bitte neu wählen oder System-Default behalten.`,
              );
            } else {
              setArchivedNotice(
                'Gespeicherter Default-Look ist nicht sichtbar — Fallback auf System-Default.',
              );
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Saga-Einstellungen konnten nicht geladen werden.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sagaPublicId]);

  useEffect(() => {
    if (selectedLookId === SYSTEM_SENTINEL) {
      setPreviewRecord(null);
      return;
    }
    const match = looks.find((row) => row.profile.id === selectedLookId) ?? null;
    setPreviewRecord(match);
  }, [selectedLookId, looks]);

  const save = async () => {
    if (!projectId || !isGm || saving) return;
    setSaving(true);
    setError(null);
    setStatusMessage(null);
    try {
      const nextId = selectedLookId === SYSTEM_SENTINEL ? null : selectedLookId;
      if (nextId) {
        const owned = looks.some((row) => row.profile.id === nextId && row.status === 'active');
        if (!owned) {
          throw new Error('Look nicht sichtbar oder nicht aktiv — Auswahl abgelehnt.');
        }
      }
      await projectService.updateProjectLookSettings(projectId, {
        defaultLookProfileId: nextId,
        allowPlayerCharacterLookOverride: allowOverride,
      });
      setArchivedNotice(null);
      setStatusMessage('Visueller Stil gespeichert.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const openLookEditor = (lookId: string) => {
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

  const previewUri = previewRecord ? lookPreviewUri(previewRecord) : null;

  if (loading) {
    return (
      <div className="space-y-2" data-saga-visual-style="loading">
        <p className="text-sm text-muted-foreground">Visueller Stil wird geladen…</p>
      </div>
    );
  }

  return (
    <section className="space-y-4" data-saga-visual-style="v1">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Visueller Stil</h2>
        <p className="text-sm text-muted-foreground">
          Saga-Default-Look und ob Spieler einen eigenen Charakter-Look verwenden dürfen.
          Ohne Auswahl gilt der System-Default (
          <code className="rounded bg-muted px-1 text-xs">{SYSTEM_DEFAULT_LOOK_PROFILE_ID}</code>
          ).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="text-xs text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}
      {archivedNotice ? (
        <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
          {archivedNotice}
        </p>
      ) : null}

      {!isGm ? (
        <p className="text-sm text-muted-foreground" data-saga-visual-style-readonly>
          Nur die Spielleitung kann diese Einstellungen ändern.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="saga-default-look">Standard-Look</Label>
        <Select
          value={selectedLookId}
          onValueChange={setSelectedLookId}
          disabled={!isGm || saving}
        >
          <SelectTrigger id="saga-default-look" className="min-h-11" data-saga-default-look>
            <SelectValue placeholder="System-Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SYSTEM_SENTINEL}>System-Default (kein Saga-Look)</SelectItem>
            {looks.map((row) => (
              <SelectItem key={row.profile.id} value={row.profile.id}>
                {row.current.displayName}
                {' · '}
                {lookStatusLabel(row.status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
        data-saga-look-override
      >
        <Label htmlFor="saga-look-override" className="text-sm font-normal">
          Spieler dürfen einen eigenen Charakter-Look verwenden
        </Label>
        <Switch
          id="saga-look-override"
          checked={allowOverride}
          disabled={!isGm || saving}
          onCheckedChange={setAllowOverride}
        />
      </div>

      <div
        className="rounded-md border border-border p-3"
        data-saga-look-preview
      >
        <p className="text-sm font-medium">Vorschau</p>
        {previewRecord ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm">{previewRecord.current.displayName}</p>
            <p className="text-xs text-muted-foreground">
              Version {previewRecord.profile.currentVersion} · {lookStatusLabel(previewRecord.status)}
            </p>
            {previewUri ? (
              <img
                src={previewUri}
                alt=""
                className="max-h-32 rounded-md object-cover"
              />
            ) : (
              <p className="text-xs text-muted-foreground">Kein Vorschaubild hinterlegt.</p>
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => openLookEditor(previewRecord.profile.id)}
              data-saga-look-editor-link
            >
              Im Look Editor öffnen
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            System-Default — kein Saga-Look gewählt. Looks bearbeiten in der Bibliothek.
          </p>
        )}
      </div>

      <Button
        type="button"
        className="min-h-11"
        disabled={!isGm || saving}
        onClick={() => void save()}
        data-saga-visual-style-save
      >
        {saving ? 'Speichert…' : 'Speichern'}
      </Button>
    </section>
  );
}
