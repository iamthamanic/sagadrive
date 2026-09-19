# Review Ticket — avatar-v2-starter-wardrobe (#257)

- Date: 2026-09-19
- BASE_SHA: 4bd2bd9a2a1105451efe20caffc683d4d0e33c48
- HEAD_SHA: 976e4174cf61b19cea131ecad3bd39a86e212513
- Verdict: ACCEPT

## Scope
Domain Wearable Manifest v2 + golden fixtures + check script. No UI, no API.

## Architecture
- Pure domain under `src/domains/character/avatar/` — matches #94
- Reuses fit-range, equipment hide regions, canonical families, species family map
- No second inventory/equipment state machine

## Findings
| Severity | Finding | Action |
|----------|---------|--------|
| Info | GLB binaries not shipped — paths + golden JSON descriptors (same pattern as #255/#256) | OK for this ticket; binary authoring is asset pipeline |
| Low | Runtime attach deferred to #258 | Documented Out of scope |

## Typed-strict
PASS — no escape hatches on touched files.

## Composition
CLEAR — proof .qa/runs/composition-gate-avatar-v2-starter-wardrobe.md
