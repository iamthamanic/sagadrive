# Composition Gate — avatar-v2-structure-analyzer

- HEAD_SHA: a8738cb6741a469766f172cb13275037ff6c2b8d
- BASE_SHA: 3ae366a0efd9118b4af9b6b948fe75c84d7a481b
- Date: 2026-09-19
- Verdict: CLEAR

## Event
An owner-scoped AvatarArtifact is scanned for mesh/skeleton/morph/metadata structure; an authoritative AnalysisResult (anatomy + modularity) is derived and may be persisted on the artifact.

## Hop chain
GLB bytes (owner storage) → `extractAvatarStructureEvidenceFromBytes` (@gltf-transform, bounded, no remote URI) → `authoritativeAnalyzeAvatarStructure` (domain) → optional `persistAuthoritativeArtifactAnalysis` (DB analysis_result + analysis_status) → Editor/Runtime consume result (preview path uses authoritative=false)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | 1 artifact scan → 1 AnalysisResult; no fan-out side effects | Pure derive + single row update | pass |
| Invalid/missing | Bad GLB / remote URI / empty mesh → failed/unsupported, no capability invent | parseError / rejectedRemoteUri paths | pass |
| Two consumers / crash | Client forges authoritative=true → rejected; server write only via trusted path | sanitize returns null; RLS/trigger blocks client authoritative | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | n/a |

## Skip reason
n/a
