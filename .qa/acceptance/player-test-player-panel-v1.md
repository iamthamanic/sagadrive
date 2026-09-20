# Feature: Player Test 3/9: Player Panel V1

<!-- refined by @implement from issue #298 on 2026-09-20 -->

## Intent
Spieler sehen ein schlankes Player Panel mit spielrelevantem Character-State (Name, Portrait, HP, Defense/Schutz, Widerstände, Skills/Attribute, Drive/Momentum, Inventar read-first, Zustände, Würfel-/Check-Aktion, Roster, Scene-Kontext) plus klare Waiting/Paused/Disconnected/Error States — ohne CharacterEditor im Session-Screen.

## Preconditions
- Authenticated user is a session participant (or character owner) with a character public id in the live player URL
- Session public ids resolve via project service; runtime uses #297 snapshot+subscribe
- Character sheet exists and is loadable by public id

## Happy Path
- [ ] Player Panel shows name, portrait, HP (Gesundheit), defense/protection, relevant resistances
- [ ] Skills/attributes for checks; Drive and shared Momentum visible
- [ ] Inventory/equipment read-first; active conditions visible
- [ ] Dice/check action available; roster + session/scene context visible
- [ ] Waiting/Paused/Disconnected/Error states understandable
- [ ] No full CharacterEditor embedded as session requirement
- [ ] Zero type escape hatches; test-gate green for scope

## Edge Cases
- [ ] Missing characterPublicId → resolve hint, no crash
- [ ] Character load failure → Error state with German message
- [ ] Runtime subscribe failure / offline → Disconnected/Error with Resync
- [ ] Session status waiting/paused → clear banner; check action may still be visible but status is primary
- [ ] Empty inventory/equipment/conditions → empty labels, not fake data

## Regression
- [ ] #297 useSessionRuntime + realtime gate still pass
- [ ] GamemasterPanel / SessionJoin unchanged in meaning
- [ ] CharacterEditor not imported from Player Panel path

## Assumptions
- Authoritative shared roll resolution is #299; V1 emits `roll` command intent via runtime applyCommand
- Current HP/conditions overlays may live in `gameplay.shared` until combat persistence child; derived max HP always from rules kernel
- No 3D/Face Tracking gate for this panel (portrait image + optional compact avatar surface is enough)

## Security Coverage
- F-03: Panel only loads character via authenticated `getCharacterByPublicId` (owner-scoped RLS)
- B-01 / B-04: Runtime snapshot/commands remain membership-gated (#297)
- B-07: Client does not invent elevated HP/defense — derived from character + optional shared overlay
- P-04: Check action uses runtime idempotency when provided

## Screenshots
| Step | Filename |
|------|----------|
| n/a | verify via contract gate + unit domain tests; browser optional |

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-player-test-player-panel-v1.md`
- HEAD_SHA: 319e6f5d7255a17ae62be34445261b8af3505c23

## Implementation Notes
- Domain: `src/domains/session/contracts/player-panel.ts` (`buildPlayerPanelModel`, connection kinds, inventory/roster projection)
- App: `PlayerPanel`, `PlayerPanelStatusBanner`, `usePlayerPanel`; `SessionResourceScreen` wires `liveView=player|player-resolve`
- Check CTA: `applyCommand({ kind: 'roll' })` intent only (#299 resolves)
- Gate: `scripts/player-test-player-panel-check.mjs` in `test-gate`
- Design: `.qa/design/player-test-player-panel-v1.md`
