import {
  isSagaDriveSpeciesTraitOptionKeyForTrait,
  sagaDriveNarrowResistanceHazardOptions,
  type SagaDriveSpeciesTraitOption,
  type SagaDriveSpeciesTraitOptionKey,
} from './speciesTraitOptions';

export { sagaDriveNarrowResistanceHazardOptions };
export type SagaDriveNarrowResistanceHazardOption = SagaDriveSpeciesTraitOption;
export type SagaDriveNarrowResistanceHazardKey = SagaDriveSpeciesTraitOptionKey;

export function isSagaDriveNarrowResistanceHazardKey(value: string): value is SagaDriveNarrowResistanceHazardKey {
  return isSagaDriveSpeciesTraitOptionKeyForTrait('narrow-resistance', value);
}
