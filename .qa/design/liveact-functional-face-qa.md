# LiveAct Functional Face QA V1 (#422)

## Status
Design ready for implementation. Depends on merged #421. No #423 repair work and no #424 retarget tuning in this slice.

## Problem
Structural and Semantic QA can prove that morph targets exist and that delta energy lands in roughly the expected region, but they do not prove that the morph actually performs the promised facial function. A plausible-but-wrong morph can therefore pass while e.g. `jawOpen` barely changes mouth opening or `eyeBlinkLeft` closes both eyes.

## Goal
Add an offline, browser-independent Functional Face QA stage based on reviewed `SagaDriveFaceAnchorsV1` ground truth. For each required core channel, compare neutral anchor geometry against the single morph at weight 1.0 and assert the intended function with versioned, normalized metrics.

## Confirmed decisions
1. Generic humanoid QA only; no m5/f5 filename- or asset-specific thresholds.
2. V1 compares neutral `0.0` vs one isolated channel at `1.0`.
3. Gates use normalized relative geometry, never pixels or absolute world units.
4. `mouthPucker` hard-gates mouth-width contraction; forward protrusion is diagnostic evidence only in V1.
5. Functional QA is additive and runs after Structural → Anchor topology → Anchor anatomy → reviewed GT → Semantic region QA.
6. No Runtime gains, automatic morph repair, React UI, VRM packing, or publish changes in #422.

## What already exists
- `scripts/lib/liveact-face-anchor-anatomy-validate.mjs`: resolves the 21 barycentric anchor bindings on the GLB and already computes neutral `mouthGap`, `eyeOpenL/R`, and `browLiftL/R`.
- `scripts/lib/liveact-face-semantic-validate.mjs`: existing region/side/combination QA and morph-delta inventory.
- `src/domains/character/liveact/liveact-face-metrics.ts`: runtime mathematical reference for normalized mouth/eye/brow metrics.
- `scripts/lib/liveact-face-asset-validate.mjs`: composition point for Structural + Anatomy + Semantic QA and `face-inventory.json`-style output.
- `src/domains/character/avatar/face-mapping-authoring-contract.ts`: reviewed/manual provenance contract from #419.
- `assets/species-3d/FACE-AUTHORING.md`: run-ledger and publish rules.

## Options considered

### Option A — YAGNI: stop at Semantic QA
Do not add Functional QA; rely on region energy and later human visual review.

**Pros:** no new code, no threshold maintenance.  
**Cons:** directly leaves the #422 failure mode open; wrong/no-op functions can still pass.  
**Decision:** reject.

### Option B — Anchor-driven functional evaluator (recommended)
Resolve the reviewed neutral anchor bindings, apply one morph target at weight 1.0 to the exact vertices referenced by those bindings, recompute the same anchors in posed geometry, and derive normalized functional metrics.

**Pros:** reuses the 21 semantic anchors; small offline surface; deterministic; no renderer; asset-scale independent; directly tests user-visible function.  
**Cons:** needs a versioned threshold profile and strict ground-truth provenance handling.  
**New dependencies:** none.

### Option C — Full deformed-mesh/render QA
Build a complete posed mesh or offscreen render per expression and measure from that.

**Pros:** highest visual fidelity and could support richer future QA.  
**Cons:** significantly more moving parts, rendering/runtime coupling, harder fixtures, unnecessary for the seven V1 functional assertions.  
**Decision:** defer; YAGNI for #422.

## Recommendation
Implement Option B.

Confidence: 94%.

## Geometry frame
All signed functional movement uses a face-local frame derived from the neutral reviewed anchors.

- `up` = normalized vector `chin → forehead`.
- `left` = normalized vector `eyeRightOuter → eyeLeftOuter` (anatomical left).
- `forward` = normalized cross product of `left` and `up`; orientation is diagnostic only in V1.
- `faceHeight` = distance `chin ↔ forehead`.
- `mouthWidth0` = neutral distance `mouthCornerLeft ↔ mouthCornerRight`.
- `eyeWidthL0/R0` = neutral canthus width for each eye.

No hard gate may depend on pixels or absolute model units.

## Posed anchor evaluation
For an anchor bound to a triangle:
1. Resolve the referenced primitive and triangle.
2. Read neutral POSITION of the three vertices.
3. Locate the named morph target on that primitive.
4. For the isolated pose, add `POSITION_delta * weight` to each bound triangle vertex; missing target on that primitive contributes zero delta.
5. Recompute the anchor with the existing barycentric weights.
6. Do not mutate the glTF document.

