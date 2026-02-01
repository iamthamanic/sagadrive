// ============================================
// RULESETS Module - TypeScript Types
// ============================================

export interface Ruleset {
  id: string;
  creator_user_id: string | null;
  name: string;
  description: string | null;
  version: string | null;
  
  // Rule configs (flexible JSONB)
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
  combat_rules: Record<string, any>;
  dice_rules: Record<string, any>;
  level_progression: Record<string, any>;
  
  // Metadata
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
  combat_rules?: Record<string, any>;
  dice_rules?: Record<string, any>;
  is_public?: boolean;
}

export interface UpdateRulesetDTO extends Partial<CreateRulesetDTO> {
  id: string;
}
