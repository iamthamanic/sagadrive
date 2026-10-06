# Composition Gate — canonical-saga-workspace

- HEAD_SHA: 77ddb63aac3236bb7a39e211952413d185fb9365
- BASE_SHA: a9ed5de3ab0fa9aca951c574d3c1e19065272e72
- Date: 2026-10-06
- Verdict: CLEAR

## Event
User creates, lists, opens, or joins a Saga; UI navigates to canonical `/sagas/:sagaPublicId/**` using server-issued public IDs. Persistence stays on projects table via project-service.

## Hop chain
Dashboard/Library/SagaCreateForm/ProjectJoin (UI) → project-service create/join/list → ProjectVm.publicId → pathForSagaSection → SagaResourceScreen sections (membership/RLS on subsequent loads)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 create → overview | Navigate once to SA-* overview | onCreated(publicId) → pathForSagaSection | pass |
| Join without publicId | Error toast; no fake route | Guard before navigate | pass |
| Open from list/dashboard | Same canonical overview URL | pathForSagaSection(publicId, overview) | pass |
| ProjectJoin create tab | Removed; create CTA → /sagas/new | join-only surface | pass |
| Legacy labels | No „Projekt starten“ / „Abenteuer (Projekt)“ in journeys | Dashboard/Library/SessionJoin/ProjectJoin | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason
n/a

