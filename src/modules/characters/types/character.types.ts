/**
 * character.types — compatibility barrel re-exporting domain + persistence contracts.
 * Location: src/modules/characters/types/character.types.ts
 */
export type { CharacterLoreContext } from '../lore/types';
export * from '../../../domains/character/domain/character.entity';
export * from '../../../domains/character/domain/sagadrive-profile.entity';
export * from '../../../domains/character/contracts/character.commands';
export * from '../../../domains/character/contracts/character.views';
export type { CharacterDto } from '../../../infrastructure/character/character.persistence';
