/**
 * map-derived-stat-cards — Maps rules kernel derived stats to UI card props.
 * Location: src/app/character/edit/map-derived-stat-cards.ts
 */
import type { DerivedStatCardProps } from '../../../components/DerivedStatCard';
import {
  computeSagaDriveDerivedStats,
  type ComputeSagaDriveDerivedStatsInput,
} from '../../../domains/rules/sagadrive/derived-stats';

export function buildSagaDriveDerivedStatCards(input: ComputeSagaDriveDerivedStatsInput): DerivedStatCardProps[] {
  return computeSagaDriveDerivedStats(input).map(({ key: _key, ...card }) => card);
}
