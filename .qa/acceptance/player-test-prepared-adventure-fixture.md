# Feature: Player Test: Prepared Adventure Fixture

<!-- refined by @implement from issue #302 on 2026-09-20 -->

## Intent
World Profile → Adventure/Project → Session wiring for Epic #210 player test: one prepared fantasy adventure fixture with 3–4 pregens, NPC spawn plan, beat list (explore/social/combat/heal/Drive), test inventory ids, GM starts from normal UI; Voice/Video stays external (Discord/Meet). Zero type escape hatches; contract gate green.

## Preconditions
- Authenticated user with at least one editable world profile (optional at create; required for prepare bind)
- User can create a project (GM) and open SessionJoin from Dashboard / Saga sessions
- Depends on #297–#301 surfaces (runtime, panel, rolls, scene) — not reimplemented here
- Parent epic #210 — this ticket is fixture + wiring only

## Happy Path
- [ ] Domain fixture exports stable id, fantasy-basic pack, level, beats, pregens (3–4), NPC plan (3–5 with duplicate def)
- [ ] Project create accepts `world_profile_id`; ProjectJoin offers world-profile select (German labels)
- [ ] SessionJoin mounted in App via `session-join` route; Dashboard CTA „Session starten“
- [ ] SagaResourceScreen overview/sessions CTAs navigate to SessionJoin (`session-join`); fixture panel lives on SessionJoin
- [ ] PreparedAdventureFixturePanel lists pregens/NPCs/beats + Voice/Video Discord/Meet note; one-click prepare spawns NPC instances for selected project (GM)
- [ ] Pregens listed with „Als Charakter übernehmen“ → CharacterEditor name/level seed
- [ ] Zero `as any` / `@ts-ignore` / eslint-disable in touched domain/app files; test-gate green

## Edge Cases
- [ ] Prepare without world profile: clear German error / guidance (create project with world or bind first)
- [ ] Prepare as non-GM / without project: spawn refused by existing service policy
- [ ] Fixture integrity assert fails closed on wrong pregen/NPC/beat counts
- [ ] Domain fixture has no React/Supabase imports

## Regression
- [ ] #301 shared-scene presentation gate still passes
- [ ] Existing ProjectJoin create/join still works without world profile (optional field)
- [ ] SessionJoin create/join behavior unchanged aside from mount + fixture panel

## Assumptions
- Voice/Video = external Discord/Meet only — no in-app A/V
- Pregens are lightweight descriptors + item definition ids; editor seed is name/level (not full CharacterPresetSnapshot)
- NPC spawn uses existing `spawnNpcCreatureInstance` (core definition ids)
- No marketplace / AI-GM / 3D / recording in this ticket

## Security Coverage
- B-01 Auth required for project create / NPC spawn (existing services)
- B-04 GM-only spawn path via existing npc-creature instance policy
- B-07 Client cannot invent world_profile binding for worlds they cannot edit (migration 015 trigger)
- F-03 No new UGC URL surfaces; Voice note is static copy
- P-04 Spawn uses existing RPC; one instance per plan entry (no fan-out duplicate side effects beyond plan)

## Screenshots
| Step | Filename |
|------|----------|
| n/a | contract gate; browser optional via @verify-ui |

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-player-test-prepared-adventure-fixture.md`
- HEAD_SHA: 64b5fc4
- BASE_SHA: 769e5a1e42c731cb34b679e5f03d52c8ee82767d

## Implementation Notes
- Domain: `src/domains/session/contracts/prepared-adventure-fixture.ts` — fixture id, fantasy-basic pack, 4 pregens, 4 NPC plan entries (duplicate bandit), beats (explore/social/combat/heal/drive), Voice Discord/Meet note, integrity assert
- Project: `CreateProjectDto`/`ProjectDto`/`ProjectVm` + `createProject` write `world_profile_id`; `updateProjectWorldProfile`; ProjectJoin Weltprofil select
- Shell: `session-join` route; App lazy-loads SessionJoin; Dashboard „Session starten“; Saga overview/sessions CTAs → session-join
- UI: `PreparedAdventureFixturePanel` on SessionJoin create tab — prepare spawns NPCs; pregens via `fixture-seed` bootstrap (name/level)
- Gate: `scripts/player-test-prepared-adventure-fixture-check.mjs` wired after shared-scene in `test-gate`
- Design: `.qa/design/player-test-prepared-adventure-fixture.md` (60–90 min runbook)
- Intentional gap: SessionJoin after create navigates to compatibility `gamemaster` view (not live public-id URL) when public ids not resolved in this ticket; pregens seed name/level only (not full CharacterPresetSnapshot / inventory instances)
