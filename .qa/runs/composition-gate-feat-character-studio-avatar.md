# Composition Gate - feat-character-studio-avatar

- HEAD_SHA: 8bee38fad062fcc4ff8e04ea32bb5f3b4a6d01dc
- BASE_SHA: 7f6f096dc5c6a0ff280d901cf262fa533814085f
- Date: 2026-08-25
- Verdict: CLEAR

## Event
An authenticated user (1) generates exactly one character-background draft via the Character Lore Edge Function, optionally accepts it locally, and (2) persists character traits/fields once through the normal character save. Avatar/VRM preview and ruleset field switching are local UI hops without additional side-effects.

## Hop chain
`CharacterEditor` / `CharacterBackgroundComposer` → `characterLoreService.generateBackground` → Supabase Edge Function `character-lore` → JWT verify (`auth.getUser`) → request size/type validation + per-user in-memory rate limit → optional service-role project/world lookup with GM/active-member/world-binding checks → versioned prompt (`character-background-v1`) → exactly one configured LLM provider call → draft JSON → explicit UI `Übernehmen` → separate `characterService` create/update → one `characters` row (incl. trait arrays via migration `002_character_trait_arrays.sql`).

Parallel local hops (no provider/DB fan-out):
- `AvatarCanvas` / `CharacterStudioRuntime` → local Three.js/VRM WebGL preview only
- Ruleset dropdown → `characterCreation` option maps → controlled field reset in editor state

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One Generieren click → one provider call → one draft. Trait count / inventory / project membership must not multiply generation or saves. | `generateBackground` invokes `character-lore` once. Edge Function performs one provider call after auth/validation. Rate limit is per userId. Character save is one payload write. Avatar/ruleset changes do not call the LLM. Ten clicks remain ten independent requests. | pass |
| Invalid/missing | Bad auth, oversized body, invalid ruleset/UUID, unauthorized lore, missing provider config fail closed; never overwrite existing story or leak foreign world lore. | 401 without JWT. 413 above 128 KB. 400 on invalid payload. Project/world lore uses service role only after JWT + explicit membership/world binding. Missing provider returns `not-configured`. UI keeps current story on error and requires explicit accept. | pass |
| Two consumers / crash | No queue/outbox; crash after provider must not persist a draft; retries are new intentional requests; no double DB write from generation alone. | No worker/outbox. Generation persists nothing. Draft is local until Übernehmen. Persistence only via separate save. Concurrent editor tabs can race on save (last-write-wins) but do not fan out provider side-effects. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| `rate-limit:` | note | Edge Function → provider | In-memory Map is instance-local, not a durable global quota. | Accepted for prep slice; persistent limiter before paid production. Documented via `CHARACTER_AI_RATE_LIMIT_PER_MINUTE`. |
| `dead-path:` | note | Editor → optional project/world IDs | Standalone editor currently does not pass `projectId`/`worldId`, so authorized lore enrichment is dormant. | Pass IDs when opened from project context; no semantic mismatch today. |

CORS hardening (worktree): no default `*`; allowlist CSV or localhost-only fail-closed.

No open blocker/flag changes cardinality, destination, tenant, or identity for the current branch scope.

## Skip reason
n/a
