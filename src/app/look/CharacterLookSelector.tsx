/**
 * CharacterLookSelector — Character Editor Look summary + selection (#347).
 * Location: src/app/look/CharacterLookSelector.tsx
 *
 * Consumes Look resolution; applies via CharacterStudioRuntime. No Look Inspector.
 */
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { CharacterStudioRuntime } from '../../infrastructure/character/avatar/character-studio-runtime';
import {
  buildLookResolutionContextFromSaga,
  resolveLookProfileId,
  type LookProfileRecord,
  type LookProfileVersion,
  type LookResolutionResult,
} from '../../domains/look';
import { getLookProfile, listLookProfiles } from '../../infrastructure/look';
import { projectService } from '../../infrastructure/project/project-service';
import { characterAdventureArcService } from '../../infrastructure/character/character-adventure-arc-service';
import { characterService } from '../../infrastructure/character/character-service';
import { pathForLookEdit } from '../shell';
import { Button } from '../../shared/ui/button';
import { Label } from '../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../shared/ui/select';
import { lookOriginLabelDe } from './look-origin-labels';

const WORLD_SENTINEL = '__world_look__';

export type CharacterLookSelectorProps = {
  characterId: string | null;
  /** Current personal override from appearance (null = inherit). */
  personalLookProfileId: string | null;
  onPersonalLookProfileIdChange: (id: string | null) => void;
  studioRuntimeRef: MutableRefObject<CharacterStudioRuntime | null>;
  runtimeReady: boolean;
  onNavigate?: (path: string) => void;
  disabled?: boolean;
};

function applyVersion(
  studio: CharacterStudioRuntime | null,
  version: LookProfileVersion | null,
  neutral: boolean,
): string | null {
  if (!studio) return 'Avatar-Runtime noch nicht bereit.';
  if (neutral) {
    const result = studio.restorePbrNeutralLook();
    return result.noticeDe ?? null;
  }
  if (!version) return 'Kein Look geladen.';
  const result = studio.applyLookProfile(version);
  return result.noticeDe ?? null;
}

