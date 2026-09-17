# Acceptance — avatar-content-pack-v1

<!-- seeded for GitHub issue #217 / avatar-order-15 -->

## Intent
Kuratiertes Fantasy-/Sci-Fi Content Pack v1 mit vollständigen Metadaten (Rig/Morph/Fit/MToon/Lizenz), Setting-Filter im Picker, ohne Remote-URLs.

## Happy Path
- [ ] Mindestumfang je Kategorie erreicht (`assertContentPackV1Minimums`)
- [ ] Assets tragen rig/morph/fit/material/license/provenance
- [ ] Trait catalog sourced from content pack
- [ ] Picker Setting-Filter Fantasy/Sci-Fi/Alle + empty state
- [ ] typed-strict + content-pack-check grün

## Scope
In: domain content-pack-v1, catalog wiring, picker filter, checks.
Out: Marketplace, mesh binaries, inventory equipment.

## Composition Gate
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: SKIPPED/CLEAR
- Proof: `.qa/runs/composition-gate-avatar-content-pack-v1.md`

## Implementation Notes
(filled after)

## Implementation Notes
- content-pack-v1.ts + trait-catalog sourced from pack; TraitCardPicker setting filter; avatar-content-pack-check in test-gate.
