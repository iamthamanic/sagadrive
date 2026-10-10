# Composition Gate — saga-overview-rpc

- HEAD_SHA: 9123aa278846d08acd396add82c56a4c21213715
- Date: 2026-10-11
- Verdict: CLEAR

## Event
Authenticated member requests saga hub overview for a public saga id.

## Hop chain
`useSagaOverview` → `sagaOverviewService.getOverviewByPublicId` → RPC `get_saga_overview` (SECURITY DEFINER) → `sagadrive_project_shared_adventure` audience filter → JSON VM → `parseSagaOverview` / `assertSagaOverviewAudienceSafe` → `entityCache` → (UI consumer in #571)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | Each member gets role-scoped projection; GM sees gm_only; player does not | RPC uses `is_project_gm` + shared adventure filter; client re-asserts | pass |
| invalid / missing | Unauth / non-member / unknown id → error, no leak | Raises 42501 / P0002; service maps to DE errors; no table SELECT of secrets | pass |
| 2 consumers / crash | No queue/worker; cache stale-while-revalidate; visibility refetch | No fan-out side effects; cache key per publicId | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason
n/a — single read path with audience meaning verified CLEAR
