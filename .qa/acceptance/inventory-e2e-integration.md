# Feature: Inventory v2 — End-to-end integration, regression gates & Core documentation sync

Issue: #114 (Parent: #105) · Slug: `inventory-e2e-integration`

## Intent
Close the Inventory v2 epic only after the feature is proven as one coherent
contract across domain (#106), catalog (#107/#108/#112), persistence/migration
(#109), desktop/equipment/mobile UI (#110/#111/#113) and Core documentation.
This ticket verifies and documents; it does not redesign the product.

## Preconditions
- Child issues #106–#113 are merged on the integration branch.
- Authoritative rules live in `docs/sagadrive core rules.md` §10 and must match
  the implemented Inventory-v2 slot/stack/load/equipment/container contract.
- `npm run test-gate` wires all Inventory-v2 child gates plus this integration gate.

## Happy Path
- [x] All eight child Inventory-v2 checks are invoked from `scripts/test-gate.mjs`
      (domain, catalog, core-catalog, legacy-migration, desktop-ui, world-catalog-ui,
      equipment-ui, mobile-ui) and the new `inventory-e2e-integration-check` runs after them.
- [x] Architecture boundaries: `src/domains/character/inventory-v2/**` has no React/Supabase
      imports; `src/app/character/inventory/**` does not query `inventory_item_definitions`
      directly and uses `item-catalog-service` / domain ops; equip UI imports `equipItem`.
- [x] Core rules §10 and README state the 13 Inventory-v2 documentation points
      (20 base slots, stack=slot, Strength→load only, equipment slots, two-handed,
      quick refs, containers, Core/World/Personal, editor grant/remove, no world-drop,
      35 Core defs, legacy overflow = compatibility).
- [x] `CORE_CATALOG_SIZE` / 35 remains referenced in `core-catalog.ts` and
      `inventory-core-catalog-check.mjs`.
- [x] CharacterEditor continues to persist `inventory_v2`.
- [x] Composition gate recorded CLEAR for this verify/document worktree.

## Edge Cases / evidence limits
- [ ] **Scenarios A–J (issue body)** are not fully automated as browser E2E.
      Coverage today:
      - Domain ops (add/split/merge/equip/container/quick/consume/remove, overflow):
        `inventory-v2-domain-check` (+ related static UI wiring).
      - Catalog scopes / World isolation / archive: `inventory-catalog-check` +
        world-catalog UI static check — **not** a full dual-world Playwright proof.
      - Core 35 IDs: `inventory-core-catalog-check`.
      - Legacy migration lossless/idempotent/>20: `inventory-legacy-migration-check`.
      - Desktop grid / equipment / containers / quick / mobile segment: static UI
        contracts (#110–#113).
      - Playwright `e2e/inventory-v2.spec.ts`: **smoke only** — Scenario A (Core add +
        no Welt tab without world), Scenario J shell (390 segment + no horizontal
        overflow), desktop equipment pane visibility. **Not** populated World A/B,
        container nesting/capacity, overflow recovery, full equip conflict matrix,
        or Personal lifecycle across users.
      - Playwright `e2e/character-editor.spec.ts` also smokes empty `Inventar 0 / 20`
        and the 390 Inventar|Ausrüstung segment.
- [ ] Focused screenshots under `.qa/evidence/inventory-v2-epic-114/` are listed as
      required stubs; binary captures are optional evidence and **not** substitutes
      for the automated assertions above. Playwright may also write under
      `.qa/evidence/inventory-v2-integration/` when that suite is run.
- [x] Misleading “Keine festen Slots” / “statt fester Slots” wording removed from
      README, Core rules (§10.0.1), `docs/inventory-v2.md`, and active Inventory-v2
      UI help (`InventorySummaryBar` RuleHelp). Legacy `CharacterInventoryPanel`
      copy updated so it no longer contradicts Inventory v2 rules.

## Regression
- [x] `scripts/inventory-e2e-integration-check.mjs` fails closed on missing child
      wiring, architecture regressions, missing doc phrases, catalog size drift, or
      missing `inventory_v2` save path.
- [ ] Full `npm run test-gate` green on this branch is assumed after local run of
      the new script; Playwright suite remains separate from test-gate conventions.

## Security Coverage

| Item | Coverage |
|------|----------|
| Catalog visibility / RLS | Child #107 gate; integration gate asserts UI does not bypass via direct table queries. |
| Owner-scoped Personal | Child gates; no new persistence surface in #114. |
| No silent product reinterpret | Docs + requireMatch lock the 13 epic rules; no shop/world-drop/nested containers added. |

## Assumptions
- Static wiring + domain/catalog/migration gates are the repository’s accepted
  Inventory-v2 CI bar; full interactive scenarios A–J remain a manual / future
  Playwright gap tracked honestly here rather than weakened.
- Evidence binaries may be added later without changing gate assertions.

## Composition Gate
- Verdict: **CLEAR**
- Proof: `.qa/runs/composition-gate-inventory-e2e-integration.md`

## Screenshots
See `.qa/evidence/inventory-v2-epic-114/README.md` (required list; binaries not invented).

## Implementation Notes
| File | Purpose |
|------|---------|
| `.qa/acceptance/inventory-e2e-integration.md` | This acceptance record |
| `docs/sagadrive core rules.md` §10.0.1 | Authoritative 13-point Inventory-v2 contract |
| `docs/inventory-v2.md` | Dedicated 13-rule product contract |
| `README.md` | Inventory uses 20 base slots + load capacity |
| `src/app/character/inventory/InventorySummaryBar.tsx` | RuleHelp mentions slots + load |
| `scripts/inventory-e2e-integration-check.mjs` | Integration regression gate |
| `scripts/test-gate.mjs` | Wires integration check after other inventory checks |
| `e2e/inventory-v2.spec.ts` | Playwright smoke (A/J/desktop — not full A–J) |
| `.qa/evidence/inventory-v2-epic-114/README.md` | Evidence stub list |
| `.qa/runs/composition-gate-inventory-e2e-integration.md` | Composition gate |
