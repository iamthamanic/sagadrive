# LiveAct Human Ground-Truth Repair (#423)

## Status
Design ready for staged implementation. Depends on merged #422. No #424 retarget tuning in this slice.

## Problem
The current m5/f5 `face2` runs pass Structural + Anatomy + Semantic QA, but their ledgers explicitly state that the shipped GLB morphs are unchanged from `face1`. Those runs predate Functional Face QA, so there is no evidence yet that the real `jawOpen`, Blink L/R, `browInnerUp`, Smile L/R and `mouthPucker` morphs actually perform the promised facial function.

## Goal
Create separate 21/21 human-reviewed Ground Truth for m5 and f5, run the current candidate face assets through the full Structural → Anatomy → reviewed-GT → Semantic → Functional QA chain, re-author through the existing QtMesh FaceRig path only when Functional QA proves a real failure, and then publish new immutable VRM + GLB fallback + sidecar versions with synchronized resolver cache-busts.

## Non-goals
- No runtime gain/deadZone tuning. That belongs to #424.
- No m5/f5 filename-specific validator or runtime exceptions.
- No Auto/Manual Face Mapping algorithm changes.
- No new DCC/FaceRig pipeline.
- No DB/backend work.
- No in-place overwrite of historic public face assets.

## Confirmed decisions
1. Publish new immutable asset filenames (next face generation, e.g. `face3`) instead of overwriting the existing `face1` public files.
2. If any required Functional QA channel fails, rerun the existing full QtMesh FaceRig authoring path; do not introduce per-morph hand-patching as a second authoring system.
3. Reviewed anchors may be carried forward after reauthoring only when neutral topology, neutral vertex positions for every bound triangle, binding identities and semantic surfaces are proven unchanged. Otherwise human review is required again.
4. m5 and f5 each require their own independent 21/21 human review. No Ground Truth transfer between genders/assets.

## Current repository evidence
- `assets/species-3d/human/runs/quality-20260921-m5-face2/run.json` and f5 equivalent report Structural/Semantic success but `GLB morphs unchanged from face1`.
- Current resolver still points to `human-*-...-face1.vrm?v=quality5-face2-vrm2`.
- `scripts/liveact-face-authoring-qtmesh.mjs` is the existing reproducible QtMesh authoring path.
- `scripts/lib/avatar-vrm-pack.mjs` packages validated GLB into VRM 1.0 without changing morph geometry.
- #422 provides `SagaDriveLiveActFaceFunctionalQaV1` and reviewed provenance gating.
- Historical #402 established immutable public asset versions and same-recipe m5/f5 policy.
- #424 explicitly requires Functional Asset PASS before retarget tuning.

## Essential sequencing constraint
Human review remains a valid Ground-Truth path and cannot be replaced or downgraded by agents.

Additionally, `face-anchor-agent-review-v1` may produce `agent_reviewed` Ground Truth only when:

- deterministic technical gates PASS,
- multi-view labeled screenshot evidence exists for the candidate fingerprints,
- five independent visual agent passes unanimously PASS (5/5, no majority voting).

Any conflict ⇒ `human_review_required` (stop for human).

Therefore #423 is intentionally a **two-stage implementation**:

```text
Stage A — agent/preflight
  inspect current m5/f5 candidates
  prepare exact review targets + run dirs
  prove current candidate identity
  STOP for human review OR run face-anchor-agent-review-v1

Stage B — after valid GT (human_reviewed OR agent_reviewed)
  ingest reviewed GT
  validate provenance/fingerprints
  run full QA
  IF Functional PASS:
      no reauthoring
      publish new immutable face generation
  IF Functional FAIL:
      diagnose failed channels
      rerun full QtMesh FaceRig
      prove neutral geometry/topology compatibility
      carry reviewed GT only if invariant proof passes
      otherwise STOP for re-review
      rerun full QA
      publish only after all gates pass
```

No code path may silently replace a review stop with auto anchors lacking provenance.

---

# Options

## Option A — YAGNI: keep current face1/face2 assets
Do not revalidate current Human assets against Functional QA and defer any repair to #424/runtime tuning.

**Codebase fit:** no implementation work.

**Pros:** zero asset churn.

**Cons:** violates #423/#424 sequencing; runtime tuning could mask defective morph geometry; current ledgers explicitly lack Functional QA evidence.

**Decision:** reject.

