# Composition Gate — basic-look-adaption-ux

- HEAD_SHA: PENDING
- BASE_SHA: 1070c9284db6e4a06bb33dfffe26b53fe34a4052
- Date: 2026-10-06
- Verdict: CLEAR

## Event
User creates a Look from visual references (or reanalyzes an existing Look): upload/classify images → analyze → editable draft in Preview Stage → explicit save creates profile/version.

## Hop chain
1. LookCreateChooser / LookReferenceAdaptionFlow collects 1–10 refs (STYLE|CONTENT).
2. `analyzeLookReferencesForDraft` → edge vision + domain normalize (#352).
3. `uiDraftFromAnalysisDraft` → LookEditorWorkspace Preview Stage (no persist).
4. Explicit Speichern → createLookProfile / appendLookProfileVersion (reanalyze never auto-saves).

## Simulations
- N-actors: each user analyzes under own auth; drafts are local until save; no shared silent write.
- Invalid/missing: <1/>10, bad MIME, analysis error → refs retained; Retry; nothing saved.
- Two consumers / crash: crash after analyze before Speichern leaves no new version; prior version unchanged on reanalyze path.

## Flags
None. Analysis does not persist; Speichern is the only write hop.
