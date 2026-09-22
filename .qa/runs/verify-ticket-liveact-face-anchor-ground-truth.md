# Verify Ticket — liveact-face-anchor-ground-truth (#419)

- Date: 2026-09-22
- Verdict: **PASS**

## Checks (@test-gate)
- `npm run test-gate` → exit 0 (lint/typecheck/build + liveact-face-mapping-authoring-check)

## Acceptance vs diff
| AC | Evidence |
|----|----------|
| Cache-bust query on all sidecar candidates | `face-anchors-manifest-url.ts` + check regression |
| SagaDriveFaceMappingAuthoringV1 | `face-mapping-authoring-contract.ts` + barrel |
| Fail-closed reviewed vs unreviewed | `isReviewedFaceMappingGroundTruth` + validator rejects auto+reviewed |
| test-gate green | PASS |
| typed-strict / no escapes | lint on 3 changed TS files |

## Scope
In: infra URL resolver, domain provenance, author lib, FACE-AUTHORING, checks. Out: UI (#420), reauthoring, DB.