## Option B — staged reviewed-GT gate + conditional full FaceRig rerun (recommended)
Human-review each current candidate, run the new Functional QA first, and only invoke QtMesh if a channel actually fails. Repackage and publish a new immutable generation after all gates pass.

**Codebase fit:** reuses existing Face Setup export, Functional QA, QtMesh authoring, VRM packer, run ledger and resolver.

**Pros:** smallest repair surface; preserves good existing morphs; objective failure evidence; no parallel DCC path; deterministic audit trail.

**Cons:** requires one explicit human-review interruption, and possibly a second review if reauthoring changes neutral topology.

**New dependencies:** none.

## Option C — unconditional QtMesh reauthoring before review
Always regenerate m5/f5 morphs first, then review and validate the new result.

**Pros:** guarantees a fresh FaceRig output.

**Cons:** throws away potentially valid assets before measuring them, increases risk/churn, and makes it harder to distinguish “existing morph defect” from “new authoring regression”.

**Decision:** reject.

## Recommendation
Option B — measure current assets against reviewed Ground Truth first, then repair only proven Functional failures.

Confidence: 95%.

---

# Stage A — Preflight and Human Review Handoff

## A1. Exact candidate asset
Ground Truth must be authored against the exact **QA/pack candidate GLB**, not against a different VRM byte stream.

Reason:
- Functional QA binds provenance to the candidate GLB.
- VRM packaging changes bytes/metadata and therefore cannot be the provenance source for the pre-pack QA gate.
- Existing public VRMs are useful runtime outputs, not the Ground-Truth QA input.

For each asset, Stage A must identify one exact candidate GLB path + SHA-256 and use that path consistently for:
- Face Setup manual review,
- `face-anchors.json`,
- `face-mapping-authoring.json`,
- Semantic/Functional QA,
- eventual VRM pack input.

If the existing public GLB fallback is the chosen candidate, use it consistently. If the run-local canonical GLB is chosen, use that consistently. Do not mix them just because topology appears similar.

## A2. New run directories
Create new run IDs; do not mutate historic face1/face2 run ledgers.

Recommended naming:
- `assets/species-3d/human/runs/quality-<YYYYMMDD>-m5-face3/`
- `assets/species-3d/human/runs/quality-<YYYYMMDD>-f5-face3/`

Before human review, the run may contain a preflight/manifest that records:
- source candidate path
- source SHA-256
- baseline body GLB path + SHA
- current resolver path/cache-bust
- current morph count
- topology fingerprint
- expected reviewed export filenames

It must not claim reviewed status.

## A3. Human review procedure
m5 and f5 are reviewed separately.

For each:
1. Load the exact candidate GLB from A1 in Face Setup.
2. Inspect/correct all 21 anchors.
3. Every anchor must be semantically valid and bound to an allowed surface.
4. Mark Ground Truth reviewed.
5. Export:
   - `face-anchors.json`
   - `face-mapping-authoring.json`
6. The authoring file must be `manual` or `manual_override`, `reviewed=true`, canonical `reviewedAt`, and contain matching strong candidate identity.

No Auto export may be converted to reviewed by editing JSON.

## A4. Stage A stop contract
After preparing review targets, the implementation agent must STOP and report:
- exact m5 GLB path + SHA
- exact f5 GLB path + SHA
- run dirs
- exact filenames/locations where reviewed exports must be placed
- any preflight blocker

No QtMesh rerun and no publish before the reviewed files exist.

---

# Stage B — Reviewed QA, Conditional Repair, Publish

## B1. Ingest and identity gate
For each asset:
- 21/21 bindings required.
- `SagaDriveFaceMappingAuthoringV1`.
- source = `manual | manual_override`.
- `reviewed=true`.
- canonical `reviewedAt`.
- `anchorsSha256` matches exact reviewed anchors bytes.
- `modelSha256` matches candidate GLB.
- topology fingerprint matches current candidate.
- anatomy QA passes.

Mismatch = fail closed. Do not “refresh” hashes without proving why the asset changed.

## B2. Baseline full QA
Run the exact current candidate before any reauthoring:

```text
Khronos / Structural
→ Face anchor topology
→ Face anchor anatomy
→ reviewed GT identity
→ Semantic QA
→ Functional QA
→ combination QA
```

Record per required Functional channel:
- neutral metrics
- posed metrics
- deltas
- thresholds
- pass/fail
- violations

Required channels:
- `jawOpen`
- `eyeBlinkLeft`
- `eyeBlinkRight`
- `browInnerUp`
- `mouthSmileLeft`
- `mouthSmileRight`
- `mouthPucker`

