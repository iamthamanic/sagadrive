/**
 * derived-stats types — UI-independent SagaDrive derived stat computation contracts.
 * Location: src/domains/rules/sagadrive/derived-stats/types.ts
 */
import type { SagaDriveAttributeKey, SagaDriveSkillKey } from '../character-creation';

export type DerivedStatAttributeMap = Record<SagaDriveAttributeKey, number>;
export type DerivedStatSkillRankMap = Record<SagaDriveSkillKey, number>;

export interface DerivedStatTermComputation {
  label: string;
  contribution: number;
  detail?: string;
  active?: boolean;
}

export interface DerivedStatComputation {
  key: string;
  label: string;
  displayValue: string;
  base?: number;
  prefix?: string;
  help?: string;
  footnote?: string;
  terms: DerivedStatTermComputation[];
}

export interface ComputeSagaDriveDerivedStatsInput {
  attributes: DerivedStatAttributeMap;
  finalSkillRanks: DerivedStatSkillRankMap;
  /** Global EB for non-skill-bound formulas (health, resistances). */
  experienceBonus: number;
  /** When set, initiative uses applicable EB from awareness rank at this level. */
  level?: number;
  overloaded: boolean;
}
