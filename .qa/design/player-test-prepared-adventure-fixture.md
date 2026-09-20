# Prepared Adventure Fixture (#302)

Player-test ready adventure for Epic #210 — World → Project → Session wiring with fixed pregens, NPCs, and beats. Not a marketplace pack or AI-GM.

## Composition

| Layer | Binding |
|-------|---------|
| World Profile | `projects.world_profile_id` (optional on create; set before prepare) |
| Module pack | `builtin:fantasy-basic` item pack (+ core NPC defs) |
| Adventure | Project name/description from fixture |
| Session | Created via SessionJoin (normal UI) |
| Voice / Video | **External only** — Discord or Google Meet; no in-app A/V |

## Fixture contract

`src/domains/session/contracts/prepared-adventure-fixture.ts`

- Stable `PLAYER_TEST_PREPARED_ADVENTURE_FIXTURE_ID` + schema version
- Beats: exploration (scene preset ids), social check, combat, damage/healing, Drive/Momentum once
- 3–4 pregen descriptors (id, displayName, class label, level, starterItemDefinitionIds incl. healing potion)
- 3–5 NPC spawn plan entries; ≥2 share `core:npc.bandit`; include `core:npc.citizen`
- `VOICE_VIDEO_EXTERNAL_NOTE` (Discord/Meet)
- `assertPreparedAdventureFixtureIntegrity()` for gate + prepare path

## UI surfaces

1. **Dashboard** — „Session starten“ → `/session-join`
2. **SessionJoin** — create/join play session; fixture panel on create tab
3. **SagaResourceScreen** — overview CTA; sessions section embeds SessionJoin + panel
4. **ProjectJoin** — optional Weltprofil select → `world_profile_id` on create
5. **PreparedAdventureFixturePanel** — list + „Player-Test-Abenteuer vorbereiten“ (spawn NPCs)

## 60–90 min beat runbook

| Min | Beat | What to do |
|-----|------|------------|
| 0–10 | Setup | GM: Weltprofil wählen → Projekt anlegen → Panel „vorbereiten“ → SessionJoin Session erstellen → Spieler per Code |
| 10–25 | Exploration | GM published scene preset (`forest`/`tavern`/…) via Shared Scene; players see title/description |
| 25–40 | Social | Talk to citizen NPC; one social check (shared rolls) |
| 40–65 | Combat | Engage bandit instances; HP/damage; one healing potion use |
| 65–80 | Drive/Momentum | Spend or gain Drive/Momentum once (player panel) |
| 80–90 | Wrap | Complete/pause session; confirm Voice was Discord/Meet only |

## Depends on

- #297 SessionRuntimeState
- #298 Player Panel
- #299 Shared rolls
- #301 Shared scene presentation
- Epic #210 parent — do not implement marketplace/AI-GM/3D/recording here
