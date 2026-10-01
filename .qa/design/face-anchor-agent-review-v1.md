# face-anchor-agent-review-v1

## Intent
Separate mapping **source** from **review status**. Keep human review. Add a second Ground-Truth path `agent_reviewed` only when deterministic gates + multi-view screenshot evidence + five independent visual passes unanimously PASS (no majority voting).

## Contracts
- `SagaDriveFaceMappingAuthoringV1` — `reviewStatus`: `unreviewed | agent_reviewed | human_reviewed`
- `face-anchor-agent-review-v1` — evidence, passes, aggregator, provenance

## Evidence layout
Under an existing species run directory (no new top-level root):

```text
assets/species-3d/human/runs/<run>/agent-review/
  evidence/
    capture-plan.json
    evidence-manifest.json
    shots/{frontal,yaw_left_35,...}.png
  passes/pass-{1..5}.json
  deterministic-gate.json
  aggregation.json
  provenance.json
```

## Capture matrix (Playwright)
| view | yaw | pitch | framing |
|------|-----|-------|---------|
| frontal | 0 | 0 | face |
| yaw_left_35 | −35° | 0 | face |
| yaw_right_35 | +35° | 0 | face |
| pitch_up | 0 | +18° | face |
| pitch_down | 0 | −18° | face |
| eyes_brows_closeup | 0 | +8° | eyes_brows |
| mouth_nose_closeup | 0 | −6° | mouth_nose |

Controlled neutral pose; LiveAct/animation off; hair/equipment/helper hidden; markers labeled; no prior-review annotations.

## Consensus
5/5 PASS per anchor required. 4/5, uncertain, fail, needsHuman, or deterministic FAIL ⇒ `human_review_required`.

## Human escalation
Human can set `human_reviewed` directly, confirm agent runs, or resolve conflicts. Agent never downgrades `human_reviewed`.

## Non-goals
No QtMesh/morph repair, no V2, no #424, no #423 Stage B in this slice.
