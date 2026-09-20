# Shared Rolls / Rules Commands (#299)

Live session checks for Epic #210 Phase 4.

## Composition

Player Panel / GM → `applyCommand({ kind: 'roll', payload: inputs-only })`
→ `apply_session_runtime_command` (SECURITY DEFINER)
→ load character modifiers from DB → server d20 (§2.5 mode) → grade (§2.2)
→ optional Drive reroll (§2.10 keep-better) → append `session_events` +
`world_state.shared.lastRoll`.

Rules kernel TS (`domains/rules/sagadrive/probe`) is the pure source of truth for
grade/mode/drive comparison used by tests; SQL mirrors the same formulas for
authoritative live resolution.

## Inputs (client may send)

- `skill`, `characterPublicId` / `characterId`
- `mode`: `normal` | `advantage` | `disadvantage`
- `useDrive`: boolean
- `target` / `resistance`: numeric — applied when actor is GM; otherwise ignored
  in favor of `shared.checkTarget`

## Forbidden client fields (stripped)

`total`, `grade`, `natural`, `naturals`, `dice`, `result`, `outcome`, `keptNatural`,
`flatBonus`, `attributeValue`, `skillRank`, `experienceBonus` (server owns these).

## Out of scope

- Generic ruleset plugin resolver
- Full combat encounter orchestration (#300)