This evaluator hides the design decision “how a morph changes a reviewed anchor” and must be shared by every functional metric.

## Functional metrics

### Shared neutral metrics
- `mouthGap = dist(mouthUpper, mouthLower) / mouthWidth`
- `eyeOpenL/R = dist(eyeUpper, eyeLower) / eyeWidth`
- `browInnerLiftL/R = projection(browInner - eyeInner, up) / eyeWidth`
- `mouthWidthRatio = posedMouthWidth / neutralMouthWidth`
- Per-anchor displacement may also be normalized by `faceHeight` for leakage diagnostics.

### jawOpen
Hard assertions:
- `mouthGapPosed - mouthGapNeutral >= 0.06`
- `noseTip displacement / faceHeight <= 0.04`
- `forehead displacement / faceHeight <= 0.025`

Intent: mouth must actually open while upper-face leakage stays bounded.

### eyeBlinkLeft
Hard assertions:
- `eyeOpenLeftPosed / eyeOpenLeftNeutral <= 0.65`
- `eyeOpenLeftNeutral - eyeOpenLeftPosed >= 0.05`
- opposite-eye relative change `abs(Rposed - Rneutral) / max(Rneutral, eps) <= 0.20`

### eyeBlinkRight
Symmetric to left.

### browInnerUp
Use both inner-brow anchors because the ARKit-style channel is bilateral.

Hard assertions:
- mean of `(browInnerLiftLPosed - Neutral)` and `(browInnerLiftRPosed - Neutral) >= 0.03`
- neither side may move downward by more than `0.01` eye-width units.

### mouthSmileLeft
For the target anatomical left mouth corner:
- `cornerUp = projection(deltaCorner, up) / mouthWidth0`
- `cornerOut = projection(deltaCorner, left) / mouthWidth0` (diagnostic + directional evidence)
- `cornerMotion = length(deltaCorner) / mouthWidth0`

Hard assertions:
- target `cornerUp >= 0.025`
- target `cornerMotion >= 0.03`
- target `cornerUp - oppositeCornerUp >= 0.015`

Do not require a hard minimum for `cornerOut` in V1; record it.

### mouthSmileRight
Symmetric; outward direction is `-left`.

### mouthPucker
Hard assertion:
- `posed mouth width / neutral mouth width <= 0.92`

Diagnostics:
- mouth midpoint displacement on `forward`, normalized by `mouthWidth0`.
- mouthGap delta.

Forward protrusion is not a V1 blocker.

## Threshold policy
Constants live in a versioned functional profile and are generic across humanoid assets.

Suggested identity:
- Contract: `SagaDriveLiveActFaceFunctionalQaV1`
- Profile: `liveact-face-functional-profile-v1`

Threshold changes require a profile-version bump plus cross-asset evidence. Never add filename/model-specific exceptions to make m5/f5 pass; #423 repairs the morphs instead.

## Reviewed Ground Truth gate
Functional QA must fail closed unless all of the following hold:

1. `face-anchors.json` passes topology and Anatomy QA.
2. Separate authoring provenance is supplied.
3. provenance contract is V1, `reviewed=true`, source is `manual | manual_override`, and `reviewedAt` is valid.
4. provenance corresponds to the input asset: compare strong fingerprint fields when available and reject a mismatch.
5. topology fingerprint, when supplied by the provenance, matches the input topology.

CLI/API should make the authoring path explicit rather than silently treating any anchors sidecar as reviewed GT.

If existing provenance for a run lacks the fingerprint needed to establish identity, Functional QA reports a blocking provenance/fingerprint reason; do not silently downgrade to heuristic GT.

## Gate order
```text
Khronos / Structural
  → Anchor topology
  → Anchor anatomy
  → reviewed Ground Truth + asset/topology identity
  → Semantic region QA
  → Functional Face QA
  → existing combination QA
  → publish eligible
```

Functional QA is skipped only when prerequisites are intentionally absent in a non-publish diagnostic mode; in publish/asset gate mode, missing reviewed GT is blocking.

## Output contract
Add `functionalQa` to the face inventory / run ledger. It must be auditable.

Top-level:
- contractVersion
- profileVersion
- pass
- skipped
- blockedByGroundTruth
- violations

Per channel:
- pass
- neutralMetrics
- posedMetrics
- deltas
- thresholds
- violations
- pose weight (=1)

