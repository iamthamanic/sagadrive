/**
 * PersonalItemFormDialog — create/edit/archive Personal item definitions (#110).
 * Type-specific fields follow the issue contract (weapon/armor/shield/tool/
 * consumable/container/misc). Writes go through the catalog service only.
 * Location: src/app/character/inventory/PersonalItemFormDialog.tsx
 */
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import type {
  EquipmentSlot,
  InventoryItemType,
  ItemDefinition,
} from '../../../domains/character/inventory-v2';
import type { ItemDefinitionDraft } from '../../../infrastructure/inventory/item-catalog-service';
import {
  archiveDefinition,
  createPersonalDefinition,
  updateDefinition,
} from '../../../infrastructure/inventory/item-catalog-service';
import {
  INVENTORY_TYPE_LABELS,
  WEAPON_DAMAGE_OPTIONS,
  isInventoryItemType,
  parseItemCost,
  parseItemLoad,
  parseMinimumStrength,
  parseProtection,
} from './inventory-ui-labels';

type MiscEquipChoice = 'none' | 'head' | 'accessory' | 'special';
type WeaponHandling = 'oneHanded' | 'twoHanded';

export interface PersonalItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, dialog edits this Personal definition. */
  editing: ItemDefinition | null;
  onSaved: () => void;
}

