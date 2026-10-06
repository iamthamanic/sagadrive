# Composition Gate — basic-look-reference-analysis

- HEAD_SHA: 0a36a42765b541ad57ec96fa457cd8c14a925bfa
- Date: 2026-10-06
- Verdict: CLEAR

## Event
User submits 1–10 look reference images → edge vision analysis → client domain normalize → optional createLookProfileFromReferenceAnalysis persist.

## Hops
1. App/infra `analyzeLookReferences` → edge `look-reference-analysis` (auth, rate limit, mime/owner scope)
2. Edge vision provider → raw JSON payload (no secrets in response)
3. Domain `normalizeLookReferenceAnalysisPayload` → LookProfileWriteDraft or reject
4. Optional `createLookProfileFromReferenceAnalysis` only from normalized draft (source=reference-analysis)

## Simulations
- N=1 style image → structured knobs+palette draft
- Content-only → neutral style defaults; contentNotes kept; content kind preserved
- Invalid/leak payload → normalize fails; create path never called
- Partial bad image → edge 400; no draft saved
- Concurrent consumers: each analyze is request-scoped; no shared mutable look write

## Cardinality
One analyze request → one outcome (ok draft or failure). Persist is explicit separate call, once per successful draft.

## Verdict rationale
Composed path preserves style vs content meaning; invalid analysis cannot become stored profile.
