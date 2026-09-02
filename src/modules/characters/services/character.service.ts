/**
 * character.service — compatibility barrel; canonical split under domains + infrastructure.
 * Location: src/modules/characters/services/character.service.ts
 */
export { characterService } from '../../../infrastructure/character/character-service';
export {
  normalizeAttributes,
  normalizeSkills,
  normalizeSagaDriveProfile,
  normalizeInventory,
  normalizeBackgroundTemplateId,
  normalizeSpeciesTraitInstances,
  normalizeSpeciesProfile,
  normalizeOptionalBaseAttributes,
  normalizeSagaDriveAttributeAdvances,
  isValidSagaDriveAttributeBuild,
} from '../../../domains/character/use-cases/normalize-character';
export { assertValidSagaDriveAttributePersistence } from '../../../domains/character/use-cases/assert-character-persistence';
export { supabaseCharacterRepository } from '../../../infrastructure/character/supabase-character.repository';
