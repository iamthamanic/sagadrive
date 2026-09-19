# Feature: Avatar V2 20/22 — Modular Generate Decomposition Spike

<!-- #268 / Epic #248 — slug: avatar-v2-generate-decomposition-spike -->

## Intent
Reproduzierbare Entscheidung: provider-neutraler Ablauf für editierbare Generate-Avatare ohne bekleideten Mesh-Blob als „full modular“.

## Happy Path
- [x] Golden Matrix vergleicht praktikable Ansätze (Qualität/Kosten/Latenz/Komplexität)
- [x] Default-Pipeline im Design festgeschrieben
- [x] Degraded Fallback: ehrliche Modularity/Capabilities
- [x] Folgeissue (#269) erhält Job-/Artifact-/Role-Contract
- [x] Zero type escape hatches

## Security Coverage
- F-03 / B-07 / B-08 / B-09: N/A — pure domain spike, no client writes / no auth surface
- P-04: Golden fixtures only; no live provider calls in domain module
- Provider answers never authoritatively set roles/slots/capabilities (encoded in decision + job graph)

## Composition Gate
- HEAD_SHA: 5cbbc514eedf105be3bed239e136133cb71f3b05
- Verdict: CLEAR

## Implementation Notes
- Domain: `modular-generate-decomposition-spike-v1.ts` (matrix, decision, handoff for #269)
- Design: `.qa/design/avatar-v2-generate-decomposition-spike.md` + pipeline link
- Check: `scripts/avatar-v2-generate-decomposition-spike-check.mjs` via test-gate
