/**
 * useCharacterInventoryEditor — Inventory v2 + abstract resources cluster for CharacterEditor (#324).
 * Location: src/app/character/edit/useCharacterInventoryEditor.ts
 *
 * Behavior-neutral extract of the inventory cluster from CharacterEditor (NPC-editor pattern).
 * CharacterEditor remains the composition root and owns save/load/bootstrap orchestration.
 */
import { useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner@2.0.3';
import type { ItemDto } from '../../../domains/character';
import {
  createEmptyInventory,
  migrateLegacyInventory,
  type InventoryState,
} from '../../../domains/character/inventory-v2';
import {
  createDefaultAbstractResources,
  type AbstractResourceLevel,
  type CharacterAbstractResources,
} from '../../../domains/rules/sagadrive/items';
import type { InventoryLoadInfo } from '../progression';
import { characterService } from '../../../infrastructure/character/character-service';

export type CharacterInventoryHydrationInput = {
  inventory?: ItemDto[];
  inventoryV2?: InventoryState;
  abstractResources?: CharacterAbstractResources;
};

export type CharacterInventoryEditor = {
  inventory: ItemDto[];
  inventoryV2: InventoryState;
  abstractResources: CharacterAbstractResources;
  inventoryLoadInfo: InventoryLoadInfo;
  inventoryLoad: number;
  setInventory: Dispatch<SetStateAction<ItemDto[]>>;
  setInventoryV2: Dispatch<SetStateAction<InventoryState>>;
  setAbstractResources: Dispatch<SetStateAction<CharacterAbstractResources>>;
  setInventoryLoadInfo: Dispatch<SetStateAction<InventoryLoadInfo>>;
  handleInventoryChange: (next: InventoryState) => void;
  handleResourcesChange: (next: AbstractResourceLevel) => void;
  hydrateInventory: (payload: CharacterInventoryHydrationInput) => void;
};

export function useCharacterInventoryEditor(options: {
  onDirty: () => void;
}): CharacterInventoryEditor {
  const { onDirty } = options;
  const [inventory, setInventory] = useState<ItemDto[]>([]);
  const [inventoryV2, setInventoryV2] = useState<InventoryState>(() => createEmptyInventory());
  const [abstractResources, setAbstractResources] = useState<CharacterAbstractResources>(() =>
    createDefaultAbstractResources(),
  );
  const [inventoryLoadInfo, setInventoryLoadInfo] = useState<InventoryLoadInfo>({
    totalLoad: 0,
    occupied: 0,
  });

  const inventoryLoad = inventoryLoadInfo.totalLoad;

  const handleInventoryChange = (next: InventoryState) => {
    setInventoryV2(next);
    onDirty();
  };

  const handleResourcesChange = (next: AbstractResourceLevel) => {
    setAbstractResources((prev) => ({ ...prev, current: next }));
    onDirty();
  };

  const hydrateInventory = (payload: CharacterInventoryHydrationInput) => {
    setInventory(payload.inventory ?? []);
    if (payload.inventoryV2) {
      setInventoryV2(payload.inventoryV2);
    } else if (payload.inventory && payload.inventory.length > 0) {
      setInventoryV2(migrateLegacyInventory(payload.inventory).state);
    } else {
      setInventoryV2(createEmptyInventory());
    }
    setAbstractResources(payload.abstractResources ?? createDefaultAbstractResources());
  };

  return {
    inventory,
    inventoryV2,
    abstractResources,
    inventoryLoadInfo,
    inventoryLoad,
    setInventory,
    setInventoryV2,
    setAbstractResources,
    setInventoryLoadInfo,
    handleInventoryChange,
    handleResourcesChange,
    hydrateInventory,
  };
}

/**
 * Resolve the inventoryV2 state used when loading a persisted character into the editor.
 * Triggers the legacy → v2 migration via character-service when the stored character
 * still carries inventorySchemaVersion 1; falls back to the persisted state on failure.
 */
export async function resolveLoadedInventoryV2(character: {
  id: string | null;
  inventoryV2: InventoryState;
  inventorySchemaVersion: 1 | 2;
}): Promise<InventoryState> {
  let inventoryV2State = character.inventoryV2;
  if (character.inventorySchemaVersion !== 2 && character.id) {
    try {
      inventoryV2State = await characterService.migrateCharacterInventoryToV2(character.id);
    } catch (migrationError) {
      console.error('Inventory v2 migration failed:', migrationError);
      toast.error(
        migrationError instanceof Error
          ? migrationError.message
          : 'Inventar-Migration fehlgeschlagen — Fallback auf geladenen Zustand.',
      );
      inventoryV2State = character.inventoryV2;
    }
  }
  return inventoryV2State;
}
