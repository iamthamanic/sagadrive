# Composition Gate — basic-look-reference-analysis

- HEAD_SHA: 6c9316b5ffaa5d9dcc75741bf0e5206d8a1221b0
- BASE_SHA: 02b6913facebf067c0e90da97bc5a48c7c94c12c
- Date: 2026-10-06
- Verdict: CLEAR

## Event
Authenticated user submits 1–10 look reference images for Basic Look adaption; edge vision returns a raw payload; domain normalization produces a LookProfile write draft or rejects; optional persist creates a profile only from a normalized draft.

## Hop chain
1. Client/infra `analyzeLookReferences` → edge `look-reference-analysis` (JWT auth, rate limit, mime sniff, owner-scoped storage read).
2. Edge vision provider (server secrets only) → JSON payload without API keys.
3. Domain `normalizeLookReferenceAnalysisPayload` → `LookReferenceAnalysisDraft` + `LookProfileWriteDraft` or reject (content refs never auto-style).
4. Optional `createLookProfileFromReferenceAnalysis` persists only a normalized draft (`source: reference-analysis`).

## Simulations
- N-actors: two users analyze concurrently; each request is auth-scoped; rate limit is per userId; no shared mutable look write between actors.
- Invalid/missing: bad mime, >10 refs, provider leak keys, free-text payload, or missing image bytes → edge 4xx or domain reject; nothing saved.
- Two consumers / crash: if the client crashes after edge OK but before normalize/persist, no profile row is written; retry is a new analyze call (idempotent absence of side effects until explicit create).

## Flags
None. Style vs content cardinality preserved end-to-end; invalid analysis cannot become a stored LookProfile.
