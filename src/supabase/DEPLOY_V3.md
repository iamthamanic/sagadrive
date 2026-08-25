# 🚀 Schema V3 Deployment Guide

## Schritt 1: Supabase SQL Editor öffnen

1. Gehe zu deinem Supabase Dashboard
2. Klicke auf **SQL Editor** (linke Sidebar)
3. Klicke auf **+ New Query**

---

## Schritt 2: Schema erstellen

Kopiere den kompletten Inhalt von `/supabase/schema_v3_complete.sql` und führe ihn aus.

**Wichtig:** Das erstellt alle Tabellen!

---

## Schritt 3: Character-Migrationen anwenden

Führe die Character-Migrationen in dieser Reihenfolge aus:

1. `supabase/migrations/002_character_trait_arrays.sql`
2. `supabase/migrations/003_character_lore_rate_limits.sql`

`002_character_trait_arrays.sql` ist sowohl für bestehende als auch für frisch angelegte SagaDrive-Datenbanken vorgesehen. Sie stellt `personality_traits`, `ideals`, `bonds` und `flaws` auf die vom CharacterEditor verwendeten Textbaustein-Arrays um und bewahrt vorhandene Einzelwerte als Ein-Element-Arrays.

`003_character_lore_rate_limits.sql` legt den persistenten Character-Lore-Rate-Limiter an. Die Tabelle ist nicht direkt für `anon` oder `authenticated` zugänglich; konsumiert wird das atomare Minutenkontingent ausschließlich über die `service_role`-RPC `consume_character_lore_rate_limit`. Die Migration muss vor dem produktiven Deploy der `character-lore` Edge Function aktiv sein, da die Funktion bei fehlendem persistentem Limiter bewusst fail-closed reagiert.

---

## Schritt 4: RLS Policies hinzufügen

Kopiere den kompletten Inhalt von `/supabase/schema_v3_rls.sql` und führe ihn aus.

**Wichtig:** Das aktiviert Row Level Security!

---

## Schritt 5: D&D 5e Ruleset erstellen (Seed Data)

```sql
INSERT INTO rulesets (
  id,
  name,
  description,
  version,
  is_official,
  is_public,
  attributes_config,
  skills_config,
  classes_config,
  races_config,
  combat_rules,
  dice_rules
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'D&D 5e',
  'Dungeons & Dragons 5th Edition',
  '5.0',
  true,
  true,
  '{
    "primary": ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"],
    "derived": ["hp", "ac", "speed", "initiative", "proficiency_bonus"]
  }'::jsonb,
  '[
    {"name": "Athletics", "ability": "strength"},
    {"name": "Acrobatics", "ability": "dexterity"},
    {"name": "Sleight of Hand", "ability": "dexterity"},
    {"name": "Stealth", "ability": "dexterity"},
    {"name": "Arcana", "ability": "intelligence"},
    {"name": "History", "ability": "intelligence"},
    {"name": "Investigation", "ability": "intelligence"},
    {"name": "Nature", "ability": "intelligence"},
    {"name": "Religion", "ability": "intelligence"},
    {"name": "Animal Handling", "ability": "wisdom"},
    {"name": "Insight", "ability": "wisdom"},
    {"name": "Medicine", "ability": "wisdom"},
    {"name": "Perception", "ability": "wisdom"},
    {"name": "Survival", "ability": "wisdom"},
    {"name": "Deception", "ability": "charisma"},
    {"name": "Intimidation", "ability": "charisma"},
    {"name": "Performance", "ability": "charisma"},
    {"name": "Persuasion", "ability": "charisma"}
  ]'::jsonb,
  '[
    {"name": "Barbarian", "hit_die": "d12"},
    {"name": "Bard", "hit_die": "d8"},
    {"name": "Cleric", "hit_die": "d8"},
    {"name": "Druid", "hit_die": "d8"},
    {"name": "Fighter", "hit_die": "d10"},
    {"name": "Monk", "hit_die": "d8"},
    {"name": "Paladin", "hit_die": "d10"},
    {"name": "Ranger", "hit_die": "d10"},
    {"name": "Rogue", "hit_die": "d8"},
    {"name": "Sorcerer", "hit_die": "d6"},
    {"name": "Warlock", "hit_die": "d8"},
    {"name": "Wizard", "hit_die": "d6"}
  ]'::jsonb,
  '[
    {"name": "Human", "speed": 30, "size": "Medium"},
    {"name": "Elf", "speed": 30, "size": "Medium"},
    {"name": "Dwarf", "speed": 25, "size": "Medium"},
    {"name": "Halfling", "speed": 25, "size": "Small"},
    {"name": "Dragonborn", "speed": 30, "size": "Medium"},
    {"name": "Gnome", "speed": 25, "size": "Small"},
    {"name": "Half-Elf", "speed": 30, "size": "Medium"},
    {"name": "Half-Orc", "speed": 30, "size": "Medium"},
    {"name": "Tiefling", "speed": 30, "size": "Medium"}
  ]'::jsonb,
  '{
    "initiative": "1d20 + dex_modifier",
    "actions_per_turn": 1,
    "bonus_actions_per_turn": 1,
    "reactions_per_round": 1,
    "movement": "speed",
    "death_saves": {
      "successes_needed": 3,
      "failures_needed": 3
    }
  }'::jsonb,
  '{
    "standard_set": ["d4", "d6", "d8", "d10", "d12", "d20", "d100"],
    "advantage": "roll_twice_take_higher",
    "disadvantage": "roll_twice_take_lower",
    "critical_hit": "natural_20",
    "critical_miss": "natural_1"
  }'::jsonb
);
```