Required diagnostics:
- mouthGap
- eyeOpenL/R
- browInnerLiftL/R
- mouthWidth
- smile corner up/out/motion
- leakage anchor displacement
- optional pucker forward evidence

No opaque aggregate score.

## Integration paths

### New
- `scripts/lib/liveact-face-functional-validate.mjs`
  - hides the decision “evaluate reviewed anchors under isolated morph pose and assert function”.
- `scripts/lib/liveact-face-functional-profile-v1.mjs`
  - hides versioned channel rules and thresholds.
- targeted fixture/check script(s) under `scripts/**`.

### Existing
- `scripts/lib/liveact-face-asset-validate.mjs`
  - compose reviewed GT and Functional QA after Semantic QA.
- `scripts/liveact-face-asset-check.mjs`
  - explicit authoring/provenance CLI argument and functional status in output.
- `assets/species-3d/FACE-AUTHORING.md`
  - document new gate and ledger fields.

Prefer extracting/reusing small anchor-resolution helpers from current anatomy/semantic validators rather than creating a third duplicate resolver.

New dependencies: none.

## Fixtures and regression cases
At least:
1. valid reviewed GT + correct jawOpen → PASS.
2. jawOpen morph has large mouth-region energy but mouthGap barely changes → Semantic can PASS, Functional FAIL.
3. eyeBlinkLeft closes both eyes → Functional FAIL cross-talk.
4. eyeBlinkLeft moves brow/cheek but not lid opening → FAIL.
5. browInnerUp moves brow downward → FAIL.
6. mouthSmileLeft moves right corner or both equally → FAIL.
7. mouthPucker has strong mouth-region energy but mouth width does not contract → FAIL.
8. proposed/unreviewed/auto provenance → blocked.
9. reviewed provenance with asset/topology mismatch → blocked.
10. malformed GLB/anchors/authoring → fail closed.
11. neutral baseline with slightly open mouth → jawOpen still judged by neutral-to-posed delta, not absolute pose.
12. asymmetric neutral face → side tests use each side's own neutral baseline.

The key fixture requirement from #422 is explicit: include at least one deliberately wrong morph that passes Structural + Semantic QA but fails Functional QA.

## Cross-domain matrix
| Domain | Status | Rationale |
|---|---|---|
| KISS | ✅ | Anchor-only posed evaluation; no renderer or new dependency. |
| SOLID | ✅ | Pose evaluation, metric rules, and orchestration have separate decisions. |
| DRY | ⚠️ | Existing anatomy/semantic code duplicates some anchor resolution; implementation should extract/reuse instead of adding a third copy. |
| Security/Data | ✅ | Local static assets only; fail-closed malformed provenance; no personal data. |
| UI/UX | ✅ | No UI in #422. |
| Scaling | ✅ | Work is proportional to required anchors/channels, not a render loop. |
| Testability | ✅ | Deterministic pure geometry with synthetic bad-morph fixtures. |
| Maintainability | ✅ | Versioned explicit thresholds and per-channel evidence, no aggregate magic score. |

Ponytail: stops at rung 2/3 — reuse existing validators and add one focused evaluator/profile; no new dependency or framework.

## Implementation acceptance
- Reviewed GT is mandatory and stale/proposed mappings cannot enter Functional QA.
- The seven required assertions exist: jawOpen, blink L/R, browInnerUp, smile L/R, pucker.
- Every gate is derived from neutral-vs-posed normalized geometry.
- Intentionally wrong morph fixtures demonstrate “Semantic PASS / Functional FAIL”.
- Inventory/run ledger records neutral, posed, delta, threshold and result per channel.
- No m5/f5-specific exception.
- No runtime retarget gain changes.
- `npm run typecheck`, `npm run lint`, `npm run test-gate`, `npm run build` pass.

## Research
- Repo architecture and test-gate rules from `AGENTS.md` / `.qa/project.yaml`.
- Existing Functional-QA intent and required channels from #422 / Epic #418.
- Existing normalized metric semantics from `liveact-face-metrics.ts` and anchor anatomy validator.
- Existing region/side QA from `liveact-face-semantic-validate.mjs`.
- Existing provenance policy from #419 and `face-mapping-authoring-contract.ts`.
- No external dependency or undocumented external algorithm required.

## Open implementation caution
The current authoring contract makes strong fingerprint fields optional. #422 must not invent a false asset match. The implementation should surface a clear blocking provenance/fingerprint reason when the supplied reviewed metadata is insufficient to prove that the anchors belong to the input asset.
