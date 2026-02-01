


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."adventures" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "genre" "text" NOT NULL,
    "world_template" "text",
    "ruleset" "text",
    "scenes" "jsonb" DEFAULT '[]'::"jsonb",
    "npcs" "jsonb" DEFAULT '[]'::"jsonb",
    "is_public" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."adventures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_context" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "character_id" "uuid",
    "context_type" "text",
    "prompt" "text",
    "response" "text",
    "model_used" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_context" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."battle_maps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_user_id" "uuid",
    "world_id" "uuid",
    "location_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text" NOT NULL,
    "grid_enabled" boolean DEFAULT true,
    "grid_size" integer DEFAULT 5,
    "grid_columns" integer DEFAULT 20,
    "grid_rows" integer DEFAULT 20,
    "grid_type" "text" DEFAULT 'square'::"text",
    "is_marketplace_item" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "battle_maps_grid_type_check" CHECK (("grid_type" = ANY (ARRAY['square'::"text", 'hex'::"text"])))
);


ALTER TABLE "public"."battle_maps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "character_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1,
    "is_equipped" boolean DEFAULT false,
    "is_attuned" boolean DEFAULT false,
    "custom_notes" "text"
);


ALTER TABLE "public"."character_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_spells_abilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "character_id" "uuid" NOT NULL,
    "spell_ability_id" "uuid" NOT NULL,
    "is_prepared" boolean DEFAULT true,
    "uses_remaining" integer
);


ALTER TABLE "public"."character_spells_abilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."characters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_user_id" "uuid",
    "world_id" "uuid",
    "project_id" "uuid",
    "parent_character_id" "uuid",
    "character_type" "text" NOT NULL,
    "ruleset_id" "uuid",
    "name" "text" NOT NULL,
    "race" "text",
    "class" "text",
    "level" integer DEFAULT 1,
    "background_story" "text",
    "appearance" "jsonb" DEFAULT '{}'::"jsonb",
    "portrait_url" "text",
    "token_url" "text",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "derived_stats" "jsonb" DEFAULT '{}'::"jsonb",
    "skills" "jsonb" DEFAULT '{}'::"jsonb",
    "proficiencies" "text"[] DEFAULT '{}'::"text"[],
    "languages" "text"[] DEFAULT '{}'::"text"[],
    "hp_current" integer,
    "hp_max" integer,
    "armor_class" integer,
    "initiative_bonus" integer DEFAULT 0,
    "speed" integer DEFAULT 30,
    "resources" "jsonb" DEFAULT '{}'::"jsonb",
    "conditions" "text"[] DEFAULT '{}'::"text"[],
    "personality_traits" "text"[],
    "ideals" "text",
    "bonds" "text",
    "flaws" "text",
    "is_marketplace_item" boolean DEFAULT false,
    "downloads_count" integer DEFAULT 0,
    "rating" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "characters_character_type_check" CHECK (("character_type" = ANY (ARRAY['pc'::"text", 'npc'::"text", 'companion'::"text", 'monster'::"text"])))
);


ALTER TABLE "public"."characters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."combat_encounters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "project_id" "uuid" NOT NULL,
    "name" "text",
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "current_round" integer DEFAULT 0,
    "current_turn_index" integer DEFAULT 0,
    "combat_log" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "combat_encounters_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."combat_encounters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."combat_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "combat_encounter_id" "uuid" NOT NULL,
    "character_id" "uuid" NOT NULL,
    "initiative" integer NOT NULL,
    "hp_current" integer,
    "conditions" "text"[] DEFAULT '{}'::"text"[],
    "has_acted_this_round" boolean DEFAULT false,
    "is_surprised" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."combat_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dice_rolls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "character_id" "uuid",
    "roll_type" "text",
    "dice_formula" "text" NOT NULL,
    "result" integer NOT NULL,
    "individual_rolls" "jsonb",
    "description" "text",
    "is_advantage" boolean DEFAULT false,
    "is_disadvantage" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dice_rolls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_user_id" "uuid",
    "ruleset_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "item_type" "text" NOT NULL,
    "rarity" "text" DEFAULT 'common'::"text",
    "weight" numeric(10,2),
    "value" integer,
    "image_url" "text",
    "damage_dice" "text",
    "damage_type" "text",
    "armor_class_bonus" integer,
    "properties" "text"[],
    "is_magical" boolean DEFAULT false,
    "attunement_required" boolean DEFAULT false,
    "magical_effects" "jsonb",
    "is_stackable" boolean DEFAULT false,
    "is_marketplace_item" boolean DEFAULT false,
    "downloads_count" integer DEFAULT 0,
    "rating" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "items_item_type_check" CHECK (("item_type" = ANY (ARRAY['weapon'::"text", 'armor'::"text", 'shield'::"text", 'consumable'::"text", 'tool'::"text", 'quest'::"text", 'treasure'::"text", 'misc'::"text"])))
);


