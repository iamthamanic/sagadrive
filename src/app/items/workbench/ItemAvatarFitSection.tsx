/**
 * ItemAvatarFitSection — Workbench “Am Avatar ausrichten” controls (#160).
 * Location: src/app/items/workbench/ItemAvatarFitSection.tsx
 *
 * Edits #158 binding draft fields only; no Blender-style editor.
 */

import {
  SAGA_DRIVE_HUMANOID_ANCHORS,
  clampEquipmentTransform,
  defaultRigidFitTransform,
  resolveWorkbenchDefaultAnchor,
  type AvatarEquipmentLocalTransform,
  type SagaDriveHumanoidAnchorId,
} from '../../../domains/character/avatar';
import type { InventoryItemType } from '../../../domains/character/inventory-v2';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Label } from '../../../shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../shared/ui/select';

export interface ItemAvatarFitDraft {
  anchor: SagaDriveHumanoidAnchorId;
  transform: AvatarEquipmentLocalTransform;
  dirty: boolean;
  status: 'idle' | 'no-3d' | 'ready' | 'needs-review' | 'incompatible';
  messageDe?: string;
}

interface ItemAvatarFitSectionProps {
  itemType: InventoryItemType;
  miscEquip: 'none' | 'head' | 'accessory' | 'special' | 'feet';
  hasModel3d: boolean;
  readOnly: boolean;
  draft: ItemAvatarFitDraft;
  onChange: (next: ItemAvatarFitDraft) => void;
}

const ANCHOR_LABEL: Record<SagaDriveHumanoidAnchorId, string> = {
  head: 'Kopf',
  chest: 'Brust',
  back: 'Rücken',
  hips: 'Hüfte',
  leftHand: 'Linke Hand',
  rightHand: 'Rechte Hand',
  leftFoot: 'Linker Fuß',
  rightFoot: 'Rechter Fuß',
};

export function createDefaultItemAvatarFitDraft(input: {
  type: InventoryItemType;
  miscEquip: 'none' | 'head' | 'accessory' | 'special' | 'feet';
  hasModel3d: boolean;
}): ItemAvatarFitDraft {
  if (!input.hasModel3d) {
    return {
      anchor: resolveWorkbenchDefaultAnchor(input),
      transform: defaultRigidFitTransform(),
      dirty: false,
      status: 'no-3d',
      messageDe: 'Kein 3D-Modell — Ausrichtung deaktiviert. Item bleibt speicherbar.',
    };
  }
  return {
    anchor: resolveWorkbenchDefaultAnchor(input),
    transform: defaultRigidFitTransform(),
    dirty: false,
    status: 'ready',
    messageDe: 'Standard-Ausrichtung bereit. Bei Bedarf Anchor/Transform anpassen.',
  };
}

export function ItemAvatarFitSection({
  itemType,
  miscEquip,
  hasModel3d,
  readOnly,
  draft,
  onChange,
}: ItemAvatarFitSectionProps) {
  const disabled = readOnly || !hasModel3d;

  const setTransform = (partial: Partial<AvatarEquipmentLocalTransform>) => {
    const next = clampEquipmentTransform({
      position: partial.position ?? draft.transform.position,
      rotationEuler: partial.rotationEuler ?? draft.transform.rotationEuler,
      scale: partial.scale ?? draft.transform.scale,
    });
    onChange({
      ...draft,
      transform: next,
      dirty: true,
      status: hasModel3d ? 'ready' : 'no-3d',
    });
  };

  const reset = () => {
    onChange(
      createDefaultItemAvatarFitDraft({
        type: itemType,
        miscEquip,
        hasModel3d,
      }),
    );
  };

  return (
    <section
      className="space-y-3 rounded-lg border border-border p-3"
      aria-label="Avatar Ausrichtung"
      data-item-avatar-fit-section
      data-fit-status={draft.status}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Avatar / Ausrichtung</h3>
          <p className="text-xs text-muted-foreground">
            Starres Item an SagaDrive-Anker ausrichten (kein freier Bone-Editor).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={reset}>
          Zurücksetzen
        </Button>
      </div>

      {draft.messageDe ? (
        <p className="text-xs text-muted-foreground" data-fit-message>
          {draft.messageDe}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="avatar-fit-anchor">Anker</Label>
          <Select
            value={draft.anchor}
            disabled={disabled}
            onValueChange={(value) =>
              onChange({
                ...draft,
                anchor: value as SagaDriveHumanoidAnchorId,
                dirty: true,
                status: hasModel3d ? 'ready' : 'no-3d',
              })
            }
          >
            <SelectTrigger id="avatar-fit-anchor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAGA_DRIVE_HUMANOID_ANCHORS.map((anchor) => (
                <SelectItem key={anchor} value={anchor}>
                  {ANCHOR_LABEL[anchor]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="avatar-fit-scale">Scale (uniform)</Label>
          <Input
            id="avatar-fit-scale"
            type="number"
            step="0.05"
            min={0.05}
            max={5}
            disabled={disabled}
            value={draft.transform.scale[0]}
            onChange={(event) => {
              const s = Number(event.target.value);
              setTransform({ scale: [s, s, s] });
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <div key={`pos-${axis}`} className="space-y-1">
            <Label htmlFor={`avatar-fit-pos-${axis}`}>Pos {axis}</Label>
            <Input
              id={`avatar-fit-pos-${axis}`}
              type="number"
              step="0.01"
              disabled={disabled}
              value={draft.transform.position[index]}
              onChange={(event) => {
                const next = [...draft.transform.position] as [number, number, number];
                next[index] = Number(event.target.value);
                setTransform({ position: next });
              }}
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['X', 'Y', 'Z'] as const).map((axis, index) => (
          <div key={`rot-${axis}`} className="space-y-1">
            <Label htmlFor={`avatar-fit-rot-${axis}`}>Rot {axis}</Label>
            <Input
              id={`avatar-fit-rot-${axis}`}
              type="number"
              step="0.05"
              disabled={disabled}
              value={draft.transform.rotationEuler[index]}
              onChange={(event) => {
                const next = [...draft.transform.rotationEuler] as [number, number, number];
                next[index] = Number(event.target.value);
                setTransform({ rotationEuler: next });
              }}
            />
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Live-Preview nutzt #159 Rigid-Runtime gegen den gewählten Anker. Speichern schreibt #158 Binding.
      </p>
    </section>
  );
}
