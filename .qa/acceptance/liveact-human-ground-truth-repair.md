# Feature: LiveAct Human Ground-Truth Repair (#423)

<!-- #423 — liveact-human-ground-truth-repair -->

## Intent
Reviewed Ground Truth for m5/f5, then Functional Face QA; reauthor via QtMesh only on proven Functional FAIL; publish immutable VRM only after all gates PASS.

## Happy Path
- [x] Stage A: face-anchor-agent-review-v1 → `agent_reviewed` for m5 and f5 (21/21, 5/5).
- [x] Stage B: Functional Face QA against reviewed GT for m5 and f5.
- [x] Stage B: QtMesh FaceRig reauthor on Functional FAIL (full path, MARKER_SIM=2, 3.41.1).
- [ ] Stage B: Functional QA PASS after reauthor — **BLOCKED**.
- [ ] VRM 1.0 publish + resolver sync — **blocked by Functional FAIL**.

## Edge Cases
- [x] No threshold / gain / deadZone / filename validator exceptions.
- [x] GT carry-forward invariant: neutral topology + bound triangle positions unchanged (21/21) after reauthor.
- [x] Reauthor morph POSITION buffers proven byte-identical to public face1 → same Functional FAIL class.

## Regression
- [x] Generic GLB fallback untouched.
- [x] No #424 retarget changes.

## Stage B Debug (jawOpen)
- [x] Pipeline hops reconstructed for m5 `jawOpen`.
- [x] Mutation test: exporter/canonicalize **preserves** shape-key edits (Case A).
- [x] Root cause: FaceRig does not consume reviewed anchors; MARKER_SIM=2 regenerates face1-identical ICT morphs that do not open mouth at GT lips/chin.
- [x] f5 minimal confirm: same class.
- Evidence: `assets/species-3d/human/runs/quality-20260930-m5-face3/qa/debug-jawopen/ROOT-CAUSE.md`

## Implementation Notes
**STOP (Stage B):** Existing QtMesh FaceRig recipe deterministically regenerates the same morph deltas as the failing face1 candidates. Blink/brow anchors receive no (or negligible) morph displacement; jaw/smile/pucker fail Functional metrics. Publish forbidden until a non-identical, functionally correct morph authoring path exists (out of #423 Scope B without new DCC pipeline).

Evidence:
- `assets/species-3d/human/runs/quality-20260930-m5-face3/qa/stage-b-stop.json`
- `assets/species-3d/human/runs/quality-20260930-f5-face3/qa/stage-b-stop.json`
- `qa/functional-qa-diagnosis.json`, `qa/gt-carry-forward-invariant.json`, `qa/anchor-morph-coverage.json`

## Screenshots
| Step | Filename |
|------|----------|
| 1 | n/a (offline Functional QA + QtMesh) |

## Composition Gate
- Verdict: SKIPPED
- Reason: asset QA / authoring; no producer→consumer fan-out UI change in this stop