ALTER TABLE "public"."items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_9f6fb44c" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_9f6fb44c" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "world_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "location_type" "text",
    "coordinates" "jsonb",
    "image_url" "text",
    "map_image_url" "text",
    "is_public" boolean DEFAULT false,
    "parent_location_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."map_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "battle_map_id" "uuid" NOT NULL,
    "combat_encounter_id" "uuid",
    "character_id" "uuid",
    "grid_x" integer NOT NULL,
    "grid_y" integer NOT NULL,
    "is_visible" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."map_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "parent_category_id" "uuid"
);


ALTER TABLE "public"."marketplace_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketplace_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "author_id" "uuid" NOT NULL,
    "data" "jsonb" NOT NULL,
    "rating" numeric(2,1) DEFAULT 0.0,
    "downloads" integer DEFAULT 0,
    "price" numeric(10,2) DEFAULT 0.00,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "marketplace_items_type_check" CHECK (("type" = ANY (ARRAY['world'::"text", 'adventure'::"text", 'character'::"text", 'item'::"text", 'ruleset'::"text"])))
);


ALTER TABLE "public"."marketplace_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "character_id" "uuid",
    "role" "text" DEFAULT 'player'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "project_members_role_check" CHECK (("role" = ANY (ARRAY['gm'::"text", 'player'::"text"]))),
    CONSTRAINT "project_members_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'kicked'::"text"])))
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gm_user_id" "uuid" NOT NULL,
    "world_id" "uuid",
    "ruleset_id" "uuid",
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "current_session_number" integer DEFAULT 0,
    "story_summary" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "world_id" "uuid",
    "project_id" "uuid",
    "creator_user_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "objectives" "jsonb" DEFAULT '[]'::"jsonb",
    "rewards" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'available'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "quests_status_check" CHECK (("status" = ANY (ARRAY['available'::"text", 'active'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."quests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rulesets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_user_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "version" "text",
    "attributes_config" "jsonb" DEFAULT '{"derived": ["hp", "ac", "speed", "initiative"], "primary": ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]}'::"jsonb" NOT NULL,
    "skills_config" "jsonb" DEFAULT '[]'::"jsonb",
    "classes_config" "jsonb" DEFAULT '[]'::"jsonb",
    "races_config" "jsonb" DEFAULT '[]'::"jsonb",
    "combat_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "dice_rules" "jsonb" DEFAULT '{}'::"jsonb",
    "level_progression" "jsonb" DEFAULT '{}'::"jsonb",
    "is_official" boolean DEFAULT false,
    "is_public" boolean DEFAULT false,
    "is_marketplace_item" boolean DEFAULT false,
    "downloads_count" integer DEFAULT 0,
    "rating" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rulesets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "character_id" "uuid",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "left_at" timestamp with time zone,
    "was_present" boolean DEFAULT true
);


ALTER TABLE "public"."session_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_players" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "character_id" "uuid",
    "is_online" boolean DEFAULT true,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."session_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "session_number" integer NOT NULL,
    "name" "text",
    "scheduled_for" timestamp with time zone,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "duration_minutes" integer,
    "gm_notes" "text",
    "summary" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sessions_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'active'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spells_abilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_user_id" "uuid",
    "ruleset_id" "uuid",
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "level" integer,
    "school" "text",
    "casting_time" "text",
    "range" "text",
    "duration" "text",
    "components" "jsonb",
    "damage_dice" "text",
    "damage_type" "text",
    "effects" "jsonb",
    "classes_allowed" "text"[],
    "level_required" integer,
    "is_official" boolean DEFAULT false,
    "is_marketplace_item" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "spells_abilities_type_check" CHECK (("type" = ANY (ARRAY['spell'::"text", 'ability'::"text", 'feature'::"text", 'action'::"text"])))
);


ALTER TABLE "public"."spells_abilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worlds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_user_id" "uuid",
    "ruleset_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "lore" "text",
    "setting_type" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "cover_image_url" "text",
    "is_public" boolean DEFAULT false,
    "is_marketplace_item" boolean DEFAULT false,
    "downloads_count" integer DEFAULT 0,
    "rating" numeric(3,2),
    "price" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."worlds" OWNER TO "postgres";


ALTER TABLE ONLY "public"."adventures"
    ADD CONSTRAINT "adventures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_context"
    ADD CONSTRAINT "ai_context_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battle_maps"
    ADD CONSTRAINT "battle_maps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_inventory"
    ADD CONSTRAINT "character_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_spells_abilities"
    ADD CONSTRAINT "character_spells_abilities_character_id_spell_ability_id_key" UNIQUE ("character_id", "spell_ability_id");



ALTER TABLE ONLY "public"."character_spells_abilities"
    ADD CONSTRAINT "character_spells_abilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."combat_encounters"
    ADD CONSTRAINT "combat_encounters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."combat_participants"
    ADD CONSTRAINT "combat_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dice_rolls"
    ADD CONSTRAINT "dice_rolls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_9f6fb44c"
    ADD CONSTRAINT "kv_store_9f6fb44c_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."map_tokens"
    ADD CONSTRAINT "map_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_categories"
    ADD CONSTRAINT "marketplace_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketplace_items"
    ADD CONSTRAINT "marketplace_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_user_id_key" UNIQUE ("project_id", "user_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rulesets"
    ADD CONSTRAINT "rulesets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_project_id_session_number_key" UNIQUE ("project_id", "session_number");



ALTER TABLE ONLY "public"."spells_abilities"
    ADD CONSTRAINT "spells_abilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worlds"
    ADD CONSTRAINT "worlds_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_adventures_is_public" ON "public"."adventures" USING "btree" ("is_public");



CREATE INDEX "idx_adventures_user_id" ON "public"."adventures" USING "btree" ("user_id");



CREATE INDEX "idx_characters_marketplace" ON "public"."characters" USING "btree" ("is_marketplace_item") WHERE ("is_marketplace_item" = true);



CREATE INDEX "idx_characters_owner" ON "public"."characters" USING "btree" ("owner_user_id");



CREATE INDEX "idx_characters_parent" ON "public"."characters" USING "btree" ("parent_character_id");



CREATE INDEX "idx_characters_project" ON "public"."characters" USING "btree" ("project_id");



CREATE INDEX "idx_characters_type" ON "public"."characters" USING "btree" ("character_type");



CREATE INDEX "idx_characters_world" ON "public"."characters" USING "btree" ("world_id");



CREATE INDEX "idx_combat_participants_encounter" ON "public"."combat_participants" USING "btree" ("combat_encounter_id");



CREATE INDEX "idx_combat_participants_initiative" ON "public"."combat_participants" USING "btree" ("combat_encounter_id", "initiative" DESC);



CREATE INDEX "idx_dice_rolls_session" ON "public"."dice_rolls" USING "btree" ("session_id");



CREATE INDEX "idx_dice_rolls_user" ON "public"."dice_rolls" USING "btree" ("user_id");



CREATE INDEX "idx_inventory_character" ON "public"."character_inventory" USING "btree" ("character_id");



CREATE INDEX "idx_items_creator" ON "public"."items" USING "btree" ("creator_user_id");



CREATE INDEX "idx_items_marketplace" ON "public"."items" USING "btree" ("is_marketplace_item") WHERE ("is_marketplace_item" = true);



CREATE INDEX "idx_items_type" ON "public"."items" USING "btree" ("item_type");



CREATE INDEX "idx_locations_parent" ON "public"."locations" USING "btree" ("parent_location_id");



CREATE INDEX "idx_locations_world" ON "public"."locations" USING "btree" ("world_id");



CREATE INDEX "idx_marketplace_items_author_id" ON "public"."marketplace_items" USING "btree" ("author_id");



CREATE INDEX "idx_marketplace_items_type" ON "public"."marketplace_items" USING "btree" ("type");



CREATE INDEX "idx_project_members_project" ON "public"."project_members" USING "btree" ("project_id");



CREATE INDEX "idx_project_members_user" ON "public"."project_members" USING "btree" ("user_id");



CREATE INDEX "idx_projects_code" ON "public"."projects" USING "btree" ("code");



CREATE INDEX "idx_projects_gm" ON "public"."projects" USING "btree" ("gm_user_id");



CREATE INDEX "idx_projects_world" ON "public"."projects" USING "btree" ("world_id");



CREATE INDEX "idx_rulesets_creator" ON "public"."rulesets" USING "btree" ("creator_user_id");



CREATE INDEX "idx_rulesets_marketplace" ON "public"."rulesets" USING "btree" ("is_marketplace_item") WHERE ("is_marketplace_item" = true);



CREATE INDEX "idx_session_players_session_id" ON "public"."session_players" USING "btree" ("session_id");



CREATE INDEX "idx_session_players_user_id" ON "public"."session_players" USING "btree" ("user_id");



CREATE INDEX "idx_sessions_project" ON "public"."sessions" USING "btree" ("project_id");



CREATE INDEX "idx_spells_creator" ON "public"."spells_abilities" USING "btree" ("creator_user_id");



CREATE INDEX "idx_spells_ruleset" ON "public"."spells_abilities" USING "btree" ("ruleset_id");



CREATE INDEX "idx_spells_type" ON "public"."spells_abilities" USING "btree" ("type");



CREATE INDEX "idx_worlds_creator" ON "public"."worlds" USING "btree" ("creator_user_id");



CREATE INDEX "idx_worlds_marketplace" ON "public"."worlds" USING "btree" ("is_marketplace_item") WHERE ("is_marketplace_item" = true);



CREATE INDEX "idx_worlds_ruleset" ON "public"."worlds" USING "btree" ("ruleset_id");



CREATE INDEX "kv_store_9f6fb44c_key_idx" ON "public"."kv_store_9f6fb44c" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_9f6fb44c_key_idx1" ON "public"."kv_store_9f6fb44c" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_9f6fb44c_key_idx2" ON "public"."kv_store_9f6fb44c" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_9f6fb44c_key_idx3" ON "public"."kv_store_9f6fb44c" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "kv_store_9f6fb44c_key_idx4" ON "public"."kv_store_9f6fb44c" USING "btree" ("key" "text_pattern_ops");



CREATE OR REPLACE TRIGGER "update_adventures_updated_at" BEFORE UPDATE ON "public"."adventures" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_marketplace_items_updated_at" BEFORE UPDATE ON "public"."marketplace_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."adventures"
    ADD CONSTRAINT "adventures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_context"
    ADD CONSTRAINT "ai_context_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_context"
    ADD CONSTRAINT "ai_context_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_maps"
    ADD CONSTRAINT "battle_maps_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."battle_maps"
    ADD CONSTRAINT "battle_maps_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."battle_maps"
    ADD CONSTRAINT "battle_maps_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_inventory"
    ADD CONSTRAINT "character_inventory_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_inventory"
    ADD CONSTRAINT "character_inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_spells_abilities"
    ADD CONSTRAINT "character_spells_abilities_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_spells_abilities"
    ADD CONSTRAINT "character_spells_abilities_spell_ability_id_fkey" FOREIGN KEY ("spell_ability_id") REFERENCES "public"."spells_abilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_parent_character_id_fkey" FOREIGN KEY ("parent_character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "public"."rulesets"("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."combat_encounters"
    ADD CONSTRAINT "combat_encounters_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."combat_encounters"
    ADD CONSTRAINT "combat_encounters_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."combat_participants"
    ADD CONSTRAINT "combat_participants_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."combat_participants"
    ADD CONSTRAINT "combat_participants_combat_encounter_id_fkey" FOREIGN KEY ("combat_encounter_id") REFERENCES "public"."combat_encounters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dice_rolls"
    ADD CONSTRAINT "dice_rolls_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."dice_rolls"
    ADD CONSTRAINT "dice_rolls_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dice_rolls"
    ADD CONSTRAINT "dice_rolls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."items"
    ADD CONSTRAINT "items_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "public"."rulesets"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_parent_location_id_fkey" FOREIGN KEY ("parent_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."map_tokens"
    ADD CONSTRAINT "map_tokens_battle_map_id_fkey" FOREIGN KEY ("battle_map_id") REFERENCES "public"."battle_maps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."map_tokens"
    ADD CONSTRAINT "map_tokens_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."map_tokens"
    ADD CONSTRAINT "map_tokens_combat_encounter_id_fkey" FOREIGN KEY ("combat_encounter_id") REFERENCES "public"."combat_encounters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketplace_categories"
    ADD CONSTRAINT "marketplace_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."marketplace_categories"("id");



ALTER TABLE ONLY "public"."marketplace_items"
    ADD CONSTRAINT "marketplace_items_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_gm_user_id_fkey" FOREIGN KEY ("gm_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "public"."rulesets"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quests"
    ADD CONSTRAINT "quests_world_id_fkey" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rulesets"
    ADD CONSTRAINT "rulesets_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spells_abilities"
    ADD CONSTRAINT "spells_abilities_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."spells_abilities"
    ADD CONSTRAINT "spells_abilities_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "public"."rulesets"("id");



ALTER TABLE ONLY "public"."worlds"
    ADD CONSTRAINT "worlds_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."worlds"
    ADD CONSTRAINT "worlds_ruleset_id_fkey" FOREIGN KEY ("ruleset_id") REFERENCES "public"."rulesets"("id") ON DELETE SET NULL;



CREATE POLICY "Authors can delete their items" ON "public"."marketplace_items" FOR DELETE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Authors can update their items" ON "public"."marketplace_items" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Everyone can view marketplace items" ON "public"."marketplace_items" FOR SELECT USING (true);



CREATE POLICY "Users can create adventures" ON "public"."adventures" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create marketplace items" ON "public"."marketplace_items" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can delete their own adventures" ON "public"."adventures" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can join sessions" ON "public"."session_players" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave sessions" ON "public"."session_players" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own adventures" ON "public"."adventures" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own or public adventures" ON "public"."adventures" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("is_public" = true)));



ALTER TABLE "public"."adventures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_9f6fb44c" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketplace_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_players" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."adventures" TO "anon";
GRANT ALL ON TABLE "public"."adventures" TO "authenticated";
GRANT ALL ON TABLE "public"."adventures" TO "service_role";



GRANT ALL ON TABLE "public"."ai_context" TO "anon";
GRANT ALL ON TABLE "public"."ai_context" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_context" TO "service_role";



GRANT ALL ON TABLE "public"."battle_maps" TO "anon";
GRANT ALL ON TABLE "public"."battle_maps" TO "authenticated";
GRANT ALL ON TABLE "public"."battle_maps" TO "service_role";



GRANT ALL ON TABLE "public"."character_inventory" TO "anon";
GRANT ALL ON TABLE "public"."character_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."character_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."character_spells_abilities" TO "anon";
GRANT ALL ON TABLE "public"."character_spells_abilities" TO "authenticated";
GRANT ALL ON TABLE "public"."character_spells_abilities" TO "service_role";



GRANT ALL ON TABLE "public"."characters" TO "anon";
GRANT ALL ON TABLE "public"."characters" TO "authenticated";
GRANT ALL ON TABLE "public"."characters" TO "service_role";



GRANT ALL ON TABLE "public"."combat_encounters" TO "anon";
GRANT ALL ON TABLE "public"."combat_encounters" TO "authenticated";
GRANT ALL ON TABLE "public"."combat_encounters" TO "service_role";



GRANT ALL ON TABLE "public"."combat_participants" TO "anon";
GRANT ALL ON TABLE "public"."combat_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."combat_participants" TO "service_role";



GRANT ALL ON TABLE "public"."dice_rolls" TO "anon";
GRANT ALL ON TABLE "public"."dice_rolls" TO "authenticated";
GRANT ALL ON TABLE "public"."dice_rolls" TO "service_role";



GRANT ALL ON TABLE "public"."items" TO "anon";
GRANT ALL ON TABLE "public"."items" TO "authenticated";
GRANT ALL ON TABLE "public"."items" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_9f6fb44c" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_9f6fb44c" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_9f6fb44c" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."map_tokens" TO "anon";
GRANT ALL ON TABLE "public"."map_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."map_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_categories" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_categories" TO "service_role";



GRANT ALL ON TABLE "public"."marketplace_items" TO "anon";
GRANT ALL ON TABLE "public"."marketplace_items" TO "authenticated";
GRANT ALL ON TABLE "public"."marketplace_items" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."quests" TO "anon";
GRANT ALL ON TABLE "public"."quests" TO "authenticated";
GRANT ALL ON TABLE "public"."quests" TO "service_role";



GRANT ALL ON TABLE "public"."rulesets" TO "anon";
GRANT ALL ON TABLE "public"."rulesets" TO "authenticated";
GRANT ALL ON TABLE "public"."rulesets" TO "service_role";



GRANT ALL ON TABLE "public"."session_participants" TO "anon";
GRANT ALL ON TABLE "public"."session_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."session_participants" TO "service_role";



GRANT ALL ON TABLE "public"."session_players" TO "anon";
GRANT ALL ON TABLE "public"."session_players" TO "authenticated";
GRANT ALL ON TABLE "public"."session_players" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."spells_abilities" TO "anon";
GRANT ALL ON TABLE "public"."spells_abilities" TO "authenticated";
GRANT ALL ON TABLE "public"."spells_abilities" TO "service_role";



GRANT ALL ON TABLE "public"."worlds" TO "anon";
GRANT ALL ON TABLE "public"."worlds" TO "authenticated";
GRANT ALL ON TABLE "public"."worlds" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