export function CharacterLookSelector({
  characterId,
  personalLookProfileId,
  onPersonalLookProfileIdChange,
  studioRuntimeRef,
  runtimeReady,
  onNavigate,
  disabled,
}: CharacterLookSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [looks, setLooks] = useState<LookProfileRecord[]>([]);
  const [allowOverride, setAllowOverride] = useState(true);
  const [sagaDefaultId, setSagaDefaultId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<LookResolutionResult | null>(null);
  const [resolvedVersion, setResolvedVersion] = useState<LookProfileVersion | null>(null);
  const [neutralCompare, setNeutralCompare] = useState(false);
  const [archivedNotice, setArchivedNotice] = useState<string | null>(null);
  const persistLock = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const catalog = await listLookProfiles({ includeArchived: false });
        if (cancelled) return;
        setLooks(catalog.filter((row) => row.status === 'active'));

        let sagaDefault: string | null = null;
        let allow = true;
        if (characterId) {
          try {
            const arcs = await characterAdventureArcService.listArcsForCharacter(characterId);
            const active = arcs.find((arc) => arc.status === 'active') ?? arcs[0];
            if (active?.projectId) {
              const project = await projectService.getProjectById(active.projectId);
              if (cancelled) return;
              sagaDefault = project.defaultLookProfileId;
              allow = project.allowPlayerCharacterLookOverride;
            }
          } catch {
            // No saga context — system default only.
          }
        }
        if (cancelled) return;
        setSagaDefaultId(sagaDefault);
        setAllowOverride(allow);

        let personal = personalLookProfileId;
        if (personal) {
          const owned = catalog.find((row) => row.profile.id === personal && row.status === 'active');
          if (!owned) {
            const maybe = await getLookProfile(personal);
            if (cancelled) return;
            if (maybe?.status === 'archived') {
              setArchivedNotice(
                `Persönlicher Look „${maybe.current.displayName}“ ist archiviert — Auswahl zurückgesetzt.`,
              );
            } else if (!allow) {
              setArchivedNotice(
                'Persönlicher Look ist gespeichert, aber Spieler-Overrides sind für diese Saga nicht erlaubt.',
              );
            } else {
              setArchivedNotice('Persönlicher Look ist nicht sichtbar — Fallback auf geerbten Look.');
            }
            if (!allow || !owned) {
              personal = null;
              onPersonalLookProfileIdChange(null);
              if (characterId && !persistLock.current) {
                persistLock.current = true;
                try {
                  await characterService.updateCharacterPersonalLook(characterId, null);
                } catch {
                  // Soft-fail: local state already cleared; next save will persist.
                } finally {
                  persistLock.current = false;
                }
              }
            }
          }
        }

        const ctx = buildLookResolutionContextFromSaga({
          sagaDefaultProfileId: sagaDefault,
          allowPlayerCharacterLookOverride: allow,
          personalOverrideProfileId: personal,
          sessionOverrideProfileId: null,
        });
        const resolved = resolveLookProfileId('player-character', ctx);
        if (cancelled) return;
        setResolution(resolved);

        const record = await getLookProfile(resolved.profileId);
        if (cancelled) return;
        setResolvedVersion(record?.current ?? null);
        if (!record) {
          setNotice(
            `Look ${resolved.profileId} nicht ladbar — Preview ohne Look-Anwendung.`,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Look konnte nicht aufgelöst werden.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [characterId, personalLookProfileId]);

  // Re-resolve when personal id / saga flags change without full reload race — depend on personalLookProfileId above.

  useEffect(() => {
    if (!runtimeReady || loading) return;
    const msg = applyVersion(
      studioRuntimeRef.current,
      resolvedVersion,
      neutralCompare,
    );
    if (msg) setNotice(msg);
  }, [runtimeReady, loading, resolvedVersion, neutralCompare, studioRuntimeRef]);

  const selectValue =
    !allowOverride || personalLookProfileId === null
      ? WORLD_SENTINEL
      : personalLookProfileId;

  const persistPersonal = async (nextId: string | null) => {
    onPersonalLookProfileIdChange(nextId);
    if (!characterId || persistLock.current) return;
    persistLock.current = true;
    setSaving(true);
    setError(null);
    try {
      await characterService.updateCharacterPersonalLook(characterId, nextId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Look-Auswahl konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
      persistLock.current = false;
    }
  };

  const onSelect = (value: string) => {
    if (!allowOverride || disabled || saving) return;
    if (value === WORLD_SENTINEL) {
      void persistPersonal(null);
      return;
    }
    const owned = looks.some((row) => row.profile.id === value);
    if (!owned) {
      setError('Look nicht sichtbar oder nicht aktiv.');
      return;
    }
    void persistPersonal(value);
  };

  const openEditor = () => {
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
      <div className="space-y-2" data-character-look-selector="loading">
        <p className="text-sm text-muted-foreground">Look wird aufgelöst…</p>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-4" data-character-look-selector="v1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Visueller Look</h3>
          <p className="text-xs text-muted-foreground">
            Herkunft:{' '}
            <span data-character-look-origin={resolution?.reason ?? 'unknown'}>
              {resolution ? lookOriginLabelDe(resolution.reason) : '—'}
            </span>
            {resolvedVersion ? (
              <>
                {' '}
                · {resolvedVersion.displayName}
              </>
            ) : null}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={!resolution?.profileId}
          onClick={openEditor}
          data-character-look-library-link
        >
          In Bibliothek bearbeiten
        </Button>
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
      {notice ? (
        <p className="text-xs text-muted-foreground" role="status">
          {notice}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="character-look-select">Look-Auswahl</Label>
        <Select
          value={selectValue}
          onValueChange={onSelect}
          disabled={!allowOverride || disabled || saving}
        >
          <SelectTrigger
            id="character-look-select"
            className="min-h-11"
            data-character-look-select
          >
            <SelectValue placeholder="Welt-/Saga-Look verwenden" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={WORLD_SENTINEL}>Welt-Look verwenden</SelectItem>
            {looks.map((row) => (
              <SelectItem key={row.profile.id} value={row.profile.id}>
                {row.current.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!allowOverride ? (
          <p className="text-xs text-muted-foreground" data-character-look-readonly>
            Persönliche Charakter-Looks sind in dieser Saga nicht erlaubt — nur geerbter Look.
          </p>
        ) : null}
        {sagaDefaultId === null && allowOverride ? (
          <p className="text-xs text-muted-foreground">
            Kein Saga-Default — „Welt-Look“ fällt auf System-Default zurück.
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        variant={neutralCompare ? 'default' : 'outline'}
        className="min-h-11"
        disabled={!runtimeReady}
        aria-pressed={neutralCompare}
        data-character-look-neutral-compare
        onClick={() => setNeutralCompare((prev) => !prev)}
      >
        {neutralCompare ? 'Look wieder anzeigen' : 'Neutral vergleichen'}
      </Button>
    </section>
  );
}
