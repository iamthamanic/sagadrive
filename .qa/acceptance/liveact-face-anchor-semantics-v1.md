# Acceptance: Face Anchor Semantics + MediaPipe realignment (#421 follow-up)

<!-- feature-slug: liveact-face-anchor-semantics-v1 -->

## Intent
Nach dem ersten Canonical Human Live-Test: SagaDrive-Semantik der 21 Face Anchors explizit dokumentieren und Auto Mapping (MediaPipe samples + surfaces + GT) daran ausrichten — ohne GT-Pixel zu hardcoden und ohne #422/#442.

## Happy Path
- [ ] Design contract `.qa/design/liveact-face-anchor-semantics-v1.md` definiert alle 21 Anchors.
- [ ] MediaPipe map: mouthUpper/Lower = lip body midpoints (0+13 / 14+17); chin = 175+199; forehead = 151+10; brow centers = full eyebrow centroids.
- [ ] `oral_interior` class rejects Teeth/Tongue for all anchors.
- [ ] GT freeze requires surface-OK bindings; Eyes/Eyelashes/Teeth → not valid GT; UI shows ungültig.
- [ ] Auto prefers same-ray expanded depth before screen-snap; diagnostics keep original vs resolved.
- [ ] Relational semantic tests (mouth y-order, brow center between, oral reject) pass in auto-check.
- [ ] typecheck / lint / test-gate / build + relevant face-mapping checks green.

## Edge Cases
- Unlabeled `unknown` skin still OK for face_skin-expecting anchors.
- Landmark 13/14 alone must not be used as mouthUpper/Lower samples.
- No normative pixel thresholds invented.

## Out of scope
#422 Functional Expression QA, V2 / Epic #442, dense 478 solver, merge of PR #452.

## Security Coverage
- N/A (local authoring / offline MediaPipe; no new auth or UGC endpoints).

## Implementation Notes
- Semantics contract + MediaPipe realignment (lip body, chin pad, forehead, brow centroids).
- `oral_interior` + GT surface fail-closed + same-ray expanded depth before snap.
- Relational checks in `liveact-face-mapping-auto-check.mjs`; evidence report template ready for next live run.
