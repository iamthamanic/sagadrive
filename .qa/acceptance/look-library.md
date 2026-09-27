# Feature: Add Looks to the SagaDrive Library

<!-- seeded by ecc-runner from issue #343 on 2026-09-27 — refined in implement -->

## Intent
Ergänze die SagaDrive-Bibliothek um den Bereich „Looks“. Nutzer können ihre gespeicherten LookProfiles visuell durchsuchen und, abhängig von Berechtigungen, erstellen, duplizieren, bearbeiten oder archivieren. Die Bibliothek ist der einzige kanonische Einstieg für Look-Authoring.

## Happy Path
- [x] `Bibliothek > Looks` ist über die vorhandene App-Navigation/History-Routing erreichbar und besitzt Loading-, Empty-, Error- und Success-State.
- [x] Look-Karte zeigt mindestens Preview/Fallback, Name, Stilfamilie, Version und Status sowie nur zulässige Aktionen.
- [x] „Look erstellen“ und „Bearbeiten“ führen zu kanonischen Look-Routen (`/looks/create`, `/looks/:id`); keine parallele Editor-State-Maschine in der Library-Liste.
- [x] Read-only Nutzer können Looks ansehen, aber keine mutierenden Aktionen auslösen (`canMutateLooks` / `canMutate`).
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [x] Noch keine Looks → Empty-State mit DE-Copy
- [x] Preview fehlt / nicht ladbar → Fallback-Icon
- [x] Look archiviert → Status-Badge; Archivieren-Aktion ausgeblendet
- [x] Duplicate/Archive schlägt fehl → Error + Toast
- [x] `canMutate=false` → keine Create/Edit/Duplicate/Archive-CTAs

## Regression
- [x] Bestehende Library-Tabs (Charaktere, NPCs, Abenteuer, Welten, Items) unverändert erreichbar
- [x] Gate: `node scripts/look-library-check.mjs` + `test-gate` wiring

## Assumptions
- Full Look Editor landet in #344; create/edit routes are shareable stubs only.
- Depends on #340 LookProfile persistence (merged).

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-look-library.md`
- HEAD: d4303e8c7690fa71e852a8ff3884add3d5328eb1

## Implementation Notes
- Domain filter: `src/domains/look/library-query.ts`
- Library slice: `src/app/library/looks/**`
- Route stubs: `src/app/look/**` + shell routes `look-create` / `look-edit`
- Contract: `scripts/look-library-check.mjs`
