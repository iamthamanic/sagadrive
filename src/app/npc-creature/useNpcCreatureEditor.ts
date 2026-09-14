/**
 * useNpcCreatureEditor — load/save/dirty state for NPC Statblock editor (#198).
 * Location: src/app/npc-creature/useNpcCreatureEditor.ts
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  assembleNpcCreatureDefinition,
  validateNpcCreatureDefinition,
  type NpcCreatureCatalogRecord,
  type NpcCreatureCategory,
  type NpcCreatureCombatDetails,
  type NpcCreatureDefinitionWriteDraft,
  type NpcCreatureDetailExtras,
  type NpcCreatureKind,
  type NpcCreatureStatOverrides,
} from '../../domains/npc-creature';
import {
  normalizeCombatRoleForProfile,
  type SagaDriveCombatProfile,
  type SagaDriveCombatRole,
  type SagaDriveNpcLevel,
} from '../../domains/rules/sagadrive/npc-creature-power';
import {
  getNpcCreatureDefinition,
  updateNpcCreatureDefinition,
} from '../../infrastructure/npc-creature/npc-creature-service';
import { setNavigationBlocker } from '../shell';

const DIRTY_LEAVE_MESSAGE =
  'Du hast ungespeicherte Änderungen. Seite wirklich verlassen?';

export type NpcCreatureEditorDraft = {
  name: string;
  description: string;
  kind: NpcCreatureKind;
  category: NpcCreatureCategory;
  level: SagaDriveNpcLevel;
  combatProfile: SagaDriveCombatProfile;
  combatRole: SagaDriveCombatRole;
  tagsText: string;
  notes: string;
  advancedOpen: boolean;
  statOverrides: NpcCreatureStatOverrides;
  combatDetails: NpcCreatureCombatDetails;
  detailExtras: NpcCreatureDetailExtras;
};

function draftFromRecord(record: NpcCreatureCatalogRecord): NpcCreatureEditorDraft {
  const def = record.definition;
  return {
    name: def.name,
    description: def.description,
    kind: def.kind,
    category: def.category,
    level: def.level,
    combatProfile: def.combatProfile,
    combatRole: def.combatRole,
    tagsText: def.tags.join(', '),
    notes: def.notes ?? '',
    advancedOpen: Boolean(def.statOverrides),
    statOverrides: { ...(def.statOverrides ?? {}) },
    combatDetails: { ...(def.combatDetails ?? {}) },
    detailExtras: { ...(def.detailExtras ?? {}) },
  };
}

function serializeDraft(draft: NpcCreatureEditorDraft): string {
  return JSON.stringify(draft);
}

function parseTags(tagsText: string): string[] {
  return tagsText
    .split(/[,;\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function cleanOverrides(overrides: NpcCreatureStatOverrides): NpcCreatureStatOverrides | undefined {
  const next: NpcCreatureStatOverrides = {};
  if (overrides.health !== undefined) next.health = overrides.health;
  if (overrides.defense !== undefined) next.defense = overrides.defense;
  if (overrides.movementMeters !== undefined) next.movementMeters = overrides.movementMeters;
  if (overrides.resistanceHigh !== undefined) next.resistanceHigh = overrides.resistanceHigh;
  if (overrides.resistanceNormal !== undefined) next.resistanceNormal = overrides.resistanceNormal;
  if (overrides.resistanceLow !== undefined) next.resistanceLow = overrides.resistanceLow;
  if (overrides.attributes !== undefined) next.attributes = overrides.attributes;
  return Object.keys(next).length > 0 ? next : undefined;
}

function cleanStringMap(
  value: NpcCreatureCombatDetails | NpcCreatureDetailExtras,
): Record<string, string> | undefined {
  const next: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && entry.trim() !== '') {
      next[key] = entry;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function toWriteDraft(
  draft: NpcCreatureEditorDraft,
  base?: Pick<
    NpcCreatureCatalogRecord['definition'],
    'sheetMode' | 'fullSheet' | 'portraitAssetKey'
  >,
): NpcCreatureDefinitionWriteDraft {
  const combatRole = normalizeCombatRoleForProfile(draft.combatProfile, draft.combatRole);
  const notes = draft.notes.trim();
  const statOverrides = draft.advancedOpen ? cleanOverrides(draft.statOverrides) : undefined;
  const combatDetailsRaw = cleanStringMap(draft.combatDetails);
  const detailExtrasRaw = cleanStringMap(draft.detailExtras);
  const combatDetails = combatDetailsRaw as NpcCreatureCombatDetails | undefined;
  const detailExtras = detailExtrasRaw as NpcCreatureDetailExtras | undefined;
  const sheetMode = base?.sheetMode ?? 'compact';

  return {
    name: draft.name.trim(),
    description: draft.description,
    kind: draft.kind,
    category: draft.category,
    sheetMode,
    level: draft.level,
    combatProfile: draft.combatProfile,
    combatRole,
    tags: parseTags(draft.tagsText),
    ...(notes ? { notes } : {}),
    ...(statOverrides ? { statOverrides } : {}),
    ...(combatDetails ? { combatDetails } : {}),
    ...(detailExtras ? { detailExtras } : {}),
    ...(base?.portraitAssetKey ? { portraitAssetKey: base.portraitAssetKey } : {}),
    ...(sheetMode === 'full' && base?.fullSheet ? { fullSheet: base.fullSheet } : {}),
  };
}

export function previewDefinitionFromDraft(
  definitionId: string,
  scope: NpcCreatureCatalogRecord['definition']['scope'],
  draft: NpcCreatureEditorDraft,
  base?: Pick<
    NpcCreatureCatalogRecord['definition'],
    'sheetMode' | 'fullSheet' | 'portraitAssetKey'
  >,
) {
  return assembleNpcCreatureDefinition(definitionId, scope, toWriteDraft(draft, base));
}

export function useNpcCreatureEditor(definitionId: string | null) {
  const [record, setRecord] = useState<NpcCreatureCatalogRecord | null>(null);
  const [draft, setDraft] = useState<NpcCreatureEditorDraft | null>(null);
  const [baseline, setBaseline] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const loadGen = useRef(0);

  const dirty = Boolean(draft && serializeDraft(draft) !== baseline);

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
    if (!definitionId) {
      setIsLoading(false);
      setLoadError('Keine Figur ausgewählt.');
      return;
    }

    const gen = ++loadGen.current;
    setIsLoading(true);
    setLoadError(null);

    void (async () => {
      try {
        const loaded = await getNpcCreatureDefinition(definitionId);
        if (gen !== loadGen.current) return;
        if (!loaded) {
          setLoadError('Figur wurde nicht gefunden.');
          setRecord(null);
          setDraft(null);
          return;
        }
        const nextDraft = draftFromRecord(loaded);
        setRecord(loaded);
        setDraft(nextDraft);
        setBaseline(serializeDraft(nextDraft));
      } catch (err) {
        console.error('[npc-creature/editor] load failed', err);
        if (gen !== loadGen.current) return;
        setLoadError(
          err instanceof Error ? err.message : 'Figur konnte nicht geladen werden.',
        );
      } finally {
        if (gen === loadGen.current) setIsLoading(false);
      }
    })();
  }, [definitionId]);

  const updateDraft = (patch: Partial<NpcCreatureEditorDraft>) => {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      if (patch.combatProfile === 'noncombat') {
        next.combatRole = 'standard';
      } else if (patch.combatProfile && current.combatProfile === 'noncombat') {
        next.combatRole = current.combatRole === 'standard' ? 'standard' : current.combatRole;
      }
      return next;
    });
    setSaveError(null);
  };

  const save = async (): Promise<boolean> => {
    if (!record || !draft || isSaving) return false;
    const writeDraft = toWriteDraft(draft, record.definition);
    const assembled = assembleNpcCreatureDefinition(
      record.definition.id,
      record.definition.scope,
      writeDraft,
    );
    const validation = validateNpcCreatureDefinition(assembled);
    if (validation.ok === false) {
      const message = validation.errors.join(' ');
      setSaveError(message);
      toast.error(message);
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateNpcCreatureDefinition({
        definitionId: record.definition.id,
        draft: writeDraft,
      });
      const nextDraft = draftFromRecord(updated);
      setRecord(updated);
      setDraft(nextDraft);
      setBaseline(serializeDraft(nextDraft));
      setNavigationBlocker(null);
      toast.success('Statblock gespeichert');
      return true;
    } catch (err) {
      console.error('[npc-creature/editor] save failed', err);
      const message =
        err instanceof Error ? err.message : 'Speichern fehlgeschlagen.';
      setSaveError(message);
      toast.error(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    record,
    draft,
    isLoading,
    isSaving,
    loadError,
    saveError,
    dirty,
    updateDraft,
    save,
    refreshError: loadError,
  };
}