## B3. PASS path
If all required gates already pass:
- do **not** rerun QtMesh just to generate new bytes;
- preserve existing validated morph geometry;
- create new immutable face3 publish artifacts carrying reviewed GT + Functional QA evidence;
- the run ledger explicitly records `reauthoringRequired=false` and references the source morph checksum.

This avoids unnecessary reauthoring while still producing the new audited generation required by #423.

## B4. FAIL path
If any Functional channel fails:
1. Record exact failing channel(s) and metrics.
2. Do not alter generic thresholds.
3. Do not add asset-specific validator/runtime exceptions.
4. Run the existing **full** QtMesh FaceRig authoring path for that asset using the same baseline recipe/pinned tooling.
5. Produce a new candidate GLB in the face3 run.
6. Record old/new GLB hashes and morph target evidence.

No ad-hoc “patch only jawOpen vertices” branch.

## B5. Reviewed Ground Truth carry-forward after reauthoring
Because morph target deltas can change while neutral geometry stays identical, human Ground Truth may be carried forward only after a deterministic invariant check.

The invariant check must prove, for every reviewed anchor binding:
- same mesh/node identity
- same primitive identity
- same triangle indices
- same neutral POSITION values for the bound triangle vertices
- same barycentric binding
- same allowed semantic surface identity
- same relevant topology fingerprint

Additionally compare whole-asset neutral topology/preservation metrics where available.

If all invariants pass:
- reuse the reviewed `face-anchors.json`;
- generate provenance for the new candidate with the new `modelSha256` and same `anchorsSha256`;
- keep the original human review timestamp as review evidence;
- set `source=manual_override` when the candidate identity has been rebound after morph-only reauthoring;
- ledger must explicitly record `groundTruthCarryForward=true`, source candidate hash, target candidate hash, invariant proof and original review timestamp.

If any invariant fails:
- `groundTruthCarryForward=false`;
- STOP;
- require the human to review the new candidate GLB again;
- no Functional publish gate may run with stale reviewed provenance.

Do not extend the V1 provenance contract solely to encode carry-forward; run ledger evidence is sufficient for this slice.

## B6. Post-repair QA
After reauthoring/carry-forward or re-review, rerun the entire gate chain. A repaired asset is publishable only when:
- Structural PASS
- Anatomy PASS
- Semantic PASS
- Functional PASS
- combination QA PASS
- no preservation regression

m5 and f5 pass independently; one passing must not mask the other failing.

---

# Immutable publication

## New public generation
Publish new files, not overwrites.

Use one coherent generation token for the run, for example:

```text
human-male-...-face3.glb
human-male-...-face3.vrm
human-male-...-face3-face-anchors.json
human-male-...-face3-face-mapping-authoring.json

human-female-...-face3.glb
human-female-...-face3.vrm
human-female-...-face3-face-anchors.json
human-female-...-face3-face-mapping-authoring.json
```

Exact naming may follow existing project conventions, but m5/f5 must use the same generation scheme.

Historic face1/face2 assets remain unchanged.

## VRM pack
Use existing `packAvatarVrm1`.

Before pack:
- `face-inventory.json` must show complete PASS including `functionalQa.pass=true`.
- reviewed GT provenance must be valid.

After pack verify:
- VRM 1.0 Khronos validation
- skeleton/humanoid preservation
- PBR/material/texture preservation
- expected morph expression binds
- single gaze ownership path
- both blink presets/custom aliases where expected
- morph count/support not regressed

The packer itself must not become a second Functional QA implementation.

## Resolver + cache-bust
Only after both public outputs exist and pass:
- update `src/domains/character/avatar/species-template-models-v1.ts`
- point masculine/feminine first-party Human entries to the new immutable VRM paths
- use one synchronized new cache-bust generation token
- published face-anchor + authoring sidecars must correspond to the same generation
- Generic GLB fallback remains published/supported

Never update the resolver before both target assets are present and validated.

---

# Run ledger requirements
Each m5/f5 face3 run must contain at minimum:
- `face-anchors.json`
- `face-mapping-authoring.json`
- `face-inventory.json`
- `run.json`
- `vrm-pack.json` after publish
- `qtmesh-report.json` only when QtMesh actually ran, or explicit `reauthoringRequired=false` evidence when it did not

