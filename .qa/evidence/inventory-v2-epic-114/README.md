# Evidence — Inventory v2 epic #114 (integration)

Issue: #114 · Parent: #105

Evidence here is **visual confirmation only**. It does **not** replace automated
assertions in `scripts/test-gate.mjs` (child Inventory-v2 gates +
`inventory-e2e-integration-check.mjs`).

## Required captures (add binaries when available)

| File (suggested) | What to show |
|---|---|
| `01-desktop-grid-equipment.png` | Desktop: populated base grid (occupied + empty slots) beside equipment panel |
| `02-catalog-scopes.png` | Add-catalog with Core / World / Personal (or Core + Eigen when no world) labels |
| `03-container-open.png` | Container open: capacity + contents; container still occupying one base slot |
| `04-legacy-overflow.png` | Legacy overflow section with recover action visible |
| `05-mobile-390-inventar.png` | 390×844 Inventar segment (grid, summary, no horizontal overflow) |
| `06-mobile-390-ausruestung.png` | 390×844 Ausrüstung segment (equipment + Schnellzugriff) |
| `07-test-gate-ref.txt` | Optional paste/reference of a green `npm run test-gate` run for this branch |

## Status

Binaries are **not** checked into this stub. Capture them manually or via Playwright
evidence paths when exercising scenarios A–J; keep gate failures as the source of truth.
