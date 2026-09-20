# Player-Test Runbook

Issue: **#304** · Epic: **#210** · Evidence root: [README.md](./README.md)

## Purpose

Operate Private Dogfood (Phase 9) and External Player Test #1 (Phase 10) without inventing process mid-session. Product features are already gated by children #296–#303.

## Voice / Video (mandatory preflight)

- **Voice und Video laufen extern über Discord oder Google Meet** — SagaDrive stellt in dieser Player-Test-Stufe kein In-App-A/V bereit.
- Before start: create/join the Discord voice channel **or** Google Meet link; paste it in the session briefing.
- Do **not** start the digital session until every participant has working voice.
- OBS / Face Tracking / in-app A/V are **out of scope** for Test #1.

## Adventure length

| Mode | Duration | Cast |
|------|----------|------|
| Dogfood Test 1 | **30 minutes** | 1 GM + 1 Spieler |
| Dogfood Test 2 / External Test #1 | **60–90 minutes** | 1 GM + 3–4 Spieler |

Beat table for the 60–90 min One-shot: see `.qa/design/player-test-prepared-adventure-fixture.md` („60–90 min beat runbook“) and fixture `PLAYER_TEST_PREPARED_ADVENTURE_FIXTURE_ID`.

## Linked checklists

- **Player-Test-Ready Gate (mirror):** [player-test-ready-gate.md](./player-test-ready-gate.md) — all Functional / Security / Quality / Product boxes must be true before inviting external testers.
- **Private Dogfood:** [dogfood-checklist.md](./dogfood-checklist.md)
- **Feedbackbogen:** [feedback-form.md](./feedback-form.md)
- **Observation / Event protocol:** [observation-event-protocol.md](./observation-event-protocol.md)

## Operator timeline (External / Dogfood Test 2)

1. **T−1 day** — Confirm Ready Gate; seed prepared adventure + pregens; book Discord/Meet; print or open feedback + observation sheets.
2. **T−15 min** — Voice check; browsers/devices ready; no developer console open on player machines.
3. **0–10 min** — GM: Weltprofil → Projekt → „Player-Test-Abenteuer vorbereiten“ → Session erstellen → Spieler join per Code/Link + Character pick.
4. **10–90 min** — Follow prepared adventure beats (exploration → social → combat → Drive/Momentum → wrap). Observer fills [observation-event-protocol.md](./observation-event-protocol.md).
5. **Post** — Collect [feedback-form.md](./feedback-form.md) from each participant; store under `runs/<date>-…/` per [README.md](./README.md).

## What we measure (Phase 10)

Primary metrics (also in domain contract `PHASE10_PRIMARY_METRICS`):

1. Join-Zeit bis spielbereit
2. Zeit bis erster eigenständiger Player-Action
3. Anzahl GM-Erklärungen zur Software
4. Sync-/Reconnect-Probleme
5. Regel-Nachschlagen / Rule Confusion
6. UI-Verirrungen / Fehlklicks
7. Combat-Rundenzeit
8. Subjektive Immersion / Flow
9. „Würdest du die nächste Session wieder damit spielen?“
10. „Welchen Teil würdest du vermissen, wenn SagaDrive weg wäre?“

Plus: qualitative Beobachtung + Session-Eventlog + kurzes Post-Interview — **nicht nur NPS**.

## Hard rules during play

- Keine Entwicklerkonsole / DB-Manipulation während des Spiels außer zum Bug-Recovery.
- Alle Unterbrechungen protokollieren (observation protocol).
- Bei P0-Abbruch: Session stoppen, loggen, Ready Gate Security/Quality neu prüfen — External Test blockiert.

## Explicitly deferred (do not demo as required)

3D Scene/World Runtime, Grid/Battlemap/FoW, Avatar Face Tracking, eingebautes Voice/Video, OBS/Actual-Play-Studio, AI-GM, Marketplace/Payments, ContentPackage Publishing, vollständiger Encounter Builder, perfekte Mobile-Session-UX.