function parseTraits(raw: string): string[] {
  return raw
    .split(',')
    .map((trait) => trait.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((trait) => trait.slice(0, 40));
}

function emptyDraft(): {
  name: string;
  description: string;
  type: InventoryItemType;
  load: 0 | 1 | 2 | 3;
  cost: 0 | 1 | 2 | 3 | 4 | 5;
  stackLimit: number;
  damage: string;
  damageType: string;
  handling: WeaponHandling;
  finesse: boolean;
  reichweite: boolean;
  penetration: number;
  protection: 1 | 2 | 3;
  minimumStrength: 1 | 2 | 4;
  traits: string;
  containerCapacity: number;
  miscEquip: MiscEquipChoice;
} {
  return {
    name: '',
    description: '',
    type: 'misc',
    load: 1,
    cost: 1,
    stackLimit: 1,
    damage: 'd8+2',
    damageType: 'Kinetisch',
    handling: 'oneHanded',
    finesse: false,
    reichweite: false,
    penetration: 0,
    protection: 1,
    minimumStrength: 1,
    traits: '',
    containerCapacity: 4,
    miscEquip: 'none',
  };
}

function draftFromDefinition(definition: ItemDefinition) {
  const base = emptyDraft();
  base.name = definition.name;
  base.description = definition.description;
  base.type = definition.type;
  base.load = definition.load;
  base.cost = definition.cost;
  base.stackLimit = definition.stackLimit;
  base.damage = definition.damage ?? 'd8+2';
  base.damageType = definition.damageType ?? 'Kinetisch';
  base.protection = definition.protection ?? 1;
  base.minimumStrength = definition.requirements?.minimumStrength ?? 1;
  base.containerCapacity = definition.containerCapacity ?? 4;
  base.traits = (definition.traits ?? []).join(', ');
  if (definition.twoHanded) base.handling = 'twoHanded';
  const traits = definition.traits ?? [];
  base.finesse = traits.some((t) => t.toLowerCase() === 'finesse');
  base.reichweite = traits.some((t) => t.toLowerCase() === 'reichweite');
  const penet = traits.find((t) => /^durchdringung\s*\d+$/i.test(t));
  if (penet) {
    const n = Number.parseInt(penet.replace(/\D/g, ''), 10);
    if (n >= 0 && n <= 3) base.penetration = n;
  }
  const slots = definition.equipSlots ?? [];
  if (slots.includes('head')) base.miscEquip = 'head';
  else if (slots.includes('accessory1') || slots.includes('accessory2')) base.miscEquip = 'accessory';
  else if (slots.includes('special')) base.miscEquip = 'special';
  return base;
}

function buildDraftPayload(form: ReturnType<typeof emptyDraft>): ItemDefinitionDraft | string {
  const name = form.name.trim();
  if (name.length < 1 || name.length > 80) return 'Name muss 1–80 Zeichen haben.';
  const description = form.description.trim().slice(0, 500);
  if (!Number.isInteger(form.stackLimit) || form.stackLimit < 1 || form.stackLimit > 99) {
    return 'Stacklimit muss 1–99 sein.';
  }

  const draft: ItemDefinitionDraft = {
    name,
    description,
    type: form.type,
    load: form.load,
    cost: form.cost,
    stackLimit: form.type === 'container' ? 1 : form.stackLimit,
  };

  if (form.type === 'weapon') {
    const damageType = form.damageType.trim().slice(0, 40) || 'Kinetisch';
    if (damageType.length < 1) return 'Schadensart ist erforderlich.';
    const traits: string[] = [];
    if (form.finesse) traits.push('Finesse');
    if (form.reichweite) traits.push('Reichweite');
    if (form.penetration > 0) traits.push(`Durchdringung ${form.penetration}`);
    draft.damage = form.damage;
    draft.damageType = damageType;
    draft.traits = traits;
    draft.twoHanded = form.handling === 'twoHanded';
    draft.equipSlots =
      form.handling === 'twoHanded'
        ? (['mainHand', 'offHand'] as EquipmentSlot[])
        : (['mainHand', 'offHand'] as EquipmentSlot[]);
  }

  if (form.type === 'armor') {
    draft.protection = form.protection;
    draft.requirements = { minimumStrength: form.minimumStrength };
    draft.equipSlots = ['body'];
  }

  if (form.type === 'shield') {
    draft.traits = ['+1 Verteidigung', '1 Hand'];
    draft.equipSlots = ['mainHand', 'offHand'];
  }

  if (form.type === 'tool') {
    const traits = parseTraits(form.traits);
    if (traits.length > 0) draft.traits = traits;
  }

  if (form.type === 'container') {
    if (
      !Number.isInteger(form.containerCapacity) ||
      form.containerCapacity < 1 ||
      form.containerCapacity > 20
    ) {
      return 'Kapazität muss 1–20 sein.';
    }
    draft.containerCapacity = form.containerCapacity;
    draft.stackLimit = 1;
  }

  if (form.type === 'misc') {
    const traits = parseTraits(form.traits);
    if (traits.length > 0) draft.traits = traits;
    if (form.miscEquip === 'head') draft.equipSlots = ['head'];
    if (form.miscEquip === 'accessory') draft.equipSlots = ['accessory1', 'accessory2'];
    if (form.miscEquip === 'special') draft.equipSlots = ['special'];
  }

  return draft;
}

export function PersonalItemFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: PersonalItemFormDialogProps) {
  const [form, setForm] = useState(emptyDraft);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(editing ? draftFromDefinition(editing) : emptyDraft());
  }, [open, editing]);

  const handleSave = async () => {
    const payload = buildDraftPayload(form);
    if (typeof payload === 'string') {
      setError(payload);
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateDefinition(editing.id, payload);
      } else {
        await createPersonalDefinition(payload);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('[inventory] personal definition save failed', err);
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await archiveDefinition(editing.id);
      setArchiveOpen(false);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('[inventory] personal definition archive failed', err);
      setError(err instanceof Error ? err.message : 'Archivieren fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Eigenen Gegenstand bearbeiten' : 'Eigenen Gegenstand erstellen'}
            </DialogTitle>
            <DialogDescription>
              Persönliche Definitionen gelten für deinen Account. Besessene Instanzen behalten die
              Definition auch nach dem Archivieren.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="personal-name">Name *</Label>
              <Input
                id="personal-name"
                value={form.name}
                maxLength={80}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal-type">Typ *</Label>
              <Select
                value={form.type}
                onValueChange={(value) => {
                  if (isInventoryItemType(value)) {
                    setForm({
                      ...form,
                      type: value,
                      stackLimit: value === 'container' ? 1 : form.stackLimit,
                    });
                  }
                }}
              >
                <SelectTrigger id="personal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INVENTORY_TYPE_LABELS) as InventoryItemType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {INVENTORY_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal-description">Beschreibung</Label>
              <Textarea
                id="personal-description"
                rows={3}
                maxLength={500}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="personal-load">Last *</Label>
                <Select
                  value={String(form.load)}
                  onValueChange={(value) => setForm({ ...form, load: parseItemLoad(value) })}
                >
                  <SelectTrigger id="personal-load">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personal-cost">Kosten *</Label>
                <Select
                  value={String(form.cost)}
                  onValueChange={(value) => setForm({ ...form, cost: parseItemCost(value) })}
                >
                  <SelectTrigger id="personal-cost">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="personal-stack">Stacklimit *</Label>
                <Input
                  id="personal-stack"
                  type="number"
                  min={1}
                  max={99}
                  disabled={form.type === 'container'}
                  value={form.type === 'container' ? 1 : form.stackLimit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      stackLimit: Math.min(99, Math.max(1, Number.parseInt(event.target.value, 10) || 1)),
                    })
                  }
                />
              </div>
            </div>

            {form.type === 'weapon' && (
              <div className="space-y-3 rounded-lg border border-border bg-muted/15 p-4">
                <p className="font-medium">Waffe</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Schaden *</Label>
                    <Select
                      value={form.damage}
                      onValueChange={(value) => setForm({ ...form, damage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEAPON_DAMAGE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personal-damage-type">Schadensart *</Label>
                    <Input
                      id="personal-damage-type"
                      maxLength={40}
                      value={form.damageType}
                      onChange={(event) => setForm({ ...form, damageType: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Handhabung *</Label>
                    <Select
                      value={form.handling}
                      onValueChange={(value) =>
                        setForm({
                          ...form,
                          handling: value === 'twoHanded' ? 'twoHanded' : 'oneHanded',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oneHanded">Einhändig</SelectItem>
                        <SelectItem value="twoHanded">Zweihändig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.finesse}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, finesse: checked === true })
                      }
                    />
                    Finesse
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.reichweite}
                      onCheckedChange={(checked) =>
                        setForm({ ...form, reichweite: checked === true })
                      }
                    />
                    Reichweite
                  </label>
                </div>
                <div className="space-y-2">
                  <Label>Durchdringung (0–3)</Label>
                  <Select
                    value={String(form.penetration)}
                    onValueChange={(value) =>
                      setForm({
                        ...form,
                        penetration: Math.min(3, Math.max(0, Number.parseInt(value, 10) || 0)),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3].map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value === 0 ? 'Keine' : value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {form.type === 'armor' && (
              <div className="grid gap-4 rounded-lg border border-border bg-muted/15 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Schutz *</Label>
                  <Select
                    value={String(form.protection)}
                    onValueChange={(value) =>
                      setForm({ ...form, protection: parseProtection(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3].map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mindeststärke *</Label>
                  <Select
                    value={String(form.minimumStrength)}
                    onValueChange={(value) =>
                      setForm({ ...form, minimumStrength: parseMinimumStrength(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 4].map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Ausrüstungsslot ist fest auf Körper (body).
                </p>
              </div>
            )}

            {form.type === 'shield' && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                Schild: +1 Verteidigung, 1 Hand. Kein eigenes Schutzfeld.
              </div>
            )}

            {(form.type === 'tool' || form.type === 'misc') && (
              <div className="space-y-2">
                <Label htmlFor="personal-traits">Merkmale (Komma-getrennt)</Label>
                <Input
                  id="personal-traits"
                  value={form.traits}
                  onChange={(event) => setForm({ ...form, traits: event.target.value })}
                  placeholder="max. 8, je 40 Zeichen"
                />
              </div>
            )}

            {form.type === 'container' && (
              <div className="space-y-2">
                <Label htmlFor="personal-capacity">Kapazität *</Label>
                <Input
                  id="personal-capacity"
                  type="number"
                  min={1}
                  max={20}
                  value={form.containerCapacity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      containerCapacity: Math.min(
                        20,
                        Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                      ),
                    })
                  }
                />
              </div>
            )}

            {form.type === 'misc' && (
              <div className="space-y-2">
                <Label>Ausrüstung</Label>
                <Select
                  value={form.miscEquip}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      miscEquip: value as MiscEquipChoice,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nicht ausrüstbar</SelectItem>
                    <SelectItem value="head">Kopf</SelectItem>
                    <SelectItem value="accessory">Accessoire</SelectItem>
                    <SelectItem value="special">Spezial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {editing ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => setArchiveOpen(true)}
              >
                Archivieren
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Definition archivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Bestehende besessene Gegenstände bleiben erhalten und auflösbar. Die Definition
              verschwindet aus dem Katalog „Gegenstand hinzufügen“.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchive()}>Archivieren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
