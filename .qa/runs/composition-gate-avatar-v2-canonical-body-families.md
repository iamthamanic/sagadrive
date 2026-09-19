# Composition Gate — avatar-v2-canonical-body-families

- HEAD_SHA: PLACEHOLDER
- BASE_SHA: 8cd24dc59c6a053f570c92a0b0b4e7915c00d33f
- Date: 2026-09-19
- Verdict: CLEAR

## Event
Runtime/catalog resolves one of three allowlisted self-hosted body family assets; legacy humanoid id maps to standard; publish requires complete morph/region/material evidence and forbids baked clothing.

## Hop chain
Family id / legacy alias → canonical manifest → allowlisted path → self-hosted URL (no remote generate URL) → morph readiness / publish gate

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | 3 families independently allowlisted | three manifests + paths | pass |
| Invalid/missing | Missing morph / baked clothing → not publishable | assertCanonicalBodyPublishable | pass |
| Two consumers / crash | Legacy path still resolves standard | resolveCanonicalBodyFamilyId | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | n/a |

## Skip reason
n/a
