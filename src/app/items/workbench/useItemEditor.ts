/**
 * useItemEditor — load/save/dirty/mode state for Item Workbench (#139).
 * Persistence via catalog service only; no Supabase in this slice.
 * Location: src/app/items/workbench/useItemEditor.ts
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { ItemDefinition } from '../../../domains/character/inventory-v2';
import {
  archiveDefinition,
  createPersonalDefinition,
  createWorldDefinition,
  forkDefinition,
  getItemDefinitionById,
  restoreDefinition,
  updateDefinition,
  type ForkDefinitionTarget,
} from '../../../infrastructure/inventory/item-catalog-service';
import { setNavigationBlocker } from '../../shell/routing';
import { useWorldProfiles } from '../../../modules/worlds/hooks/useWorldProfiles';
import {
  applyTypeEntry,
  buildWorkbenchDraft,
  emptyWorkbenchForm,
  formFromDefinition,
  serializeForm,
  type WorkbenchFormState,
  type WorkbenchTypeEntry,
} from './workbenchForm';
import { DIRTY_LEAVE_MESSAGE } from './workbenchLabels';

export type WorkbenchEditorMode = 'landing' | 'create' | 'edit' | 'readonly';

export interface UseItemEditorOptions {
  route: 'create' | 'detail';
  itemId: string | null;
  onCreated: (itemId: string) => void;
  onBack: () => void;
}

export function useItemEditor({ route, itemId, onCreated, onBack }: UseItemEditorOptions) {
  const [mode, setMode] = useState<WorkbenchEditorMode>(route === 'create' ? 'landing' : 'edit');
  const [form, setForm] = useState<WorkbenchFormState>(() => emptyWorkbenchForm());
  const [baseline, setBaseline] = useState(() => serializeForm(emptyWorkbenchForm()));
  const [definition, setDefinition] = useState<ItemDefinition | null>(null);
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(route === 'detail');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [forkOpen, setForkOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [pendingTypeEntry, setPendingTypeEntry] = useState<WorkbenchTypeEntry | null>(null);

  const { worlds, isLoading: worldsLoading } = useWorldProfiles({ enabled: true });
  const editableWorldIds = worlds.map((world) => world.id);
  const editableWorldKey = editableWorldIds.join('|');

  const dirty = mode !== 'landing' && mode !== 'readonly' && serializeForm(form) !== baseline;

  useEffect(() => {
    if (!dirty) return;
    return setNavigationBlocker(() => DIRTY_LEAVE_MESSAGE);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = DIRTY_LEAVE_MESSAGE;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (route !== 'detail' || !itemId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError('');

    void (async () => {
      try {
        const result = await getItemDefinitionById(itemId);
        if (cancelled) return;
        if (!result) {
          setLoadError('Gegenstand wurde nicht gefunden.');
          setDefinition(null);
          setLoading(false);
          return;
        }

        const { definition: loaded, record } = result;
        const isReadonly =
          loaded.scope === 'core' ||
          loaded.origin === 'core-archetype' ||
          loaded.origin === 'builtin-standard';

        let canEdit = false;
        if (!isReadonly && record) {
          if (loaded.scope === 'personal') {
            canEdit = true;
          } else if (loaded.scope === 'world' && record.worldProfileId) {
            if (worldsLoading) {
              // Wait for editable worlds before deciding edit vs readonly.
              return;
            }
            canEdit = editableWorldIds.includes(record.worldProfileId);
          }
        }

        const nextForm = formFromDefinition(loaded, {
          worldProfileId: record?.worldProfileId ?? '',
          availability: loaded.scope === 'world' ? 'world' : 'personal',
        });
        setDefinition(loaded);
        setArchived(record?.status === 'archived');
        setForm(nextForm);
        setBaseline(serializeForm(nextForm));
        setMode(canEdit && !isReadonly ? 'edit' : 'readonly');
        setSaveError('');
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('[item-workbench] load failed', err);
        setLoadError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [route, itemId, worldsLoading, editableWorldKey]);

  const markClean = (next: WorkbenchFormState) => {
    setForm(next);
    setBaseline(serializeForm(next));
  };

  const confirmLeave = (): boolean => {
    if (!dirty) return true;
    if (typeof window === 'undefined') return true;
    return window.confirm(DIRTY_LEAVE_MESSAGE);
  };

  const handleBack = () => {
    if (!confirmLeave()) return;
    setNavigationBlocker(null);
    onBack();
  };

  const openLanding = () => {
    setTypePickerOpen(true);
  };

  const selectTypeEntry = (entry: WorkbenchTypeEntry) => {
    if (mode === 'create' || mode === 'edit') {
      if (typeChangeLosesValues(form, entry) && !window.confirm('Typabhängige Werte gehen verloren. Fortfahren?')) {
        return;
      }
      const next = applyTypeEntry(form, entry);
      setForm(next);
      setTypePickerOpen(false);
      setPendingTypeEntry(null);
      return;
    }
    const next = emptyWorkbenchForm(entry);
    markClean(next);
    setMode('create');
    setTypePickerOpen(false);
    setDefinition(null);
    setArchived(false);
  };

  const requestTypeChange = (entry: WorkbenchTypeEntry) => {
    if (mode === 'landing') {
      selectTypeEntry(entry);
      return;
    }
    if (typeChangeLosesValues(form, entry)) {
      setPendingTypeEntry(entry);
      return;
    }
    selectTypeEntry(entry);
  };

  const confirmPendingTypeChange = () => {
    if (!pendingTypeEntry) return;
    const next = applyTypeEntry(form, pendingTypeEntry);
    setForm(next);
    setPendingTypeEntry(null);
    setTypePickerOpen(false);
  };

  const applyAssetKey = (assetKey: string | undefined) => {
    setDefinition((previous) => {
      if (!previous) return previous;
      if (assetKey) return { ...previous, assetKey };
      const next = { ...previous };
      delete next.assetKey;
      return next;
    });
  };

  const applyModel3d = (model3d: string | undefined) => {
    setDefinition((previous) => {
      if (!previous) return previous;
      if (model3d) return { ...previous, model3d };
      const next = { ...previous };
      delete next.model3d;
      return next;
    });
  };

  const handleSave = async () => {
    if (mode === 'readonly' || mode === 'landing') return;
    const payload = buildWorkbenchDraft(form);
    if (typeof payload === 'string') {
      setSaveError(payload);
      return;
    }
    // Preserve thumbnail/icon/3d keys set outside the form (Edge upload/Meshy).
    if (definition?.assetKey) payload.assetKey = definition.assetKey;
    if (definition?.iconKey) payload.iconKey = definition.iconKey;
    if (definition?.model3d) payload.model3d = definition.model3d;
    setSaving(true);
    setSaveError('');
    try {
      if (mode === 'edit' && definition) {
        await updateDefinition(definition.id, payload);
        const refreshed = await getItemDefinitionById(definition.id);
        if (refreshed) {
          const next = formFromDefinition(refreshed.definition, {
            worldProfileId: refreshed.record?.worldProfileId ?? form.worldProfileId,
            availability: refreshed.definition.scope === 'world' ? 'world' : 'personal',
          });
          setDefinition(refreshed.definition);
          markClean(next);
        } else {
          markClean(form);
        }
        toast.success('Item gespeichert');
        return;
      }

      const record =
        form.availability === 'world'
          ? await createWorldDefinition(form.worldProfileId.trim(), payload)
          : await createPersonalDefinition(payload);

      const next = formFromDefinition(record.definition, {
        worldProfileId: record.worldProfileId ?? '',
        availability: record.definition.scope === 'world' ? 'world' : 'personal',
      });
      setDefinition(record.definition);
      setMode('edit');
      markClean(next);
      setNavigationBlocker(null);
      toast.success('Item erstellt');
      onCreated(record.definition.id);
    } catch (err) {
      console.error('[item-workbench] save failed', err);
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleFork = async (target: ForkDefinitionTarget) => {
    if (!definition) return;
    setSaving(true);
    setSaveError('');
    try {
      const record = await forkDefinition(definition.id, target);
      setForkOpen(false);
      setNavigationBlocker(null);
      toast.success('Item erstellt');
      onCreated(record.definition.id);
    } catch (err) {
      console.error('[item-workbench] fork failed', err);
      setSaveError(err instanceof Error ? err.message : 'Kopieren fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!definition || mode !== 'edit') return;
    setSaving(true);
    setSaveError('');
    try {
      await archiveDefinition(definition.id);
      setArchiveOpen(false);
      setArchived(true);
      toast.success('Item archiviert');
      setNavigationBlocker(null);
      onBack();
    } catch (err) {
      console.error('[item-workbench] archive failed', err);
      setSaveError(err instanceof Error ? err.message : 'Archivieren fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!definition || mode !== 'edit') return;
    setSaving(true);
    setSaveError('');
    try {
      await restoreDefinition(definition.id);
      setArchived(false);
      toast.success('Item wiederhergestellt');
    } catch (err) {
      console.error('[item-workbench] restore failed', err);
      setSaveError(err instanceof Error ? err.message : 'Wiederherstellen fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const reload = () => {
    if (route === 'detail' && itemId) {
      setLoadError('');
      setLoading(true);
      // Trigger effect by toggling — worldsLoading already settled; force via state.
      void getItemDefinitionById(itemId)
        .then((result) => {
          if (!result) {
            setLoadError('Gegenstand wurde nicht gefunden.');
            setDefinition(null);
            return;
          }
          const { definition: loaded, record } = result;
          const isReadonly =
            loaded.scope === 'core' ||
            loaded.origin === 'core-archetype' ||
            loaded.origin === 'builtin-standard';
          let canEdit = false;
          if (!isReadonly && record) {
            if (loaded.scope === 'personal') canEdit = true;
            else if (loaded.scope === 'world' && record.worldProfileId) {
              canEdit = editableWorldIds.includes(record.worldProfileId);
            }
          }
          const nextForm = formFromDefinition(loaded, {
            worldProfileId: record?.worldProfileId ?? '',
            availability: loaded.scope === 'world' ? 'world' : 'personal',
          });
          setDefinition(loaded);
          setArchived(record?.status === 'archived');
          markClean(nextForm);
          setMode(canEdit && !isReadonly ? 'edit' : 'readonly');
        })
        .catch((err: unknown) => {
          console.error('[item-workbench] reload failed', err);
          setLoadError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.');
        })
        .finally(() => setLoading(false));
    }
  };

  return {
    mode,
    form,
    setForm,
    definition,
    archived,
    loading,
    loadError,
    saving,
    saveError,
    setSaveError,
    dirty,
    typePickerOpen,
    setTypePickerOpen,
    forkOpen,
    setForkOpen,
    archiveOpen,
    setArchiveOpen,
    pendingTypeEntry,
    setPendingTypeEntry,
    worlds,
    worldsLoading,
    openLanding,
    requestTypeChange,
    confirmPendingTypeChange,
    selectTypeEntry,
    handleSave,
    handleFork,
    handleArchive,
    handleRestore,
    handleBack,
    reload,
    applyAssetKey,
    applyModel3d,
  };
}

function typeChangeLosesValues(form: WorkbenchFormState, entry: WorkbenchTypeEntry): boolean {
  if (form.type === entry.type && form.kindKey === entry.kindKey) return false;
  if (form.type === 'weapon') return true;
  if (form.type === 'armor') return true;
  if (form.type === 'container') return true;
  if (form.traits.trim().length > 0 && entry.type !== form.type) return true;
  return false;
}