`run.json` must make the decision trail auditable:
- source candidate path/hash
- reviewed anchor hash
- provenance identity
- baseline Functional result
- failed channels, if any
- `reauthoringRequired`
- authoring tool pin/recipe when rerun
- repaired GLB hash
- Ground Truth carry-forward proof or re-review requirement
- final Functional result
- packed VRM hash
- public filenames/cache-bust

Do not write a fake QtMesh report on the PASS/no-reauthor path.

---

# Tests / verification

## Static/tooling checks
Add/extend checks that prove:
1. publish is blocked when `functionalQa.pass !== true`.
2. publish is blocked for unreviewed/stale/mismatched GT.
3. historic public files are not overwritten.
4. resolver generation requires both m5 and f5 published candidates.
5. resolver VRM + sidecar cache-bust/generation agree.
6. GLB fallback remains supported.
7. failed Functional channel does not trigger threshold mutation or runtime gain edits.
8. no m5/f5 filename-specific logic is added to generic validators.

## Carry-forward regression
Synthetic/fixture check:
- same neutral topology + changed morph deltas → carry-forward allowed.
- changed bound neutral vertex → carry-forward rejected.
- changed triangle/index/binding → rejected.
- changed topology fingerprint → rejected.

## Asset evidence
For both actual assets record the final seven Functional channel results.

## Browser/manual smoke
Before merge/publish decision, visually inspect controlled poses on the new m5 and f5 candidate:
- jawOpen
- blink L/R
- browInnerUp
- smile L/R
- pucker

This is an asset smoke, not #424 retarget calibration. No webcam/RAW→APPLIED tuning in #423.

---

# Cross-domain matrix
| Domain | Status | Rationale |
|---|---|---|
| KISS | ✅ | Reuses reviewed mapping, Functional QA, QtMesh and VRM packer; only reruns authoring on measured failure. |
| SOLID | ✅ | Human review, QA decision, authoring, packaging and resolver publication remain separate responsibilities. |
| DRY | ✅ | One QtMesh recipe and one Functional validator; no per-asset repair implementation. |
| Security/Data | ✅ | Static local assets/metadata only; no webcam recordings or backend data. |
| UI/UX | ✅ | Existing Face Setup is reused; no new product UI required. |
| Scaling | ✅ | Two first-party assets; staged process avoids unnecessary expensive authoring. |
| Testability | ✅ | QA metrics, hashes and carry-forward invariants are deterministic. |
| Maintainability | ✅ | Immutable generations + explicit ledgers remove the current “face2 in face1 filename” ambiguity. |

Ponytail: stops at rung 2/3 — reuse existing validation/authoring/packaging and add only orchestration/invariant checks needed for safe conditional repair. No new dependency/framework.

---

# Implementation sketch

## Likely affected paths
```text
.qa/design/liveact-human-ground-truth-repair.md
  design/source of truth

scripts/liveact-face-authoring-qtmesh.mjs
scripts/lib/liveact-face-authoring-qtmesh.mjs
  only if needed to accept reviewed GT/full Functional gate in the existing run flow;
  hides the existing FaceRig recipe, not new repair semantics

scripts/lib/liveact-face-asset-validate.mjs
scripts/liveact-face-asset-check.mjs
  reuse #422 Functional gate; only small orchestration hooks if required

scripts/lib/<focused neutral-binding invariant helper>.mjs
  only if no existing helper can prove safe reviewed-GT carry-forward;
  hides “is this the same neutral reviewed surface after morph-only reauthoring?”

assets/species-3d/human/runs/<new m5 face3 run>/**
assets/species-3d/human/runs/<new f5 face3 run>/**
  immutable QA/authoring evidence

public/assets/avatars/species/<new face3 assets + sidecars>
  immutable published outputs

src/domains/character/avatar/species-template-models-v1.ts
  one final resolver switch after both outputs are valid

assets/species-3d/FACE-AUTHORING.md
  only if the staged reviewed-GT/carry-forward procedure is not already documented
```

New dependencies: none.

Architecture/foundations:
- Functional correctness remains hidden behind the #422 validator.
- FaceRig generation remains hidden behind the QtMesh authoring module.
- Neutral-binding equivalence is one decision and should live in one focused helper, not scattered across publish scripts.
- Public asset selection remains hidden behind `species-template-models-v1.ts`.
- Avoid a new “human-face3-special” framework; this ticket is asset orchestration plus evidence.

---

