/**
 * useLiveInventory — Apply Inventory V2 ops in session context (#372).
 * Location: src/app/session/hooks/useLiveInventory.ts
 *
 * Membership-gated; persists via characterService; audits via gameplay event.
 */
import { useState } from 'react';
import type { ItemDefinition } from '../../../domains/character/inventory-v2';
import { getCoreItemDefinition } from '../../../domains/character/inventory-v2';
import {
  applyLiveInventoryCommand,
  assertLiveInventoryAccess,
  parseLiveInventoryCommand,
  type LiveInventoryCommand,
} from '../../../domains/session/contracts/live-inventory-lifecycle';
import type { LiveSessionAccess } from '../../../domains/session/contracts/live-session-access';
import { characterService } from '../../../infrastructure/character/character-service';
import { useSessionRuntime } from './useSessionRuntime';

export function useLiveInventory(input: {
  sessionId: string | null;
  access: LiveSessionAccess | null;
  boundCharacterId: string | null;
}) {
  const runtime = useSessionRuntime(input.sessionId);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (raw: LiveInventoryCommand, definition?: ItemDefinition | null) => {
    if (!input.access) {
      setError('Kein Session-Access');
      return false;
    }
    setIsBusy(true);
    setError(null);
    try {
      const command = parseLiveInventoryCommand(raw);
      assertLiveInventoryAccess(input.access, command, input.boundCharacterId);
      const source = await characterService.getCharacterById(command.characterId);
      const target =
        command.targetCharacterId
          ? await characterService.getCharacterById(command.targetCharacterId)
          : null;
      let resolvedDefinition = definition ?? null;
      if (!resolvedDefinition && command.instanceId) {
        const inst = source.inventoryV2.instances[command.instanceId];
        if (inst) {
          resolvedDefinition = getCoreItemDefinition(inst.definitionId) ?? null;
        }
      }
      if (!resolvedDefinition && command.definitionId) {
        resolvedDefinition = getCoreItemDefinition(command.definitionId) ?? null;
      }
      const applied = applyLiveInventoryCommand({
        command,
        sourceState: source.inventoryV2,
        targetState: target?.inventoryV2 ?? null,
        definition: resolvedDefinition,
        characterStrength: source.attributes?.strength ?? 10,
      });
      if (applied.ok === false) {
        setError(applied.reason);
        return false;
      }
      await characterService.updateCharacter(command.characterId, {
        inventory_v2: applied.sourceState,
      });
      if (applied.targetState && command.targetCharacterId) {
        await characterService.updateCharacter(command.targetCharacterId, {
          inventory_v2: applied.targetState,
        });
      }
      if (input.sessionId) {
        await runtime.applyCommand({
          kind: 'gameplay',
          payload: {
            inventoryEvent: applied.eventPayload,
          },
          idempotencyKey: `inv:${command.op}:${command.characterId}:${Date.now()}`,
        });
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inventory-Aktion fehlgeschlagen');
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  return { run, isBusy, error, resync: runtime.resync };
}
