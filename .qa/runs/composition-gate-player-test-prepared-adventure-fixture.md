# composition-gate — player-test-prepared-adventure-fixture (#302)

## Verdict
CLEAR

## Scope SHAs
- BASE_SHA: 769e5a1e42c731cb34b679e5f03d52c8ee82767d
- HEAD_SHA: a29d3f4c93d70692b79c240e85bcc02c973a6c4e
- Feature slug: player-test-prepared-adventure-fixture

## Hop chain
1. **World→Project bind:** ProjectJoin / prepare → `project-service.createProject|updateProjectWorldProfile` writes `world_profile_id` → catalog/NPC resolvers read project binding.
2. **Prepare NPC spawn:** PreparedAdventureFixturePanel loops fixture plan → `spawnNpcCreatureInstance` (once per plan entry) → adventure instance list / GM panel consumers.
3. **Session start:** SessionJoin → `createSession` / `joinSession` → GM/player panels (existing #296 path); newly mounted route only.
4. **Pregen adopt:** panel → `setCharacterEditorBootstrap(fixture-seed)` → CharacterEditor (single consumer).

## Simulations
- N-actors: multiple players adopt distinct pregens independently; spawn is GM-only once per prepare click.
- Invalid fallback: prepare without world → German error or bind first editable world; no silent wrong-tenant bind beyond user's worlds list.
- Concurrent consumers: instance list + prepare re-run may add more instances (expected additive spawn); no fan-out to unrelated projects.

## Cardinality
Prepare: 1 world bind (if needed) + N spawns where N = fixture plan length (3–5). Not once-per-recipient mail fan-out.

## Skip?
No — multi-hop producer→consumer paths present.