# Acceptance
- m5 and f5 independently have 21/21 human-reviewed Ground Truth tied to the exact QA candidate.
- Both pass Structural, Anatomy, Semantic and Functional QA with generic profiles.
- Current morphs are measured before any repair.
- QtMesh is rerun only for an asset with actual Functional failure.
- Any reauthored asset documents different input/output checksums and the failing channels that triggered the rerun.
- Reviewed GT is reused after reauthoring only with deterministic neutral/binding invariant proof; otherwise user re-reviews.
- New immutable GLB/VRM/anchor/authoring generations are published for both assets.
- Resolver points to the new VRMs only after both are present and validated.
- Generic GLB fallback remains supported.
- No runtime gain/deadZone changes and no #424 work.
- `npm run typecheck`, `npm run lint`, `npm run test-gate`, `npm run build` pass.
- Relevant Browser E2E is green, but unrelated known auth flakes are handled separately rather than changing asset code.

## Research
- Repo architecture and gates: `AGENTS.md`, `.qa/project.yaml`.
- Current m5/f5 provenance: face2 `run.json` / inventories.
- Existing authoring path: `scripts/liveact-face-authoring-qtmesh.mjs`.
- Existing packaging path: `scripts/lib/avatar-vrm-pack.mjs`.
- Current publication resolver: `species-template-models-v1.ts`.
- Reviewed GT contract: `face-mapping-authoring-contract.ts` + offline mirror.
- Functional QA design/implementation from #422.
- Historical immutable asset policy from #402/#405.
- No external dependency or undocumented external algorithm is required.

## Ready for implementation?
Stage A Ground Truth is satisfied (`agent_reviewed` for m5/f5).

Stage B Functional repair is **not** achievable by re-running the existing QtMesh FaceRig recipe alone (see Root Cause + debug evidence). Implementation of **GT-aware Functional Morph Authoring** (below) is required before Functional PASS / VRM publish.

`/implement ready: YES` for that authoring slice — jawOpen offline proof passed on m5 and f5 without hardcoded vertex IDs. Remaining channels follow the same module contract; blink/smile side-isolation is the main residual risk and must be proven in the first implement milestone.

---

# GT-aware Functional Morph Authoring

## Root Cause (proven)
The wired QtMesh FaceRig path (`qtmesh facerig <file> [-o] [--max-shapes] [--max-residual] [--json]` + `QTMESH_FACERIG_MARKER_SIM=2`) is a **deterministic ICT-template morph generator**. It:

- never receives SagaDrive `face-anchors.json` (`buildFacerigArgv` has no anchor flag; CLI has no marker-file input — binary usage string evidence);
- drives 13 internal ICT markers / proportional defaults;
- regenerates face1-identical morph POSITION buffers for m5/f5 face3;
- creates real morphs that still fail Functional QA at reviewed anchors (e.g. jawOpen chin Δ=0, parallel lip translation).

Exporter/canonicalize preserve intentional shape-key edits (mutation Case A). Failure is authoring geometry vs GT, not packaging.

Evidence: `assets/species-3d/human/runs/quality-20260930-m5-face3/qa/debug-jawopen/ROOT-CAUSE.md`.

## Chosen architecture
**Option B shell + Option C rewrite for the seven required channels** (YAGNI hybrid):

```text
baseline / face candidate GLB
      ↓
QtMesh FaceRig base (optional keep for non-required ~44 morphs)
      ↓
GT-aware functional morph authoring  ← NEW single module
  (rewrite ONLY: jawOpen, eyeBlinkLeft/Right, browInnerUp,
   mouthSmileLeft/Right, mouthPucker)
      ↓
canonicalize + Structural/Anatomy/Semantic/Functional/Combination QA
      ↓
VRM pack + resolver (only if functionalQa.pass === true)
```

- **Not Option A:** FaceRig CLI cannot consume external SagaDrive markers without forking/patching QtMeshEditor (out of scope; high coupling).
- **Not full Option C for all 51:** YAGNI — only seven Functional-required channels need GT-correct deltas; keep FaceRig inventory for the rest unless Semantic/Functional demands otherwise.
- **Not additive-only Option B:** f5 spike showed FaceRig jawOpen nose/forehead leakage survives additive repair; **per-channel rewrite** of the seven targets is required.

## Module boundary (one design decision)
One offline lib owns GT→delta authoring:

`scripts/lib/liveact-face-functional-morph-author.mjs`

(+ thin CLI `scripts/liveact-face-functional-morph-author.mjs`)

