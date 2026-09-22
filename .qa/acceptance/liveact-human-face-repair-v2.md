# Feature: LiveAct 6/10: Human m5/f5 Face Assets gegen Semantic-QA reparieren und neu publizieren

<!-- #402 — liveact-human-face-repair-v2 -->

## Intent
Re-author m5/f5 nur soweit nötig, bis beide Human-Bases die neuen Face-Anchor- und Semantic-Morph-Gates bestehen.

## Happy Path
- [x] Structural Validator + FaceAnchor Validator on published m5/f5 (core-v1, `--anchors`).
- [ ] Semantic Morph Validator V2 PASS for both (blocked — see Implementation Notes).
- [x] Run-Ledger: QtMesh 3.41.1 + `MARKER_SIM=2`, fit max ≤8%, `face-anchors.json`, `face-inventory.json`.
- [x] No m5/f5-specific runtime / filename retarget hacks.

## Edge Cases
- [x] Fit ≤8% (m5 ~0.92%, f5 ~1.29% residual after ab2 ship GLBs).
- [x] Gaze: morphs mode in ab2 ledger.

## Regression
- [ ] Feed and topic routes still load (unchanged this slice)

## Implementation Notes
**Shipped assets:** Restored pre-epic396 stash GLBs (`wip: pre-epic396 face ab2 ship leftovers`) — dense morphs vs degenerate 2–8 vert channels on prior public files.

**Anchors:** `scripts/lib/liveact-face-anchor-heuristic.mjs` + morph-seeded `face-anchors.json` per run.

**Semantic QA (#401):** Side split from eye anchors; head-only energy mask on full-body meshes. Fresh QtMesh re-auth (MARKER_SIM=2, max-residual 8) reproduces same semantic failures on jaw/mouth core channels — morph energy classifies as nose/forehead leakage or below 0.34 expected ratio.

**Blocker for full close:** Profile `minExpectedEnergyRatio: 0.34` / `maxForbiddenLeakageRatio: 0.24` not met for `jawOpen`, `mouthSmile*`, `mouthPucker`, `mouthShrugLower` on full-body skinned humans without a semantic-profile or FaceRig follow-up.

**Check commands:**
```bash
node scripts/liveact-face-asset-check.mjs --input public/assets/avatars/species/human-male-quality-20260921-m5-face1.glb --baseline public/assets/avatars/species/human-male-quality-20260921-m5.glb --profile core-v1 --anchors assets/species-3d/human/runs/quality-20260921-m5-face1/face-anchors.json --out assets/species-3d/human/runs/quality-20260921-m5-face1/face-inventory.json
node scripts/liveact-face-human-repro-check.mjs
node scripts/liveact-face-semantic-validator-check.mjs
```
