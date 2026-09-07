/**
 * ruleset-catalog types — Contracts for persisted ruleset catalog entities (not SagaDrive kernel rules).
 * Location: src/domains/rules/ruleset-catalog/types.ts
 */
export interface Ruleset {
  id: string;
  creator_user_id: string | null;
  name: string;
  description: string | null;
  version: string | null;

  attributes_config: {
    primary: string[];
    derived: string[];
  };
  skills_config: Array<{
    name: string;
    ability: string;
  }>;
  classes_config: Array<{
    name: string;
    hit_die: string;
  }>;
  races_config: Array<{
    name: string;
    speed: number;
    size: string;
  }>;
  combat_rules: Record<string, unknown>;
  dice_rules: Record<string, unknown>;
  level_progression: Record<string, unknown>;

  is_official: boolean;
  is_public: boolean;
  is_marketplace_item: boolean;
  downloads_count: number;
  rating: number | null;

  created_at: string;
  updated_at: string;
}

export interface CreateRulesetDTO {
  name: string;
  description?: string;
  version?: string;
  attributes_config: Ruleset['attributes_config'];
  skills_config?: Ruleset['skills_config'];
  classes_config?: Ruleset['classes_config'];
  races_config?: Ruleset['races_config'];
  combat_rules?: Record<string, unknown>;
  dice_rules?: Record<string, unknown>;
  is_public?: boolean;
}

export interface UpdateRulesetDTO extends Partial<CreateRulesetDTO> {
  id: string;
}