Responsibility: given Document + reviewed `SagaDriveFaceAnchorsV1` + channel contracts → rewrite named morph POSITION accessors. No runtime imports. No threshold-lock loops against the validator.

QA (`liveact-face-functional-validate.mjs`) stays an independent consumer.

## Inputs / Outputs
**Inputs**
- glTF Document (post-FaceRig or existing face GLB with named morphs)
- reviewed `face-anchors.json` (21 barycentric bindings)
- channel id ∈ required seven
- face frame derived from anchors (up/forward/faceHeight) — reuse Functional QA frame helpers where possible

**Outputs**
- mutated morph target POSITION for that channel only
- evidence JSON: affected vertex count, max weight, anchor displacements, pre/post gap (or channel metrics), morph buffer sha

## Channel contracts (authoring goals ≠ copying QA thresholds as loop)
Each channel declares:
- `targetAnchors` / `fixedAnchors`
- `side` (`left|right|center|bilateral`)
- `desiredDisplacement` in face-local frame (normalized by faceHeight)
- `falloff` (euclidean from anchors; optional soft midplane gates)
- `forbiddenRegions` (nose/forehead/opposite-eye etc.)
- acceptance **intent** documented; Functional QA remains the gate

Example jawOpen (spike-proven):
- move: mouthLower + chin neighborhoods downward (−up) with slight −forward
- fix: mouthUpper, noseTip, forehead (weight→0)
- rewrite entire `jawOpen` accessor (clear ICT leakage)

## Spike proof (temporary, not production assets)
`qa/spike-gt-morph/jawopen-prototype-v3-metrics.json`:

| Asset | mouthGapΔ before | after | ≥0.06 | upper stable | nose/forehead leak |
|-------|------------------|-------|-------|--------------|--------------------|
| m5 | −0.00049 | **+0.074** | PASS | yes | 0 / 0 |
| f5 | −0.00863 | **+0.077** | PASS | yes | 0 / 0 |

No hardcoded vertex indices; neighborhoods from reviewed anchors + faceHeight-scaled radii.

## Failure modes
- Topology/anchor fingerprint mismatch → fail closed (no silent GT apply)
- Missing morph name → fail (do not invent Shape_N)
- Channel cannot meet geometric intent within maxAmp → fail authoring step (do not loosen QA)
- Side leakage on unilateral channels → fail before publish

## QA gates (unchanged order)
Structural → topology/binding → Anatomy → GT validity → Semantic → Functional → Combination → pack contracts.

## Scope / Non-scope
**In:** offline GT-aware rewrite of seven morphs; run ledger; immutable face3 publish when PASS; resolver sync.

**Out:** QtMesh fork; new DCC; runtime gain/deadZone (#424); Perfect Fidelity V2; generic sculpt engine; asset filename exceptions.

## Migration from current FaceRig path
1. Keep `liveact-face-authoring-qtmesh.mjs` as optional base inventory producer (or reuse existing face1 morph inventory as base bytes).
2. Insert functional morph author step before canonicalize / inventory.
3. Record `faceAuthoringProvider` trail: `qtmesh-facerig+gt-functional-morph-author-v1`.
4. Do not claim FaceRig alone repaired Functional QA.

## Rollback
Omit GT author step → previous FaceRig-only GLB (known Functional FAIL). Public/resolver unchanged until PASS.

## Files for `/implement`
**New**
- `scripts/lib/liveact-face-functional-morph-author.mjs`
- `scripts/liveact-face-functional-morph-author.mjs`
- `scripts/liveact-face-functional-morph-author-check.mjs` (fixtures + jawOpen contract check)
- optional: `scripts/lib/liveact-face-functional-morph-profile-v1.mjs` (channel contracts)

**Reuse**
- `scripts/lib/liveact-face-functional-validate.mjs` (frame/metrics patterns — do not import as authoring oracle loop)
- `scripts/lib/liveact-face-semantic-validate.mjs` region classifier ideas (neighborhoods)
- `scripts/lib/liveact-face-anchor-*.mjs` binding resolve
- `scripts/lib/liveact-face-authoring-qtmesh.mjs` canonicalize
- `scripts/lib/avatar-vrm-pack.mjs`
- `src/domains/character/avatar/species-template-models-v1.ts` (publish only)

**Deps:** none new.

**Size:** one focused offline author module + CLI + check + run orchestration; no UI.

**Tests:** unit fixtures for jawOpen gap/stability; extend per channel; full asset check on m5/f5; test-gate wiring; no production publish inside unit tests.
