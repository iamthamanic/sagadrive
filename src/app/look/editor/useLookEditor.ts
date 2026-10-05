/**
 * useLookEditor — Load/save/duplicate/reset state for Look Editor workspace (#344).
 * Location: src/app/look/editor/useLookEditor.ts
 */
import { useEffect, useRef, useState } from 'react';
import type { LookProfileRecord, LookProfileVersion } from '../../../domains/look/types';
import {
  appendLookProfileVersion,
  createLookProfile,
  duplicateLookProfile,
  getLookProfile,
  listLookProfileVersions,
} from '../../../infrastructure/look';
import {
  defaultLookEditorUiDraft,
  isLookEditorDirty,
  toLookProfileWriteDraft,
  uiDraftFromRecord,
  uiDraftFromVersion,
  type LookEditorUiDraft,
} from './look-editor-draft';

export type LookEditorMode = 'create' | 'edit';

export type UseLookEditorArgs = {
  mode: LookEditorMode;
  lookId: string | null;
  onCreated?: (lookId: string) => void;
};

export function useLookEditor({ mode, lookId, onCreated }: UseLookEditorArgs) {
  const [draft, setDraft] = useState<LookEditorUiDraft>(() => defaultLookEditorUiDraft());
  const [baseline, setBaseline] = useState<LookEditorUiDraft>(() => defaultLookEditorUiDraft());
  const [record, setRecord] = useState<LookProfileRecord | null>(null);
  const [versions, setVersions] = useState<LookProfileVersion[]>([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const onCreatedRef = useRef(onCreated);
  onCreatedRef.current = onCreated;

  const dirty = isLookEditorDirty(draft, baseline);

  useEffect(() => {
    if (mode !== 'edit' || !lookId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const loaded = await getLookProfile(lookId);
        if (cancelled) return;
        if (!loaded) {
          setError('Look nicht gefunden.');
          setLoading(false);
          return;
        }
        if (loaded.status === 'archived') {
          setReadOnly(true);
          setStatusMessage('Dieser Look ist archiviert und nur lesbar.');
        }
        const ui = uiDraftFromRecord(loaded);
        setRecord(loaded);
        setDraft(ui);
        setBaseline(ui);
        const history = await listLookProfileVersions(lookId);
        if (!cancelled) setVersions(history);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Look konnte nicht geladen werden.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, lookId]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const patchDraft = (patch: Partial<LookEditorUiDraft>) => {
    if (readOnly) return;
    setDraft((prev) => ({ ...prev, ...patch }));
    setStatusMessage(null);
  };

  const reset = () => {
    setDraft(baseline);
    setStatusMessage('Änderungen zurückgesetzt.');
  };

  const restoreVersion = (version: LookProfileVersion) => {
    if (readOnly) return;
    setDraft(uiDraftFromVersion(version));
    setStatusMessage(
      `Version ${version.version} geladen — Speichern erzeugt eine neue Version.`,
    );
  };

  const save = async () => {
    if (readOnly || saving) return;
    setSaving(true);
    setError(null);
    try {
      const writeDraft = toLookProfileWriteDraft(draft);
      if (mode === 'create' || !lookId) {
        const created = await createLookProfile({ draft: writeDraft });
        const ui = uiDraftFromRecord(created);
        setRecord(created);
        setDraft(ui);
        setBaseline(ui);
        setStatusMessage('Look gespeichert.');
        onCreatedRef.current?.(created.profile.id);
        return;
      }
      const updated = await appendLookProfileVersion({
        profileId: lookId,
        draft: writeDraft,
      });
      const ui = uiDraftFromRecord(updated);
      setRecord(updated);
      setDraft(ui);
      setBaseline(ui);
      const history = await listLookProfileVersions(lookId);
      setVersions(history);
      setStatusMessage(`Version ${updated.profile.currentVersion} gespeichert.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    if (!lookId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const copy = await duplicateLookProfile({
        sourceProfileId: lookId,
        displayName: `${draft.displayName.trim() || 'Look'} (Kopie)`,
      });
      setStatusMessage('Look dupliziert.');
      onCreatedRef.current?.(copy.profile.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplizieren fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return {
    draft,
    patchDraft,
    record,
    versions,
    loading,
    saving,
    error,
    statusMessage,
    readOnly,
    dirty,
    reset,
    restoreVersion,
    save,
    duplicate,
  };
}
