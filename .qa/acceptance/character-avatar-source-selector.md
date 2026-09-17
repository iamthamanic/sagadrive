# Acceptance — character-avatar-source-selector

<!-- seeded for GitHub issue #14 / avatar-order-17 -->

## Intent
CharacterEditor bündelt drei Avatar-Quellen (SagaDrive / Import / Meshy) mit gemeinsamem Save-Vertrag; `source` und Capabilities bleiben getrennt.

## Happy Path
- [ ] Drei Source-Cards + genau ein aktiver Flow
- [ ] `source` persistiert; Legacy `provider: m3-character-studio` → sagadrive
- [ ] Capability-Summary ohne erfundene Flags aus Source
- [ ] Dirty SagaDrive → Confirm beim Wechsel zu Import/Meshy
- [ ] typed-strict + avatar-source-selector-check grün

## Scope
In: domain avatar-source, DTO source field, AvatarSourceSelector, CharacterEditor gating.
Out: SkinTokens as source, new capability inventing.

## Composition Gate
- HEAD_SHA: 798418f5686453a653581813a518ddf324d30bb0
- BASE_SHA: 6d1d4e1c3b0edbbfa526b233e5509c3a43c16dc6
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-character-avatar-source-selector.md`

## Implementation Notes
- resolveAvatarSource / evaluateAvatarSourceSwitch
- Morph/Trait-UI nur für sagadrive aktiv
