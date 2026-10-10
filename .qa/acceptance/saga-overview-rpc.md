# Feature: Saga-Übersicht als eine rollengefilterte Abfrage

<!-- seeded by ecc-runner from issue #570 on 2026-10-11 — refined after implement -->

## Intent
Stelle eine einzige serverseitige, rollengefilterte Abfrage bereit, die alle Daten für die Saga-Übersichtsseite liefert — ohne Raw-Spielstand an Non-GM.

## Happy Path
- [x] RPC `get_saga_overview` existiert und ist membership-gated (`060_saga_overview.sql`).
- [x] Player-VM enthält keine gm_only Felder (`assertSagaOverviewAudienceSafe` + check).
- [x] GM-VM enthält gm_only (check fixture).
- [x] `useSagaOverview` cached via `entityCache` + refresht on `visibilitychange`.
- [x] Domain-Contract parse/assert getestet via esbuild check (`saga-overview-rpc-check.mjs`).
- [x] Touched files: zero type escape hatches.

## Edge Cases
- [x] 0 Sessions → GM `host-session`, Player/Viewer `wait`
- [x] Project ohne adventure_runtime → leere worldStateSummary
- [x] Observer → `selfRole: viewer`
- [x] Unbekannte Public ID → P0002 / deutscher Fehler
- [x] Lange Consequences → Cap 20

## Regression
- [x] Feed/topic routes untouched (no UI in this issue)
- [x] Column privileges from #569 preserved (service uses RPC only)

## Assumptions
- Story fields from `projects.name/description` until #574
- Recap snippets null until #572

## Screenshots
| Step | Filename |
|------|----------|
| 1 | n/a (no UI) |

## Implementation Notes
- Migration: `supabase/migrations/060_saga_overview.sql`
- Domain: `src/domains/project/contracts/saga-overview.ts`, `use-cases/saga-primary-action.ts`
- Infra: `src/infrastructure/project/saga-overview-service.ts`
- Hook: `src/app/project/hooks/useSagaOverview.ts`
- Check: `scripts/saga-overview-rpc-check.mjs` (wired in test-gate)

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-saga-overview-rpc.md`
- Meaning: membership-gated RPC audience projection matches hub VM; no secret column SELECT from client