---

## Schritt 6: Verifizieren

Gehe zu **Table Editor** und prüfe, ob alle Tabellen existieren:

- ✅ rulesets
- ✅ worlds
- ✅ locations
- ✅ characters
- ✅ spells_abilities
- ✅ character_spells_abilities
- ✅ items
- ✅ character_inventory
- ✅ projects
- ✅ project_members
- ✅ sessions
- ✅ session_participants
- ✅ combat_encounters
- ✅ combat_participants
- ✅ battle_maps
- ✅ map_tokens
- ✅ dice_rolls
- ✅ quests
- ✅ marketplace_categories
- ✅ ai_context
- ✅ character_lore_rate_limits

Prüfe bei `characters` zusätzlich, dass `personality_traits`, `ideals`, `bonds` und `flaws` als Text-Arrays vorliegen.

Prüfe anschließend, dass die RPC `consume_character_lore_rate_limit` existiert. `anon` und `authenticated` dürfen weder direkten Tabellenzugriff noch Execute-Rechte auf die RPC haben; `service_role` darf die RPC ausführen.

---

## Schritt 7: Test

1. Reload die App
2. Gehe zu Dashboard
3. Öffne den CharacterEditor und den BG-Tab
4. Prüfe, dass `Kampagnen-Lore` ohne Auswahl setting-neutral bleibt und ein berechtigtes Projekt auswählbar ist
5. Fehler sollten weg sein! ✅

---

## 🎉 Fertig!

Du hast jetzt:
- ✅ Komplettes D&D-System
- ✅ Flexible Rulesets
- ✅ Character System (PC/NPC/Companion/Monster)
- ✅ Projects & Sessions
- ✅ Persistentes, instanzübergreifendes Character-Lore-Rate-Limit
- ✅ Autorisierten Projekt-/Welt-Lore-Kontext im CharacterEditor
- ✅ Combat Tracking (vorbereitet)
- ✅ Battle Maps (vorbereitet)
- ✅ Marketplace (vorbereitet)
- ✅ AI Integration (vorbereitet)

---

## Nächste Schritte

Siehe `/ARCHITECTURE.md` für die komplette Roadmap!
