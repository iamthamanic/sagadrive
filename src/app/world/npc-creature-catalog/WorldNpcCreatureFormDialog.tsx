/**
 * WorldNpcCreatureFormDialog — compact create/edit for world-scoped NPC/creature
 * definitions inside the world editor (#199). Reuses domain assemble/validate.
 * Location: src/app/world/npc-creature-catalog/WorldNpcCreatureFormDialog.tsx
 */
import { useEffect, useState } from 'react';
import {
  assembleNpcCreatureDefinition,
  NPC_CREATURE_CATEGORIES,
  validateNpcCreatureDefinition,
  type NpcCreatureCatalogRecord,
  type NpcCreatureCategory,
  type NpcCreatureDefinition,
  type NpcCreatureDefinitionWriteDraft,
  type NpcCreatureKind,
} from '../../../domains/npc-creature';
import {
  normalizeCombatRoleForProfile,
  type SagaDriveCombatProfile,
  type SagaDriveCombatRole,
  type SagaDriveNpcLevel,
} from '../../../domains/rules/sagadrive/npc-creature-power';
import {
  createNpcCreatureDefinition,
  updateNpcCreatureDefinition,
} from '../../../infrastructure/npc-creature/npc-creature-service';
import {
  NPC_COMBAT_PROFILE_LABELS,
  NPC_COMBAT_ROLE_LABELS,
  NPC_CREATURE_CATEGORY_LABELS,
} from '../../library';
import { Button } from '../../../shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/ui/dialog';
import { Input } from '../../../shared/ui/input';
import { Label } from '../../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select';
import { Textarea } from '../../../shared/ui/textarea';

const COMBAT_PROFILES: readonly SagaDriveCombatProfile[] = [
  'noncombat',
  'balanced',
  'tough',
  'offensive',
  'mobile',
  'ranged',
  'control_support',
];

const COMBAT_ROLES: readonly SagaDriveCombatRole[] = ['standard', 'elite', 'boss'];
const LEVELS = Array.from({ length: 20 }, (_, index) => (index + 1) as SagaDriveNpcLevel);

export interface WorldNpcCreatureFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldProfileId: string;
  editing: NpcCreatureCatalogRecord | null;
  template: NpcCreatureDefinition | null;
  onSaved: () => void;
}

function draftFromDefinition(definition: NpcCreatureDefinition): NpcCreatureDefinitionWriteDraft {
  return {
    name: definition.name,
    description: definition.description,
    kind: definition.kind,
    category: definition.category,
    sheetMode: definition.sheetMode,
    level: definition.level,
    combatProfile: definition.combatProfile,
    combatRole: definition.combatRole,
    tags: [...definition.tags],
    notes: definition.notes,
    portraitAssetKey: definition.portraitAssetKey,
    statOverrides: definition.statOverrides,
    combatDetails: definition.combatDetails,
    detailExtras: definition.detailExtras,
    fullSheet: definition.fullSheet,
  };
}

