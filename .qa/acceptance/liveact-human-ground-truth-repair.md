# Feature: LiveAct Human Ground-Truth Repair (#423)

<!-- #423 — liveact-human-ground-truth-repair -->

## Intent
Reviewed Ground Truth for m5/f5, then Functional Face QA; repair morphs with GT-aware authoring when FaceRig alone fails; publish immutable VRM only after all gates PASS.

## Happy Path
- [x] Stage A: face-anchor-agent-review-v1 → `agent_reviewed` for m5 and f5 (21/21, 5/5).
- [x] Stage B: Functional Face QA against reviewed GT for m5 and f5.
- [x] Stage B: QtMesh FaceRig reauthor on Functional FAIL (full path, MARKER_SIM=2, 3.41.1).
- [x] Stage B: Functional QA metrics PASS after reauthor — **7/7 channels PASS** (Milestone 5).
- [ ] Stage B final visual + publish gate — **BLOCKED** (jawOpen visual grotesque on m5/f5).
- [ ] VRM 1.0 publish + resolver sync — **blocked** (visual FAIL; premature face3 publish rolled back).

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

## Milestone: GT-aware mouthPucker production authoring

### Preconditions
- Milestone 4 complete (`95478d8` baseline); six prior Functional channels PASS
- smile1 morph buffer hashes immutable regression baseline recorded
- m5/f5 reviewed GT with mouth corner + lip anchors

### Postconditions (m5 AND f5)
- [x] `mouthPucker` aus reviewed GT / topology-derived perioral neighborhoods neu authored
- [x] Alter ICT `mouthPucker` vollständig ersetzt (kein additiver Rest)
- [x] Mouth width reduziert; beide Corners bewegen sich inward; bilateral
- [x] Nose / Chin / Eyes / Brows protected
- [x] jawOpen / blinks / browInnerUp / smiles Morph Hashes unverändert vs Milestone-4 Baseline
- [x] Neutral Mesh unverändert; GT carry-forward 21/21
- [x] Functional QA `mouthPucker` PASS; Functional Overall 7/7 PASS
- [x] deterministisch; nur 7/51 Morphs vs FaceRig Base geändert
- [x] Combination probes (pucker+jaw / smiles / blink / brow) ohne Regression
- [x] Noch **kein** Publish / VRM / Resolver / #424

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

**Milestone 5 (mouthPucker) PASS for m5 and f5.**

Supported channels: all seven required Functional channels.
Prior six morph hashes **identical** to Milestone-4 / smile1 baseline.
Input: `*-face3-smile1.glb` → Output: `*-face3-pucker1.glb`.

| Asset | widthRatio before | widthRatio after | L/R inward | PASS |
|-------|-------------------|------------------|------------|------|
| m5 | ≈ 0.975 | ≈ 0.850 | ≈ 0.075 / 0.075 | yes |
| f5 | ≈ 0.998 | ≈ 0.850 | ≈ 0.075 / 0.075 | yes |

Functional Overall **7/7 PASS** (metrics). Final visual sanity **FAIL** on jawOpen → publish blocked; see `qa/final/visual-sanity-verdict.json`.
Evidence: `…/{m5,f5}-face3/qa/pucker1/`

## Screenshots
| Step | Filename |
|------|----------|
| 1 | n/a (offline morph authoring) |

## Composition Gate
- Verdict: SKIPPED
- Reason: offline authoring/QA; no producer→consumer UI fan-out in this milestone


## Final #423 Publish Gate — BLOCKED (Visual Sanity FAIL)

### Verified before STOP
- Phase 0 rebase onto `origin/main` PASS; 7 morph hashes identical to Milestone-5 baseline
- Final GLB freeze (pucker1 → `*-face3-final.glb`) PASS; 7/51 morph regression PASS
- Structural / Anatomy / Semantic / GT / Functional 7/7 PASS (metrics)
- Combination QA PASS (technical)
- Packaged VRM morph parity + Functional PASS (metrics)

### Blocking finding
- Phase 4 visual sanity **FAIL** on `jawOpen` for **m5 and f5**
  - m5: beard/chin/neck stretched into long spikes; shoulder crater artifacts (`qa/final/visual/jawOpen.jpg`)
  - f5: severe neck/chin vertex spike down the chest (`qa/final/visual/jawOpen.jpg`)
- Metric mouthGap (~0.91 / ~1.15) cleared Functional thresholds but is visually grotesque
- Must **not** be fixed via #424 runtime Gain/DeadZone

### Rollback performed
- Resolver remains `…-face1.vrm?v=quality5-face2-vrm2`
- Premature public `…-face3.*` assets removed
- Generic GLB fallback unchanged

### Next (not started)
- Re-author jawOpen with reduced amplitude / tighter neighborhood / stronger beard-chin protection
- Re-run visual + full publish gate
- Do not close #423 until visual PASS

