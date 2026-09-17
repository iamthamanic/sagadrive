# Composition Gate — avatar-morphable-base-bodies-v1

- HEAD_SHA: 6d68a1ca42b382aaa1fd775deebec9ad9730f12a
- BASE_SHA: 8850105eea4e734e9948c2184af973494bba86f0
- Date: 2026-09-17
- Verdict: CLEAR

## Event
Base body morph readiness is resolved from declared targets vs present mesh evidence; species presets produce one morph state for later UI/export.

## Hop chain
Producer (mesh morph-target evidence / simulateCompleteMorphTargetEvidence)
→ resolveBaseBodyMorphCapabilities (domain)
→ flags morph-body-v1 / morph-face-v1 or limitations
→ BaseBodyMorphFixture readout / later #215 controls
→ Species: deriveSpeciesMorphState → mergeAvatarMorphPresets (#212)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | One readiness report per evidence set | single resolve call | pass |
| Invalid/missing | Missing targets → no caps (fail closed) | empty present → flags [] | pass |
| Two consumers / crash | Re-resolve same evidence → same flags; cache version gate | deterministic resolver + isBaseBodyCacheCompatible | pass |

## Flags
(none)

## Skip reason
n/a
