# Design — session-death-lifecycle v1 (#373)

## Hop line
GM/Player UI → `useDeathLifecycle` / damage command → pure `session-death-lifecycle` + SQL `sagadrive_resolve_*` → `shared.lifeByCharacter` + `life` session events → Player Panel / Encounter conditions converge on reload.

## Stage ownership
- HP mutation: existing damage path (#300)
- Life track: new domain + `life` kind (not DB face frames, not inventory)
- Presentation tags: `kampfunfähig` / `bewusstlos` (compat) / `sterbend:N` / `tot` / `stabil`

## Difficulty (§16.4)
| Module | On drop to 0 |
|--------|----------------|
| Heroisch | stable@0 unless deadly/crit |
| Standard | downed dying 1 |
| Hart | dying 2 + wound (max 3 wounds) |

## Non-goals
- Second combat rules engine
- Persisting webcam/LiveAct
- Auto-clear inventory on death
