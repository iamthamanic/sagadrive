# Feature: Validate gear, resources, tools & carry load

Issue: #32 (Epic: #18) · Slug: `validate-gear-resources-load`

## Intent
Ausrüstung, Traglast und das abstrakte Ressourcenmodell (§10 / §5.7) sind
regelkonform validiert und im Character-Editor nutzbar: Script Findings 0;
Inventar zeigt Charakter-Ressourcen 0–5 inkl. Affordability; Playwright sichert
Traglast-, Waffen-/Werkzeug- und Ressourcen-Flows inkl. Save/Reload.

## Preconditions
- #19 / #21 closed; item rules kernel (`src/domains/rules/sagadrive/items`) present.
- Live Inventar = `CharacterInventoryV2Panel` (legacy panel unmounted).
- DB column `characters.resources` JSONB exists.

## Happy Path
- [ ] Script `scripts/validate-gear-resources-load.mjs` → report Findings: 0; wired in test-gate.
- [ ] Editor Inventar: Ressourcen Default 3, Range 0–5, persistiert; Last/Cap sichtbar.
- [ ] Affordability: Kosten < Res → Add frei; = → Kauf (−1) oder Geschenk; > → Block + Geschenk-Override.
- [ ] Playwright: Traglast unter/über/doppelt Cap; Item-Add mit Kosten/Traits; Ressourcen; Affordability; Save/Reload.
- [ ] Trait-UI bleibt Freitext / bestehende Checkboxen; keine Währungs-UI; kein Core-Doc-Edit.

## Edge Cases
- Hochwertiges Werkzeug: nur explicit-advantage-only, kein erfundener Bonus (Script).
- Fehlendes essentielles Werkzeug → impossible (Script).
- Finesse / Durchdringung X: Mechanik im Script; UI speichert Trait-String.
- Geschenk-Override senkt Ressourcen nicht.
- Manuelles Hochsetzen der Ressourcen = erlaubte Story/GM-Erholung.

## Security Coverage
- F-01 / B-01: resources write only via owner-scoped character update (existing RLS path).
- P-04: no secrets in validate script / E2E evidence.
- Non-applicable: B-07 marketplace, P-02 public UGC — out of scope.

## Composition Gate
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-validate-gear-resources-load.md`

## Implementation Notes
- Domain: `src/domains/rules/sagadrive/items/resource-affordability.ts` (+ barrel export).
- Persist: `CharacterVm.abstractResources` ↔ `characters.resources.sagadriveAbstract`.
- UI: resources Select on `InventorySummaryBar`; `InventoryAffordabilityDialog` on catalog add.
- Script: `scripts/validate-gear-resources-load.mjs` wired in `test-gate.mjs`.
- E2E: `e2e/validate-gear-resources-load.spec.ts` + evidence dir.
