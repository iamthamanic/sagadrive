# Acceptance — avatar-animation-retargeting

<!-- seeded for GitHub issue #8 / avatar-order-13 -->

## Intent
Humanoid-kompatible Avatare spielen Idle, Walk, Combat und Emotes über denselben #6 Rig-Vertrag ab. Retargeting nur über kanonische Handles; Attachments folgen; Preview Controls mit Crossfade und Reduced Motion.

## Preconditions
- #7 Avatar Save Export auf `main`.
- `SagaDriveHumanoidRigV1` + AvatarCanvas Runtime vorhanden.

## Happy Path
- [ ] Domain Animation-Contract + allowlisted Katalog (Idle/Walk/Combat/Emote).
- [ ] Supported Actions aus Rig-Capabilities; unsupported erklärt, kein Crash.
- [ ] Infra AnimationRuntime: Mixer, Crossfade, dispose on model change; Tracks nur über #6 Bone-Handles.
- [ ] Rigid Attachment Fixture an Anchor gebunden, folgt Animation.
- [ ] Preview Controls `Idle | Walk | Combat | Emote` (Keyboard + Touch).
- [ ] Reduced Motion: kein Autoplay-Eskalation; Crossfade verkürzt/aus.
- [ ] typed-strict + architecture-boundary + animation-check grün.

## Edge Cases
- [ ] Teilrig → nur unterstützte Actions aktiv.
- [ ] Rapid switching → keine doppelten/stale Actions.
- [ ] Avatar reload → Mixer disposed, Attachment neu gebunden.
- [ ] Capability nie durch Animationserfolg erhöht.

## Scope
In: Domain animation contract/catalog, infra mixer/retarget/fixture, preview UI, checks.
Out: Animationseditor, Two-Hand/Foot IK, Cloth, Gameplay state machine.

## Security Coverage
- Allowlisted clip catalog only (no remote arbitrary animation URLs).
- No client capability escalation.
- Out: Storage/auth N/A for procedural catalog clips.

## Composition Gate
- HEAD_SHA: (set at proof)
- BASE_SHA: (set at proof)
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-avatar-animation-retargeting.md`

## Implementation Notes
(filled after implement)
