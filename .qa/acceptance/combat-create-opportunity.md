# Feature: combat-create-opportunity

<!-- Acceptance: Issue #194 — Universelle Kampfaktion „Gelegenheit schaffen“ -->

## Intent
SagaDrive erhält mit **„Gelegenheit schaffen“** eine universelle Hauptaktion für kreative taktische Handlungen im direkten Kampf, die nicht bereits durch eine bestehende Core-Aktion oder ein Kampfmanöver abgedeckt sind. Die Fiktion bestimmt den plausiblen Check bzw. Widerstand; die Regel begrenzt den mechanischen Effekt strikt (nur benannter Vorteil auf Folgechecks), ohne spontane GM-Boni, freie Zustände oder Fate-artige Ergebnisverhandlung.

## Preconditions
- Regelquelle: `docs/sagadrive core rules.md` §2.3, §2.5, §7.3–7.6.
- Rules-Kernel: `src/domains/rules/sagadrive/**` (#94) — UI-freie pure Logik.
- Bestehende Kernaktionen/Manöver (Angreifen, Greifen, Schubsen, …) bleiben verbindlich und haben Vorrang.

## Happy Path
- [ ] Core Rules §7.4 definieren „Gelegenheit schaffen“ als Hauptaktion inkl. Vorrang bestehender Aktionen, Check/Widerstand und aller vier Erfolgsgrade (Erfolg → 1 Folgecheck Vorteil; krit. Erfolg → 2; Fehlschlag → keine Gelegenheit; krit. Fehlschlag → Vorteil für nächste passende Handlung gegen die Figur).
- [ ] Die Regel verbietet ausdrücklich Schaden, freie Zustände, erzwungene Bewegung, Aktionsverlust und spontane numerische Boni als Standardoutput und bewahrt §2.3 (kein allgemeiner Erfolg gegen Preis im direkten Kampf).
- [ ] Rules-Kernel + `scripts/combat-create-opportunity-check.mjs` decken deterministisch ab: bestehendes-Manöver-hat-Vorrang, Erfolg, kritischer Erfolg, kritischer Fehlschlag, kein Self-Stack derselben Gelegenheit auf denselben Check.
- [ ] Bestehende Vorteil/Nachteil-Semantik (§2.5 Folding) bleibt unverändert; Kernel vergibt nur benannte Quellen, keine parallele Würfelmechanik.
- [ ] Touched TypeScript: zero type escape hatches; keine Side-effect-Jobs; Test Gate verdrahtet.

## Edge Cases
- [ ] Intent, der ein definiertes Manöver/eine Kernaktion abbildet → `existing-action-takes-precedence`, kein Create-Opportunity-Check.
- [ ] Keine plausible taktische Wirkung / reine Flavor → `no-plausible-tactical-effect`, kein Check.
- [ ] Folgechecks müssen vor dem Wurf benannt sein; unbenannte Erfolgsgrade erzeugen keine Vorteile.
- [ ] Dieselbe `sourceId` / dieselbe Gelegenheit verstärkt denselben Folgecheck nicht mehrfach.
- [ ] Fähigkeiten/Weltmodule dürfen erweitern, müssen Abweichung aber außerhalb dieses Slice benennen (Out of scope hier).

## Scope
### In
- `docs/sagadrive core rules.md` — §7.4 + Änderungsverlauf
- `src/domains/rules/sagadrive/combat-create-opportunity/**` + Barrel-Export
- `scripts/combat-create-opportunity-check.mjs` + `scripts/test-gate.mjs` Wiring
- `.qa/acceptance/combat-create-opportunity.md`, `.qa/runs/*` proofs

### Out
- `src/app/session/**` / Combat-UI
- Encounter-/Hazard-Engine
- Freie neue Zustände oder numerische Situationsmodifikatoren

## Security Coverage
- Keine neuen Endpoints, Auth-Flächen, Uploads oder Client-Writes — Secure-by-Default Checklist nicht anwendbar für dieses pure Rules-/Docs-Slice (kein Trust-Boundary-Change).

## Regression
- [ ] Bestehende Probe-/Item-/Combat-Validierungen im Test Gate bleiben grün.
- [ ] Keine UI-/Session-Änderungen.

## Assumptions
- Aufrufer (GM/Session-Schicht später) setzt `coversExistingAction` / `hasPlausibleTacticalEffect` und deklariert Folgecheck-IDs vor dem Wurf; Kernel erzwingt die mechanischen Grenzen.

## Composition Gate
- Verdict: SKIPPED
- HEAD_SHA: 8ff021f0eabe5c1a6039b87a0030f956a8516e27
- Reason: single-hop pure rules + docs; no producer→consumer business-event path in this slice
- Proof: `.qa/runs/composition-gate-combat-create-opportunity.md`

## Screenshots
N/A — kein UI-Slice.

## Implementation Notes
- Docs: §7.4 „Gelegenheit schaffen“ + Änderungsverlauf 20.09.2026 in `docs/sagadrive core rules.md`.
- Kernel: `src/domains/rules/sagadrive/combat-create-opportunity/index.ts` — eligibility (existing-action precedence, flavor deny, declared follow-ups), grade→named advantage sources, forbidden outputs (§2.3), §2.5 anti-stack + fold helper; exported via rules barrel.
- Gate: `scripts/combat-create-opportunity-check.mjs` wired in `scripts/test-gate.mjs`; report `.qa/runs/combat-create-opportunity-report.md`.
- Out of scope kept: no Combat-UI, no hazard engine, no free conditions/numeric bonuses.
