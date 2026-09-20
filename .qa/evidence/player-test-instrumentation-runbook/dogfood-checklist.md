# Private Dogfood Checklist (Phase 9)

Issue: **#304** · Epic: **#210** · Before inviting external testers.

Evidence for completed dogfood runs:

`.qa/evidence/player-test-instrumentation-runbook/runs/<YYYY-MM-DD>-dogfood-<n>/`

Also link: [runbook.md](./runbook.md) · [player-test-ready-gate.md](./player-test-ready-gate.md)

---

## Preflight (both tests)

- [ ] Player-Test-Ready Gate reviewed ([player-test-ready-gate.md](./player-test-ready-gate.md))
- [ ] Discord **or** Google Meet channel ready (external voice only)
- [ ] Prepared adventure fixture available (#302)
- [ ] Feedbackbogen + observation protocol printed/open
- [ ] No plan to use developer console/DB during play except recovery

---

## Test 1 — GM + 1 Spieler · 30 Minuten

**Goal:** Smoke the join → panel → one check → optional short combat path without strangers.

- [ ] Session created without DB/Admin workaround
- [ ] Player joined via code/link and picked an allowed character
- [ ] Roster/presence visible to both
- [ ] At least one shared check (or Drive) completed
- [ ] Interruptions logged in observation protocol
- [ ] No P0 abort

**Exit Test 1:** no P0; known P1 cosmetics OK. Notes:

>

**Evidence folder:** `runs/<date>-dogfood-1/`

---

## Test 2 — 1 GM + 3–4 Spieler · komplettes One-shot (60–90 min)

**Goal:** Full vertical slice under dogfood conditions.

- [ ] Cast: 1 GM + 3–4 players on separate devices/browsers preferred
- [ ] Voice via Discord/Meet for entire session
- [ ] Prepared adventure beats covered (exploration, social, combat, damage/heal, Drive/Momentum)
- [ ] Reload/reconnect exercised at least once by one player
- [ ] Session pause **or** complete exercised
- [ ] Observation protocol filled live
- [ ] Feedbackbogen collected from GM + each player
- [ ] Interruptions logged; no undeclared console/DB use

**Exit Test 2 (Dogfood Exit = External gate):**

- [ ] **keine P0-Abbruchfehler**
- [ ] maximal bekannte P1-Cosmetics/UX-Probleme
- [ ] Ready Gate Product boxes still hold (60–90 min playable; Voice dependency clear; feedback+protocol ready)

**Evidence folder:** `runs/<date>-dogfood-2/`

---

## Sign-off

| Role | Name | Date | Signature / note |
|------|------|------|------------------|
| Facilitator | | | |
| GM (if different) | | | |

External Player Test #1 may start only after Test 2 exit is checked.
