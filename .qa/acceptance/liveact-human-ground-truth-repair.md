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

## Milestone: GT-aware Blink production authoring (`eyeBlinkLeft` / `eyeBlinkRight`)

### Preconditions
- Milestone 1 complete (`a50ef23` baseline); jawOpen Functional PASS on m5/f5
- jawOpen morph buffer hashes immutable regression baseline recorded
- m5/f5 reviewed GT gültig; FaceRig base + jawOpen1 candidates present

### Postconditions (m5 AND f5)
- [x] `eyeBlinkLeft` und `eyeBlinkRight` aus reviewed GT / topology-derived lid neighborhoods neu authored
- [x] Alter ICT Blink-Morph je Channel vollständig ersetzt (kein additiver Rest)
- [x] Keine hardcodierten Asset-/Vertex-IDs / Filename-Hacks / gender branches
- [x] Neutral geometry unverändert
- [x] Functional QA `eyeBlinkLeft` + `eyeBlinkRight` PASS (authoritative)
- [x] Opposite-eye crosstalk innerhalb bestehender Functional-Grenzen (0)
- [x] jawOpen Morph Buffer Hash unverändert vs Milestone-1 Baseline
- [x] jawOpen Functional weiterhin PASS
- [x] Deterministisch; nur die authored Blink-Channels ändern sich gegenüber Input
- [x] Noch **kein** Publish / Resolver / VRM (brow/smile/pucker dürfen rot bleiben)

## Milestone: GT-aware browInnerUp production authoring

### Preconditions
- Milestone 2 complete (`62ed154` baseline); jawOpen + both blinks Functional PASS
- blink1 morph buffer hashes immutable regression baseline recorded
- m5/f5 reviewed GT with inner/outer brow anchors (21-anchor model)

### Postconditions (m5 AND f5)
- [x] `browInnerUp` aus reviewed GT / topology-derived brow neighborhoods neu authored
- [x] Alter ICT `browInnerUp` vollständig ersetzt
- [x] Keine hardcodierten Asset-/Vertex-IDs / Filename-Hacks / gender branches
- [x] Neutral geometry unverändert
- [x] Functional QA `browInnerUp` PASS (authoritative)
- [x] jawOpen / eyeBlinkLeft / eyeBlinkRight Morph Hashes unverändert vs Milestone-2 Baseline
- [x] Nur 4/51 Morphs vs FaceRig Base verändert
- [x] Combination probes (brow+blink, brow+jaw) ohne Regression
- [x] Noch **kein** Publish / Resolver / VRM (smile/pucker dürfen rot bleiben)

## Milestone: GT-aware mouthSmileLeft / mouthSmileRight production authoring

### Preconditions
- Milestone 3 complete (fachliche Baseline `8c832ac`, branch rebased on `origin/main`)
- jawOpen + blinks + browInnerUp Functional PASS; morph hashes immutable
- m5/f5 reviewed GT with mouth corner anchors

### Postconditions (m5 AND f5)
- [x] korrekter Mouth Corner bewegt sich funktional nach oben/lateral
- [x] Gegenseite bleibt bei unilateralem Smile weitgehend isoliert
- [x] alter ICT Smile Morph vollständig ersetzt
- [x] Nose/Brow/Eyes/Chin protected
- [x] jawOpen / blinks / browInnerUp Morph Hashes unverändert
- [x] Neutral Mesh unverändert
- [x] Functional QA mouthSmileLeft + mouthSmileRight PASS
- [x] deterministisch; nur 6/51 Morphs vs FaceRig Base geändert
- [x] Noch **kein** Publish / VRM (pucker darf rot bleiben)

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
**Milestone 1 (jawOpen only) PASS for m5 and f5.** Baseline commit `a50ef23` — immutable; do not re-author.

Module: `scripts/lib/liveact-face-functional-morph-author.mjs` (+ profile, CLI, behavioral check).
Architecture: FaceRig base morphs → GT-aware full rewrite of required channels → Functional QA authoritative.

| Asset | input SHA (16) | output SHA (16) | before gapΔ | after gapΔ | jawOpen |
|-------|----------------|-----------------|-------------|------------|---------|
| m5 | `134f5137019ec5b2` | `c610d9fccd6bc06c` | ≈ −0.00049 | +0.914 | PASS |
| f5 | `a003a7acb04aa0bf` | `fdffea65effff020` | ≈ −0.00863 | +1.148 | PASS |

Evidence: `…/{m5,f5}-face3/qa/jawopen1/`

**Milestone 2 (eyeBlinkLeft / eyeBlinkRight) PASS for m5 and f5.** Baseline `62ed154` — immutable.

Supported channels after M2: `jawOpen`, `eyeBlinkLeft`, `eyeBlinkRight`.
Evidence: `…/{m5,f5}-face3/qa/blink1/`

**Milestone 3 (browInnerUp) PASS.** Fachliche Baseline `8c832ac` (rebased → `7a8476b`).

**Milestone 4 (mouthSmileLeft / mouthSmileRight) PASS for m5 and f5.**

Supported channels: jawOpen, blinks, browInnerUp, mouthSmileLeft, mouthSmileRight.
Prior morph hashes (jaw/blink/brow) **identical** to Milestone-3 baseline.
Input: `*-face3-brow1.glb` → Output: `*-face3-smile1.glb`.

| Asset | smileL cornerUp | smileR cornerUp | opp isolation | PASS |
|-------|-----------------|-----------------|---------------|------|
| m5 | +0.079 | +0.079 | 0 | yes |
| f5 | +0.079 | +0.079 | 0 | yes |

Evidence: `…/{m5,f5}-face3/qa/smile1/`

pucker / VRM / resolver / #424: **not started**.

## Screenshots
| Step | Filename |
|------|----------|
| 1 | n/a (offline morph authoring) |

## Composition Gate
- Verdict: SKIPPED
- Reason: offline authoring/QA; no producer→consumer UI fan-out in this milestone
