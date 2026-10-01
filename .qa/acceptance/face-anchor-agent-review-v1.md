# Feature: Face Anchor Agent Review Protocol V1

<!-- face-anchor-agent-review-v1 -->

## Intent
Ground Truth may be `human_reviewed` **or** `agent_reviewed` after `face-anchor-agent-review-v1` (deterministic gates + screenshots + 5/5 visual consensus). Human review stays valid and immutable against agent overwrite.

## Happy Path
- [x] `reviewStatus` separated from mapping `source`
- [x] Legacy `manual` + `reviewed=true` migrates to `human_reviewed`
- [x] `agent_reviewed` requires provenance (5/5 + evidence hash + aggregationPass)
- [x] Playwright capture matrix (7 views) documented + harness script
- [x] Orchestrator runs five isolated passes then aggregator
- [x] `isReviewedFaceMappingGroundTruth` accepts human **or** valid agent path
- [x] FACE-AUTHORING + design docs

## Edge Cases
- [x] JSON-only / missing screenshots cannot produce `agent_reviewed`
- [x] &lt;5 passes, 4+uncertain, 4+fail, deterministic FAIL ⇒ `human_review_required`
- [x] Stale evidence fingerprints rejected
- [x] `source=manual` cannot fake agent review
- [x] Existing `human_reviewed` cannot be overwritten by agent

## Regression
- [x] Human GT path unchanged for legacy sidecars
- [x] Auto unreviewed still proposal-only

## Screenshots
| Step | Filename |
|------|----------|
| 1 | n/a (contract + offline checks; capture harness writes run evidence) |

## Composition Gate
- Verdict: SKIPPED
- Proof: `.qa/runs/composition-gate-face-anchor-agent-review-v1.md`
- Reason: protocol/aggregation contract; no producer→consumer fan-out in this slice
