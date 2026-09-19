# Composition Gate — avatar-v2-body-family-compatibility

- HEAD_SHA: 0d41aebedbb11188af55a2c57101f887c8e4dd03
- BASE_SHA: b62ccc6c1f294ec4cd9e0876fe7a4b49d30bd446
- Date: 2026-09-19
- Verdict: CLEAR

## Event
A humanoid AvatarArtifact receives a BodyProfile from normalized proportions and a FamilyCompatibilityResult recommending standard/compact/heavy only above threshold (else custom).

## Hop chain
Structure Analysis / metric lengths → `bodyProfileFromMetricLengths` → `resolveFamilyCompatibility` → optional persist `body_profile` + `family_compatibility` on artifact → Editor reads recommendation (no auto-convert)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | 1 artifact → 1 profile + 1 compatibility result | Pure functions; single JSON columns | pass |
| Invalid/missing | Missing height/bones → insufficient-evidence/custom | validationStatus path | pass |
| Two consumers / crash | Best score under threshold → custom (no forced family) | threshold gate | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | n/a |

## Skip reason
n/a
