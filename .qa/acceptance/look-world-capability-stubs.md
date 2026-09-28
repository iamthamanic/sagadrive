# Feature: Reserve and document future world Look capabilities

<!-- seeded for #346 look-world-capability-stubs -->

## Intent
Verankere die späteren World-Look-Domains Environment, Sky, Water, Vegetation, Terrain, Props und VFX als explizite, dokumentierte Capabilities im Look-System, damit spätere Renderer nicht separate Style-Systeme einführen.

## Happy Path
- [x] Alle sieben reservierten Domains sind dokumentiert und maschinenlesbar als unsupported/reserved abbildbar.
- [x] Look Editor kann aus denselben Capability-Metadaten „Noch nicht verfügbar“ darstellen, ohne hardcodierte zweite Liste (`listLookCapabilityMetadata` / `lookCapabilityUnavailableLabel`).
- [x] Docs definieren, dass spätere Domain-Renderer denselben LookProfile-Vertrag erweitern statt parallele Style-Systeme einzuführen.
- [x] Unbekannte/unsupported Capabilities werden forward-kompatibel behandelt (`classifyLookCapabilityToken`, parse drops unknowns).
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [x] Neue Capability später ergänzen: Metadata + types gemeinsam erweitern
- [x] Legacy Profil mit unbekannter Capability: unknown classification, no crash
- [x] Reserved Capability ohne Config-UI / keine Fake-Slider

## Regression
- [x] `#339` domain check still green; reserved ids unchanged

## Assumptions
- No Look Editor screen in this slice — metadata API is the UI contract.

## Composition Gate
- Verdict: CLEAR (docs + pure domain registry; no producer→consumer hop)
- Proof: `.qa/runs/composition-gate-look-world-capability-stubs.md`

## Implementation Notes
- Domain: `src/domains/look/capability-metadata.ts`
- Docs: `docs/look-world-capabilities.md`, `.qa/design/look-system.md`
- Gate: `scripts/look-world-capability-stubs-check.mjs`
