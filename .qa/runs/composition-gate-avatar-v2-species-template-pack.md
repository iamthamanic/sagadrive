# Composition Gate — avatar-v2-species-template-pack
- HEAD_SHA: ffc6fe5d040ec06edc42562ee42a752565777078
- BASE_SHA: 45a34581378a252f550de48b73e3ae1cb58769d9
- Date: 2026-09-19
- Verdict: CLEAR
## Event
Player picks a species template; picker resolves offline to a family-bound preset with morph/traits/colors and golden preview — no generate provider required at runtime.
## Hop chain
Template id → SpeciesTemplateV1 → bodyFamily + baseBodyAssetId + morph/traits → Editor/Runtime (self-hosted)
## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | 7 templates independent | listSpeciesTemplatesV1 length 7 | pass |
| Invalid/missing | Incomplete pack fails assert | assertSpeciesTemplatePackComplete | pass |
| Two consumers / crash | Offline without provider | no network in domain | pass |
## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | n/a |
## Skip reason
n/a
