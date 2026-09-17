# Composition Gate — avatar-humanoid-morph-contract-v1

- HEAD_SHA: 5a95dfaa0bf10a4f403c023b07ed59aadcbc12c4
- BASE_SHA: 061a428aa83a1060fd874f0c4919f2ae9c8a6e15
- Date: 2026-09-17
- Verdict: CLEAR

## Event
Untrusted morph JSON (or legacy CharacterAvatarDto) is validated into SagaDriveAvatarMorphV1; later editors/export/wearables read the same keys.

## Hop chain
Producer (client/API morph payload or legacy avatar DTO)
→ validateAvatarMorphInput / migrateCharacterAvatarDtoToMorph (domain)
→ optional CharacterAvatarDto.morph attach via withAvatarMorphState
→ consumers (#213 assets, #215 UI) read known keys + metadata only
→ resolveAvatarMorphCapabilities from evidence flags (not client claims)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One morph state per avatar appearance | single validate/migrate → one state object | pass |
| Invalid/missing | Unknown keys ignored; bad numbers → 0/clamp; capabilities from client ignored | validateAvatarMorphInput fail-safe | pass |
| Two consumers / crash | Re-validate same input → identical state; merge deterministic | JSON-stable merge replica in check | pass |

## Flags
(none)

## Skip reason
n/a — producer→consumer contract across tickets, but no side-effect fan-out in this diff
