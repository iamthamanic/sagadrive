# Acceptance — avatar-facial-expressions-lipsync

<!-- seeded for GitHub issue #11 / avatar-order-14 -->

## Intent
Modellunabhängige Facial-API: Blink, Basisemotionen und A/I/U/E/O-Mundformen über VRM Expressions mit VRM0/VRM1-Alias-Mapping; fail-soft wenn Shapes fehlen; keine Persistenz transienter Weights.

## Happy Path
- [ ] Canonical keys: blink, neutral/happy/angry/sad, aa/ih/ou/ee/oh
- [ ] VRM0/VRM1 alias map + weight clamp 0..1
- [ ] Layering Blink/Emotion/Viseme ohne stuck weights; Reset → Neutral
- [ ] Preview controls only for available expressions
- [ ] Model reload starts neutral
- [ ] typed-strict + facial-check grün

## Edge Cases
- [ ] Incomplete expression set → missing keys fail-soft
- [ ] Rapid updates → last write wins, no stuck blend
- [ ] Non-VRM model → empty availability, no crash

## Scope
In: Domain facial contract, VRM expression adapter, preview UI, checks.
Out: MediaPipe (#12), Voice/STT.

## Composition Gate
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: CLEAR/SKIPPED
- Proof: `.qa/runs/composition-gate-avatar-facial-expressions-lipsync.md`

## Implementation Notes
(filled after)

## Implementation Notes
- Domain facial-contract + infra avatar-facial-runtime + AvatarFacialPreviewControls.
- Wired into CharacterStudioRuntime/AvatarCanvas; check in test-gate.
