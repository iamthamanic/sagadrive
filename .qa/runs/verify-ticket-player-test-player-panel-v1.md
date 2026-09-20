# Verify Ticket — player-test-player-panel-v1 (#298)

## Ergebnis
PASS

## Checks (@test-gate)
- Command: `npm run test-gate`
- Result: PASS (includes `player-test-player-panel-check.mjs`)

## Acceptance
Slug: `player-test-player-panel-v1`

| Checkbox | Evidence |
|----------|----------|
| Name, portrait, HP, defense, resistances | `buildPlayerPanelModel` + `PlayerPanel` header/stat chips/resistances |
| Skills/attributes; Drive; shared Momentum | attributes/skills sections; Drive chip; momentum from `gameplay.shared` |
| Inventory read-first; conditions | inventory section; conditions from shared overlay |
| Dice/check; roster; scene | Check section → `applyCommand(roll)`; roster list; sceneId |
| Waiting/Paused/Disconnected/Error | `PlayerPanelStatusBanner` + connection kinds |
| No CharacterEditor in session | Gate forbids import/string; SessionResourceScreen wires `PlayerPanel` only |
| Zero escape hatches; test-gate | typed-strict via test-gate; new gate script |

## Diff scope
In: domain player-panel, app/session PlayerPanel + hook + banner, SessionResourceScreen wire, test-gate + contract script, acceptance/design.
Out: Shared roll math (#299), CharacterEditor, combat encounter UI.

## Secrets
PASS (test-gate secrets scan)

## Notes
UI language German; check action is intent-only until #299.
