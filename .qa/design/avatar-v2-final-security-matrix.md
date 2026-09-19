# Avatar V2 Final Security Matrix (#270)

Fail-closed cases for Avatar V2 closeout. No paid provider calls in CI.

| Case | Expect | Notes |
|------|--------|-------|
| Cross-owner Artifact | deny | RLS / owner scope; ≥2 owners in tests |
| Manipulated `extras.sagadrive` | fail-closed | Never authoritative capabilities |
| Provider success → capabilities | strip / pending | Analyzer owns unlock |
| Free/unsigned provider URL persist | deny | Owner-scoped storage keys only |
| Asset-key / analysis spoof | fail-closed | Server revalidate |

Encoded in `final-acceptance-matrix-v1.ts` → `AVATAR_V2_SECURITY_MATRIX_V1`.
