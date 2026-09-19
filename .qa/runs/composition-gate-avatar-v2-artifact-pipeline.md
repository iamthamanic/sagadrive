# Composition Gate — avatar-v2-artifact-pipeline

- HEAD_SHA: 17c31a719a3ecaa0662b04270b9ab19007b16607
- Date: 2026-09-19
- Verdict: CLEAR

## Event
Player materializes a Template / Import / Generate look into one owner-scoped AvatarArtifact and optionally activates it as the single active avatar identity for a character.

## Hop chain
Ingress (template|import|generate mapper) → `materializeAvatarArtifact` (domain, analysis=pending, inactive) → `createAvatarArtifact` / in-memory repo (persist + idempotency) → optional `activateAvatarArtifact` (exactly-one-active) → Analyzer (#252, later) upgrades analysis_status via service_role → UI/Runtime consume logical `avatar-asset:` key (not free URL)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | 1 materialize → 1 row; activate → ≤1 active per (owner,character) | Idempotency returns same row; activate deactivates siblings | pass |
| invalid / missing | Free URL / foreign owner / failed materialization → no active identity | assertOwnerScopedStoragePath throws; cross-owner get null; activate fails on failed | pass |
| 2 consumers / crash | Provider retry with same idempotency_key → same artifact identity | Unique index + repo find-or-return; no second active | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | n/a |

## Skip reason
n/a
