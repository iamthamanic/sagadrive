# Acceptance — gamemaster-live-screen-v2 (#369)

Feature slug: `gamemaster-live-screen-v2`

## Intent
GM Control Room: Adventure navigator + Program stage + session rail + action rail. Not Director production UI.

## Happy Path
GM on `/live/gamemaster` sees Program center, can control scenes/program/knowledge/combat via existing GM controls, inspect roster, view-as-player projection (read-only).

## Security
Route ≠ authority. View-as-Player is projection only. No secrets into Program DOM.

## Scope
In: GamemasterLiveScreen composition, SessionResourceScreen wire, gate
Out: Generic GM actions (#371), Director (#375/#376), adventure-specific buttons
