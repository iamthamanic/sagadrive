# Feature: Avatar V2 18/22 — Custom Creature „Original behalten“ Vertical Slice

<!-- #266 / Epic #248 — slug: avatar-v2-custom-creature-flow -->

## Intent
Faruk-artige freie Körperformen bleiben first-class: Originalgeometrie, nur verfügbare Capabilities, Humanoid-Conversion nur optional als Interpretation.

## Preconditions
- #265 Custom Rig Benchmark on main
- #261 Import Original + #263 Conversion + #264 Rig V2

## Happy Path
- [x] Faruk-like path: Import→Analyze→Original behalten ohne Humanoid-Zwang
- [x] UI empfiehlt Original und erklärt eingeschränkte Standardkleidung
- [x] Capabilities granular; fehlendes Auto-Rig kein harter Flow-Fehler
- [x] Conversion-Einstieg nennt Custom→Humanoid „humanoide Interpretation“
- [x] Touched files: zero type escape hatches

## Edge Cases
- Kein Auto-Rig → limited/usable mit vorhandenem Rig
- Kein Hand-Anchor → kein hand-held Equipment
- Editor erzwingt keinen Humanoid-Morph-State

## Scope
### In
- Domain custom-creature original flow + UI guidance
- Wire import ready-custom + editor keep without morph force
### Out
- Custom garment auto-fit
- Creature animation library

## Security Coverage
- Existing owner/asset/capability trust boundaries (F-03/B-01 out of new surface)
- Capabilities never from provider success (#265) — editor seed keeps `capabilities: []`
- No free URLs / no secrets in flow artifacts

## Composition Gate
- HEAD_SHA: WORKTREE
- Verdict: (pending)

## Implementation Notes
- Domain: `src/domains/character/avatar/custom-creature-flow-v1.ts`
- UI: `AvatarCustomCreatureGuidance.tsx` wired in `AvatarImportPanel`
- Editor keep toast + morph evidence fail-closed for custom-creature
- Check: `scripts/avatar-v2-custom-creature-flow-check.mjs` (test-gate)
- Design: `.qa/design/avatar-v2-custom-creature-flow.md` + pipeline §6
- Boy Scout: barrel-export `#265` `custom-rig-benchmark-v1` (was missing on main)
