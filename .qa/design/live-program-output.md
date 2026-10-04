# Design — live-program-output (#365)

## Intent
Program Output is presentation-safe shared output, independent of Player/GM private UI.

## Seats
| Seat | Choice |
|------|--------|
| Domain | `src/domains/session/presentation/program-presentation.ts` |
| Storage | `world_state.shared.programPresentation` (ephemeral presentation metadata, not LiveAct) |
| Event | `SessionEventKind` + RPC kind `program` |
| Source input | `shared-scene` references #301 `scenePresentation` at read time — no duplicate scene truth |
| Display | `/live/display` → control-free `ProgramDisplayShell` 16:9 |
| Auth | GM (and domain: director) may `program_switch`; players/viewers read-only |

## Source kinds
- `neutral` — empty stage
- `shared-scene` — project public scene presentation into program
- `look` — lookId ref; unavailable → neutral fallback

## Public-only invariant
Program read model must not carry `gm_only` / `character_specific` / private handout bodies.
`filterProgramPayload` fail-closed.

## Double truth
Scene publish does not rewrite program unless an authorized program command sets source.
Default read when program missing: source=`shared-scene` if scene exists else `neutral`.
