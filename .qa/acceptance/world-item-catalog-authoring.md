# Feature: Inventory v2 — World-profile item catalog authoring

Issue: #112 (Parent: #105, Depends on: #107, #108) · Slug: `world-item-catalog-authoring`

## Intent
Give World-profile editors a complete UI (`Ausrüstung & Gegenstände`) to create
and maintain World-scoped item definitions so the `world` catalog scope from
#107 is authorable without changing Core or using manual database configuration.

## Preconditions
- Migrations 015/016 applied; catalog persistence (#107) and Core catalog (#108).
- Personal authoring form (#110) reused for World create/edit with `mode="world"`.
- World profile must exist (`world.id`) before item authoring is enabled.

## Happy Path
- [x] Existing World editor contains `Ausrüstung & Gegenstände` with search/filter/list/create/edit/archive/restore.
- [x] Every created definition is bound to the current World profile and cannot leak to another world.
- [x] Form fields/validation are semantically identical to #110 Personal definitions.
- [x] Core clone creates a new World definition and never mutates/shadows Core by ID.
- [x] Archived definitions disappear from new-add catalog while owned instances remain resolvable.
- [x] Character catalog shows source labels Core/Welt/Eigen.
- [x] Cross-world mutation is rejected by #107's persistence/security layer.

## Edge Cases
- [x] New (unsaved) world shows muted note: save world first before authoring items.
- [x] Empty World catalog explains characters still have the full Core catalog.
- [x] Archive confirmation uses World-specific copy; restore via list or form.
- [x] Core-Vorlage prefill opens create form; save yields new World-scoped ID.

## Regression
- [x] `npm run test-gate` green with `scripts/inventory-world-catalog-ui-check.mjs`.
- [ ] Interactive create/edit/archive/clone covered when Playwright harness allows.

## Security Coverage
- World writes go through `createWorldDefinition` / `updateDefinition` /
  `archiveDefinition` / `restoreDefinition` (RLS via #107).
- Client cannot choose an arbitrary target world id in the form — `worldProfileId`
  is taken from the edited World profile.
- No direct Supabase table access from worlds/inventory UI.

## Composition Gate
- Verdict: **CLEAR** (UI composition only; domain/infrastructure unchanged aside from
  `loadWorldProfileItemCatalog` facade).
- Domain stays pure; UI consumes infrastructure service + `listCoreItemDefinitions`.

## Implementation Notes
- Service: `loadWorldProfileItemCatalog` in `item-catalog-service.ts`.
- Form: `PersonalItemFormDialog` gains optional `mode` / `worldProfileId` /
  `template` / `archived`; exports `draftFromDefinition`.
- UI: `WorldItemCatalogSection` in World editor after Modules; dialog `max-w-3xl`.
- Character catalog rows badge scope as text: Core / Welt / Eigen.
- Static gate: `scripts/inventory-world-catalog-ui-check.mjs` after desktop UI check.
- Out of scope: Core editing, shops/loot, consumable auto-effects, nested containers, 3D.
