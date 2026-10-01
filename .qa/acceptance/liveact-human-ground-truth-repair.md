# Feature: LiveAct Human Ground-Truth Repair (#423)

<!-- #423 — liveact-human-ground-truth-repair -->

## Intent
Reviewed Ground Truth for m5/f5, then Functional Face QA; repair morphs with GT-aware authoring when FaceRig alone fails; publish immutable VRM only after all gates PASS.

## Happy Path
- [x] Stage A: face-anchor-agent-review-v1 → `agent_reviewed` for m5 and f5 (21/21, 5/5).
- [x] Stage B: Functional Face QA against reviewed GT for m5 and f5.
- [x] Stage B: QtMesh FaceRig reauthor on Functional FAIL (full path, MARKER_SIM=2, 3.41.1).
- [ ] Stage B: Functional QA PASS after reauthor — **BLOCKED** (FaceRig-only path; other 6 channels still red).
- [ ] VRM 1.0 publish + resolver sync — **blocked until all 7 channels PASS**.

## Milestone: GT-aware jawOpen production authoring

### Preconditions
- m5/f5 reviewed Ground Truth gültig (`agent_reviewed` or `human_reviewed`)
- Candidate identity (modelSha256 + topologyFingerprint + anchorsSha256) gültig
- Existing FaceRig base morph inventory present on candidate GLB

### Postconditions (m5 AND f5)
- [x] `jawOpen` aus reviewed GT / topology-derived neighborhoods neu authored
- [x] Alter ICT `jawOpen` für diesen Channel vollständig ersetzt (kein additiver Rest)
- [x] Keine hardcodierten Asset-/Vertex-IDs / Filename-Hacks
- [x] Neutral geometry unverändert (`jawOpen=0`; GT carry-forward 21/21)
- [x] Functional QA channel `jawOpen` PASS (authoritative gate)
- [x] Nose/Forehead leakage innerhalb bestehender Functional-Grenzen (both 0)
- [x] Output deterministisch (identischer Morph POSITION Buffer Hash bei Rerun)
- [x] Andere Morph Targets unverändert (Hash-Regression; 50/51 unchanged)
- [x] Noch **kein** Publish / Resolver / VRM (andere 6 Channels bleiben rot)

## Edge Cases
- [x] No threshold / gain / deadZone / filename validator exceptions.
- [x] GT carry-forward invariant: neutral topology + bound triangle positions unchanged (21/21) after reauthor.
- [x] Reauthor morph POSITION buffers proven byte-identical to public face1 → same Functional FAIL class (FaceRig path).
- [x] Unreviewed / stale topology / stale SHA / missing anchors / unsupported channel → fail closed (author check).

## Regression
- [x] Generic GLB fallback untouched.
- [x] No #424 retarget changes.

## Stage B Debug (jawOpen)
- [x] Pipeline hops reconstructed for m5 `jawOpen`.
- [x] Mutation test: exporter/canonicalize **preserves** shape-key edits (Case A).
- [x] Root cause: FaceRig does not consume reviewed anchors; MARKER_SIM=2 regenerates face1-identical ICT morphs that do not open mouth at GT lips/chin.
- [x] f5 minimal confirm: same class.
- Evidence: `assets/species-3d/human/runs/quality-20260930-m5-face3/qa/debug-jawopen/ROOT-CAUSE.md`

## Solution Spike (no production code)
- [x] Options A/B/C compared; Option A infeasible (FaceRig CLI has no external marker input).
- [x] Recommended: FaceRig base + GT-aware rewrite of the seven Functional channels.
- [x] jawOpen offline prototype: m5 −0.00049 → +0.074; f5 −0.00863 → +0.077 (both ≥0.06; upper stable; nose/forehead leak 0).
- [x] Design updated: `.qa/design/liveact-human-ground-truth-repair.md` § GT-aware Functional Morph Authoring.
- `/implement ready: YES`

## Implementation Notes
**Milestone 1 (jawOpen only) PASS for m5 and f5.**

Module: `scripts/lib/liveact-face-functional-morph-author.mjs` (+ profile, CLI, behavioral check).
Architecture: FaceRig base morphs → GT-aware full rewrite of `jawOpen` only → Functional QA authoritative.

| Asset | input SHA (16) | output SHA (16) | before gapΔ | after gapΔ | jawOpen |
|-------|----------------|-----------------|-------------|------------|---------|
| m5 | `134f5137019ec5b2` | `c610d9fccd6bc06c` | ≈ −0.00049 | +0.914 | PASS |
| f5 | `a003a7acb04aa0bf` | `fdffea65effff020` | ≈ −0.00863 | +1.148 | PASS |

Evidence:
- `…/m5-face3/qa/jawopen1/` and `…/f5-face3/qa/jawopen1/` (authoring reports, carry-forward, functional-qa, morph-regression, summaries)
- Stage candidates: `*-face3-jawopen1.glb` (not published; historical face1 untouched)

Blink / other channels / VRM / resolver / #424: **not started**.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | n/a (offline morph authoring) |

## Composition Gate
- Verdict: SKIPPED
- Reason: offline authoring/QA; no producer→consumer UI fan-out in this milestone
