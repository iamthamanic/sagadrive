# Composition Gate — avatar-v2-asset-authoring-pipeline

- HEAD_SHA: PLACEHOLDER
- BASE_SHA: e1a24f8e336952cf78eb58d67354a722857500fd
- Date: 2026-09-19
- Verdict: CLEAR

## Event
An authoring run generates candidates via a provider-neutral generation contract, scores them against golden criteria, and publishes a versioned manifest with provenance and checksum.

## Hop chain
Authoring request → Generation adapter (Meshy today / Tripo later) → candidates + evidence → `validateAssetAuthoringCandidate` → `selectAssetAuthoringCandidate` → `createAssetAuthoringManifest` + `assertCanPublishAuthoringAsset` → published first-party asset record (no runtime change in this ticket)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | N candidates → 1 selected publish | select by score; single manifest checksum | pass |
| Invalid/missing | Unknown provider / bad rig / missing provenance → fail closed | assertAuthoringUsesGenerationContract; validation blockers; publish gate | pass |
| Two consumers / crash | Provider unavailable does not mutate existing assets; retry explicit | no side-effect on published set in this slice | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | n/a |

## Skip reason
n/a
