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
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: SKIPPED/CLEAR
- Proof: `.qa/runs/composition-gate-character-avatar-source-selector.md`

## Implementation Notes
- resolveAvatarSource / evaluateAvatarSourceSwitch
- Morph/Trait-UI nur für sagadrive aktiv
