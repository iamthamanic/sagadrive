/**
 * LiveInventoryControls — Mobile-friendly inventory actions for Live Session (#372).
 * Location: src/app/session/LiveInventoryControls.tsx
 *
 * Buttons only (no drag-required). Uses Inventory V2 via useLiveInventory.
 */
import { useState } from 'react';
import { Button } from '../../shared/ui/button';
import { Input } from '../../shared/ui/input';
import { Label } from '../../shared/ui/label';
import type { EquipmentSlot } from '../../domains/character/inventory-v2';
import type { LiveSessionAccess } from '../../domains/session/contracts/live-session-access';
import { useLiveInventory } from './hooks/useLiveInventory';

type LiveInventoryControlsProps = {
  sessionId: string | null;
  access: LiveSessionAccess | null;
  boundCharacterId: string | null;
  characterId: string | null;
};

export function LiveInventoryControls({
  sessionId,
  access,
  boundCharacterId,
  characterId,
}: LiveInventoryControlsProps) {
  const inventory = useLiveInventory({ sessionId, access, boundCharacterId });
  const [instanceId, setInstanceId] = useState('');
  const [slot, setSlot] = useState<EquipmentSlot>('mainHand');
  const [message, setMessage] = useState<string | null>(null);

  if (!characterId) {
    return (
      <p className="text-xs text-muted-foreground" data-live-inventory-controls="empty">
        Kein Charakter für Inventory-Aktionen.
      </p>
    );
  }

  return (
    <div className="space-y-2" data-live-inventory-controls="v1">
      <p className="text-xs text-muted-foreground">
        Live Inventory (V2) — Equip / Consume / Unequip ohne Drag-and-Drop.
      </p>
      <div className="space-y-1">
        <Label htmlFor="live-inv-instance" className="text-xs">
          Instance ID
        </Label>
        <Input
          id="live-inv-instance"
          className="min-h-11"
          value={instanceId}
          onChange={(e) => setInstanceId(e.target.value)}
          placeholder="item instance id"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11"
          disabled={inventory.isBusy || !instanceId}
          onClick={() => {
            void (async () => {
              const ok = await inventory.run({
                op: 'equip',
                characterId,
                instanceId,
                equipmentSlot: slot,
              });
              setMessage(ok ? 'Ausgerüstet' : inventory.error);
            })();
          }}
        >
          Equip
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={inventory.isBusy}
          onClick={() => {
            void (async () => {
              const ok = await inventory.run({
                op: 'unequip',
                characterId,
                equipmentSlot: slot,
              });
              setMessage(ok ? 'Abgelegt' : inventory.error);
            })();
          }}
        >
          Unequip
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={inventory.isBusy || !instanceId}
          onClick={() => {
            void (async () => {
              const ok = await inventory.run({
                op: 'consume',
                characterId,
                instanceId,
              });
              setMessage(ok ? 'Verbraucht' : inventory.error);
            })();
          }}
        >
          Consume
        </Button>
      </div>
      <div className="space-y-1">
        <Label htmlFor="live-inv-slot" className="text-xs">
          Slot
        </Label>
        <select
          id="live-inv-slot"
          className="select select-bordered select-sm min-h-11 w-full"
          value={slot}
          onChange={(e) => setSlot(e.target.value as EquipmentSlot)}
        >
          {(
            [
              'mainHand',
              'offHand',
              'head',
              'body',
              'feet',
              'accessory1',
              'accessory2',
              'special',
            ] as const
          ).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
      {inventory.error ? (
        <p className="text-xs text-destructive" role="alert">
          {inventory.error}
        </p>
      ) : null}
    </div>
  );
}
