# Observation & Session-Event Protocol

Issue: **#304** · Epic: **#210** Phase 10 · Live observer sheet (not the player feedbackbogen).

Evidence location after the run:

`.qa/evidence/player-test-instrumentation-runbook/runs/<YYYY-MM-DD>-<dogfood|external>-<n>/observation-log.md`

---

## Session header

| Field | Value |
|-------|-------|
| Date / start time | |
| Run type | ☐ Dogfood 1 · ☐ Dogfood 2 · ☐ External #1 |
| GM | |
| Players (names/handles) | |
| Voice | ☐ Discord · ☐ Meet |
| Adventure duration target | ☐ 30 min · ☐ 60–90 min |
| Observer | |

---

## Phase 10 metric log (tick as observed)

| Metric key | Observed value / notes | Timestamp |
|------------|------------------------|-----------|
| `join_time_until_ready` | | |
| `time_to_first_player_action` | | |
| `gm_software_explanations_count` | | |
| `sync_reconnect_incidents` | | |
| `rule_confusion_events` | | |
| `ui_confusion_misclicks` | | |
| `combat_round_duration` | | |
| `subjective_immersion_flow` | (from post feedback) | |
| `would_play_next_session_again` | (from post feedback) | |
| `what_would_you_miss_without_sagadrive` | (from post feedback) | |

---

## Live event log (append chronologically)

Use severity: `info` · `ux` · `rules` · `sync` · `p1` · `p0`.

| Time | Actor | Event | Severity | Note |
|------|-------|-------|----------|------|
| | | Session created / join started | info | |
| | | | | |
| | | | | |

Suggested event types: `join`, `character_pick`, `scene_change`, `shared_check`, `drive_spend`, `combat_start`, `damage`, `heal`, `reconnect`, `pause`, `resume`, `complete`, `interrupt`, `bug_recovery`.

---

## Interruptions & recovery

| Time | Cause | Recovery action | Console/DB used? | Outcome |
|------|-------|-----------------|------------------|---------|
| | | | ☐ yes · ☐ no | |

Rule: no developer console / DB manipulation during play except bug recovery; every such use must appear here.

---

## P0 abort check

- [ ] No P0 abort occurred
- [ ] If P0 occurred: describe trigger, stop time, and whether External Test is blocked

P0 description:

>
