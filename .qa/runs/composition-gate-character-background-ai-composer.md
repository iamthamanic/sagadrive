# Composition Gate - character-background-ai-composer

- HEAD_SHA: ed4da44676c1e1b073e5ac04508728232d5c6cb8
- BASE_SHA: 9f0ea4f858e48e73929175d36c36eeec25765a76
- Date: 2026-08-25
- Verdict: CLEAR

## Event
An authenticated user requests one new background-story variant from the current CharacterEditor state, receives exactly one draft, and explicitly chooses whether to accept it. Character trait blocks are persisted once as part of the normal character save.

## Hop chain
`CharacterEditor` -> `CharacterBackgroundComposer` -> `characterLoreService` -> Supabase Edge Function `character-lore` -> authentication + request validation + per-user rate guard -> optional authorized project/world lookup -> versioned prompt builder -> exactly one configured LLM provider call -> draft response -> explicit local `Übernehmen` -> normal Character save -> `characterService` -> one `characters` row.

Trait persistence follows: `CharacterTraitEditor` -> CharacterEditor state -> one `createCharacter`/`updateCharacter` payload -> `characterService` -> `characters.personality_traits/ideals/bonds/flaws` arrays.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One user click produces one provider request and one returned variant. Trait count or project membership must not fan out generation or saves. | `handleGenerate` is disabled while one request is pending and calls `generateBackground` once. The Edge Function makes one provider call after validation. Ten independent user actions remain ten independent requests, subject to the per-user request limit. Character save remains one DB write payload regardless of the number of trait blocks. | pass |
| Invalid/missing | Invalid identity, malformed input, unknown ruleset, unauthorized lore context, or missing provider configuration must fail closed without replacing user text or leaking another project's lore. | Missing/invalid auth returns 401. Invalid request/ruleset/UUID returns 400. Project/world lore is fetched only server-side with the caller JWT and explicit membership/creator checks. Missing provider configuration returns `not-configured` before any provider call. The UI keeps the current background story unchanged on every error. | pass |
| Two consumers / crash | Concurrent/retried generation must not create a persistent duplicate side effect or silently overwrite the current story. | There is no queue, outbox, worker, or persistent generation record. Each HTTP request is an explicit user-requested variant. A failed/crashed provider request persists nothing. Successful output is held as a local draft until `Übernehmen`; a second intentional request represents a second intentional variant. Character persistence happens only through the separate normal save action. | pass |

## Validation
- GitHub Test Gate on `ed4da44676c1e1b073e5ac04508728232d5c6cb8`: PASS.
- Diff Typed-Strict lint: PASS.
- Frontend TypeScript check: PASS.
- Vite production build: PASS.
- Deno LTS `deno check` for all three changed Character-Lore Edge Function TypeScript files: PASS.
- Secrets diff scan: PASS.

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `rate-limit:` | note | Edge Function -> provider | In-memory rate limiting is instance-local and is not a globally durable quota. | Accepted as first protection layer for this preparatory slice; provider billing/cost hardening should use a persistent distributed limiter before production paid-model rollout. |
| `dead-path:` | note | CharacterEditor -> optional project/world lookup | The standalone editor currently does not supply `projectId`/`worldId`, so authorized campaign/world lore enrichment is prepared but dormant. | No semantic mismatch in the current flow; when the editor is opened from a project/world context, pass those IDs through the typed context instead of raw lore. |

No open blocker or flag changes event cardinality, destination, tenant, or identity for the current feature.

## Skip reason
n/a
