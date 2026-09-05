/**
 * item-catalog.persistence — row shapes and mapping for Inventory v2 catalog
 * definitions (#107). The DTO mirrors `public.inventory_item_definitions`
 * from migration 015.
 * Location: src/infrastructure/inventory/item-catalog.persistence.ts
 */
import { parseItemDefinition } from '../../domains/character/inventory-v2';
import type {
  CatalogDefinitionRecord,
  CatalogDefinitionStatus,
  ItemDefinition,
} from '../../domains/character/inventory-v2';

/** Scopes that are persisted. `core` ships with the repository and is never a row. */
export type PersistedDefinitionScope = 'world' | 'personal';

/** Row shape of `public.inventory_item_definitions`. */
export interface ItemDefinitionDto {
  id: string;
  scope: PersistedDefinitionScope;
  world_profile_id: string | null;
  owner_user_id: string;
  payload: unknown;
  status: CatalogDefinitionStatus;
  created_at: string;
  updated_at: string;
}

/** Columns every catalog read selects. */
export const ITEM_DEFINITION_COLUMNS =
  'id, scope, world_profile_id, owner_user_id, payload, status, created_at, updated_at';

/**
 * Map a row to a catalog record.
 *
 * Returns `null` for a row whose payload cannot be read as a valid definition,
 * so a single corrupt entry degrades to "one missing item" instead of failing
 * the whole catalog query. Identity and ownership come from the columns — the
 * payload is never allowed to declare its own id or scope.
 */
export function mapDefinitionRow(dto: ItemDefinitionDto): CatalogDefinitionRecord | null {
  const definition = parseItemDefinition(dto.id, dto.scope, dto.payload);
  if (!definition) return null;
  return {
    definition,
    status: dto.status === 'archived' ? 'archived' : 'active',
    worldProfileId: dto.world_profile_id,
    ownerUserId: dto.owner_user_id,
  };
}

/**
 * Payload column for a definition: everything except the identity columns.
 *
 * `id` and `scope` are stored as columns and re-applied on read, so keeping a
 * second copy inside the payload would let the two drift apart.
 */
export function toDefinitionPayload(definition: ItemDefinition): Record<string, unknown> {
  const { id: _id, scope: _scope, ...payload } = definition;
  return payload;
}