export function WorldNpcCreatureFormDialog({
  open,
  onOpenChange,
  worldProfileId,
  editing,
  template,
  onSaved,
}: WorldNpcCreatureFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<NpcCreatureKind>('npc');
  const [category, setCategory] = useState<NpcCreatureCategory>('npc');
  const [level, setLevel] = useState<SagaDriveNpcLevel>(1);
  const [combatProfile, setCombatProfile] = useState<SagaDriveCombatProfile>('balanced');
  const [combatRole, setCombatRole] = useState<SagaDriveCombatRole>('standard');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const source = editing?.definition ?? template;
    if (source) {
      const draft = draftFromDefinition(source);
      setName(draft.name);
      setDescription(draft.description);
      setKind(draft.kind);
      setCategory(draft.category);
      setLevel(draft.level);
      setCombatProfile(draft.combatProfile);
      setCombatRole(draft.combatRole);
    } else {
      setName('');
      setDescription('');
      setKind('npc');
      setCategory('npc');
      setLevel(1);
      setCombatProfile('balanced');
      setCombatRole('standard');
    }
    setFormError(null);
  }, [open, editing, template]);

  useEffect(() => {
    if (combatProfile === 'noncombat') {
      setCombatRole('standard');
    }
  }, [combatProfile]);

  const handleSave = async () => {
    setFormError(null);
    const role = normalizeCombatRoleForProfile(combatProfile, combatRole);
    const draft: NpcCreatureDefinitionWriteDraft = {
      name: name.trim(),
      description: description.trim(),
      kind,
      category,
      sheetMode: 'compact',
      level,
      combatProfile,
      combatRole: role,
      tags: [],
    };

    const candidate = assembleNpcCreatureDefinition(
      editing?.definition.id ?? 'world:preview',
      'world',
      draft,
    );
    const validation = validateNpcCreatureDefinition(candidate);
    if (validation.ok === false) {
      setFormError(validation.errors[0] ?? 'Ungültige Eingabe.');
      return;
    }

    setIsSaving(true);
    try {
      if (editing) {
        await updateNpcCreatureDefinition({
          definitionId: editing.definition.id,
          draft,
        });
      } else {
        await createNpcCreatureDefinition({
          target: { scope: 'world', worldProfileId },
          draft,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('[worlds] npc-creature world save failed', err);
      setFormError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Welt-Figur bearbeiten' : 'Welt-Figur erstellen'}
          </DialogTitle>
          <DialogDescription>
            Die Definition gehört zu dieser Welt und wird im Katalog referenziert — nicht in
            Module-Daten eingebettet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="world-npc-name">Name *</Label>
            <Input
              id="world-npc-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Stadtgardist"
              className="min-h-11"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="world-npc-kind">Art</Label>
              <Select
                value={kind}
                onValueChange={(value) => {
                  const next = value as NpcCreatureKind;
                  setKind(next);
                  setCategory(next === 'npc' ? 'npc' : 'kreatur');
                }}
              >
                <SelectTrigger id="world-npc-kind" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="npc">NPC</SelectItem>
                  <SelectItem value="creature">Kreatur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="world-npc-category">Kategorie</Label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as NpcCreatureCategory)}
              >
                <SelectTrigger id="world-npc-category" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NPC_CREATURE_CATEGORIES.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {NPC_CREATURE_CATEGORY_LABELS[entry]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="world-npc-level">Stufe</Label>
              <Select
                value={String(level)}
                onValueChange={(value) => setLevel(Number(value) as SagaDriveNpcLevel)}
              >
                <SelectTrigger id="world-npc-level" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((entry) => (
                    <SelectItem key={entry} value={String(entry)}>
                      {entry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="world-npc-profile">Kampfprofil</Label>
              <Select
                value={combatProfile}
                onValueChange={(value) => setCombatProfile(value as SagaDriveCombatProfile)}
              >
                <SelectTrigger id="world-npc-profile" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMBAT_PROFILES.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {NPC_COMBAT_PROFILE_LABELS[entry]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {combatProfile !== 'noncombat' && (
            <div className="space-y-2">
              <Label htmlFor="world-npc-role">Kampfrolle</Label>
              <Select
                value={combatRole}
                onValueChange={(value) => setCombatRole(value as SagaDriveCombatRole)}
              >
                <SelectTrigger id="world-npc-role" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMBAT_ROLES.map((entry) => (
                    <SelectItem key={entry} value={entry}>
                      {NPC_COMBAT_ROLE_LABELS[entry]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="world-npc-description">Beschreibung</Label>
            <Textarea
              id="world-npc-description"
              value={description}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Kurzbeschreibung für die Welt"
            />
          </div>

          {formError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button type="button" disabled={isSaving || !name.trim()} onClick={() => void handleSave()}>
            {isSaving ? 'Speichert…' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
