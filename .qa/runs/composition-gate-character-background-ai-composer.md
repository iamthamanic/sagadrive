# Composition Gate - character-background-ai-composer

- HEAD_SHA: 6500adcafd570fe63c97e4534d2f1286f61150bc
- BASE_SHA: 9f0ea4f858e48e73929175d36c36eeec25765a76
- Date: 2026-08-25
- Verdict: CLEAR

## Event
An authenticated user requests one new background-story variant from the current CharacterEditor state, receives exactly one draft, and explicitly chooses whether to accept it. Character trait blocks are persisted once as part of the normal character save.

## Hop chain
`CharacterEditor` -> `CharacterBackgroundComposer` -> `characterLoreService` -> Supabase Edge Function `character-lore` -> caller JWT verification -> request validation + per-user rate guard -> optional server-only project/world lookup with explicit authorization -> versioned prompt builder -> exactly one configured LLM provider call -> draft response -> explicit local `Übernehmen` -> normal Character save -> `characterService` -> one `characters` row.

Optional reference lore uses the Supabase service-role key only inside the Edge Function. Access is granted only when the authenticated caller is the project's GM or an active project member. A direct `worldId` combined with a project must exactly match that project's `world_id`; a direct world without a project is allowed only to its creator.

Trait persistence follows: `CharacterTraitEditor` -> CharacterEditor state -> one `createCharacter`/`updateCharacter` payload -> `characterService` -> `characters.personality_traits/ideals/bonds/flaws` arrays.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One user click produces one provider request and one returned variant. Trait count or project membership must not fan out generation or saves. | `handleGenerate` is disabled while one request is pending and calls `generateBackground` once. The Edge Function makes one provider call after validation and authorization. Ten independent user actions remain ten independent requests, subject to the per-user request limit. Character save remains one DB write payload regardless of the number of trait blocks. | pass |
| Invalid/missing | Invalid identity, malformed input, unknown ruleset, unauthorized lore context, oversized request, or missing provider configuration must fail closed without replacing user text or leaking another project's lore. | Missing/invalid auth returns 401. Declared and actual request bodies above 128 KB return 413. Invalid request/ruleset/UUID returns 400. Project/world lookup bypasses client RLS only after JWT verification and then explicitly checks GM/active membership plus project-world binding. Missing provider configuration returns `not-configured` before any provider call. The UI keeps the current background story unchanged on every error. | pass |
| Two consumers / crash | Concurrent/retried generation must not create a persistent duplicate side effect or silently overwrite the current story. | There is no queue, outbox, worker, or persistent generation record. Each HTTP request is an explicit user-requested variant. A failed/crashed provider request persists nothing. Successful output is held as a local draft until `Übernehmen`; a second intentional request represents a second intentional variant. Character persistence happens only through the separate normal save action. | pass |

## Validation
- GitHub Test Gate on `6500adcafd570fe63c97e4534d2f1286f61150bc`: PASS.
- Diff Typed-Strict lint: 26 changed TypeScript files PASS.
- Frontend TypeScript check: PASS.
- Vite production build: PASS.
- Deno LTS `deno check` for four changed Character-Lore Edge Function TypeScript files: PASS.
- Deno prompt-contract tests: 4 passed, 0 failed.
- Secrets diff scan: PASS.
- Production dependency audit is informational: critical=0, high=2, moderate=0, low=0.

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `rate-limit:` | note | Edge Function -> provider | In-memory rate limiting is instance-local and is not a globally durable quota. | Accepted as first protection layer for this preparatory slice; provider billing/cost hardening should use a persistent distributed limiter before production paid-model rollout. |
| `dead-path:` | note | CharacterEditor -> optional project/world lookup | The standalone editor currently does not supply `projectId`/`worldId`, so authorized campaign/world lore enrichment is prepared but dormant. | No semantic mismatch in the current flow; when the editor is opened from a project/world context, pass those IDs through the typed context instead of raw lore. |

The final UI-only change on `6500adc...` adds reduced-motion handling for the already-proven example fade. It does not alter the provider hop-chain, authorization, cardinality or persistence behavior.

No open blocker or flag changes event cardinality, destination, tenant, or identity for the current feature.

## Skip reason
n/a
