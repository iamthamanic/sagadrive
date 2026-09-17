# Acceptance — item-avatar-fit-workbench

<!-- seeded for GitHub issue #160 / avatar-order-21 -->

## Intent
Item-Workbench: „Avatar / Ausrichtung“ mit Default-Anchor, Transform-Edit, Reset; kein 3D → disabled.

## Happy Path
- [ ] Default Anchor je Item-Typ
- [ ] Section in Workbench; Reset; no-3d state
- [ ] Transform clamped via #158 helpers
- [ ] typed-strict + check grün

## Scope
In: item-avatar-fit-defaults, ItemAvatarFitSection, editor wiring.
Out: Full binding persistence API, skinned fit, Playwright (covered by check).

## Composition Gate
- HEAD_SHA: fd8edaa3bd392ab1899273cf65bec4f28e170890
- BASE_SHA: 24929cb001ea6dbacb004d250d8193c284a0772f
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-item-avatar-fit-workbench.md`
