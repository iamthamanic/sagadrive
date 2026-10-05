# Composition Gate — look-editor-workspace

- Issue: #344
- Feature slug: look-editor-workspace
- HEAD_SHA: a2464b68cfb08b723fb973c6a8063bb550915ac8
- BASE_SHA: 29854f1ab2f961c1d94864e4810b9f647ae04d0c
- Verdict: CLEAR

## Event
Author saves/duplicates a LookProfile from the canonical Look Editor (create or append version).

## Hop chain
LookEditorWorkspace / useLookEditor → look-service (`createLookProfile` | `appendLookProfileVersion` | `duplicateLookProfile`) → supabaseLookProfileRepository (optimistic `current_version` bump) → LookProfileRecord + LookProfileVersion rows. Preview stub (#345) has no consumer hop yet.

## Simulations
- N-actors: concurrent save → repository conflict message surfaced once in UI (no double version claim).
- Invalid/archived: append rejected; UI read-only for archived.
- Two consumers: Library browser only lists/links; no second authoring controls; knobs round-trip via `sagadrive:look-knobs-v1:` reference only.

## Flags
none

## Skip reason
N/A — CLEAR
