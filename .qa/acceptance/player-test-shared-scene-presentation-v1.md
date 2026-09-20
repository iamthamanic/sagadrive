# Feature: Player Test 6/9: Shared Scene Presentation V1

<!-- refined by @implement from issue #301 on 2026-09-20 -->

## Intent
Minimaler gemeinsamer visueller Kontext (kein 3D-World-Builder): aktueller Ort/Scene-Titel, optionales Bild/Backdrop, kurze Beschreibung, sichtbare Characters/NPCs; GM kann den gemeinsamen Scene-Kontext wechseln. Presentation-State als Session-Gameplay-Daten (wiederverwendbar für spätere 3D-Semantik).

## Preconditions
- Authenticated session participant with #297 runtime snapshot/subscribe
- GM is project GM for scene mutations
- Depends on #297 (realtime runtime) — satisfied on main

## Happy Path
- [ ] Shared scene title / location visible to all session subscribers
- [ ] Optional backdrop image URL + short visible description
- [ ] Visible characters/NPCs listed in presentation context
- [ ] GM switches shared scene via `scene` runtime command; players update live (revision + realtime)
- [ ] Presentation state carries opaque `sceneRef` for later 3D / adventure semantics
- [ ] Zero type escape hatches; test-gate green for scope

## Edge Cases
- [ ] Non-GM cannot apply `scene` presentation commands
- [ ] Empty title rejected; description/backdrop optional
- [ ] backdropUrl must be http(s) or empty — other schemes rejected
- [ ] Client-forged `authoritative` / `updatedAt` stripped; server owns them
- [ ] Completed session rejects scene commands
- [ ] Stale revision: command rejected; clients resync via existing runtime hook

## Regression
- [ ] #297 realtime runtime gate still passes
- [ ] #298 player panel gate still passes
- [ ] #299 shared rolls / `lastRoll` preserved when scene presentation updates (shared merge, not replace)

## Assumptions
- Presentation lives under `world_state.shared.scenePresentation` (+ top-level `sceneId` sync)
- No grid/fog/3D in this ticket; `sceneRef` is opaque id/kind only
- Multi-browser E2E deferred; contract gate + domain tests cover acceptance

## Security Coverage
- B-01 Auth required on runtime command path (`auth.uid()`)
- B-04 Membership + GM-only for `scene` kind
- B-07 Client cannot invent elevated presentation metadata (`authoritative`/`updatedAt` server-owned)
- B-08 Append-only `session_events` for scene changes
- F-03 UGC URLs: backdrop restricted to http(s); rendered with safe img attrs
- P-04 Idempotency keys on scene commands prevent double-apply

## Screenshots
| Step | Filename |
|------|----------|
| n/a | contract gate + domain unit tests; browser optional |

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-player-test-shared-scene-presentation-v1.md`
- HEAD_SHA: f9f2964f1b34c3344a32ab1cf4452b6a09b154f6
- BASE_SHA: 7534ae7499c4841ef92dbff863d61014b5697db6

## Implementation Notes
- Domain: `src/domains/session/contracts/shared-scene-presentation.ts` (schema v1, forged-key strip, http(s) backdrop, opaque sceneRef)
- Migration: `supabase/migrations/043_session_shared_scene_presentation.sql` — GM `scene` → `shared.scenePresentation` merge (preserves lastRoll)
- App: `SharedScenePresentationView`, `SharedSceneGmControls`, `useSharedScenePresentation`; Player Panel + Display + GM scenes tab
- Gate: `scripts/player-test-shared-scene-presentation-check.mjs` wired into `test-gate`
- Design: `.qa/design/player-test-shared-scene-presentation-v1.md`
