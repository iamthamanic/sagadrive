# Review Ticket — combat-create-opportunity (#194)

- Date: 2026-09-20
- BASE_SHA: 345c56196a0317773318213cefdaf2ee54c119da (`origin/main`)
- HEAD_SHA: 8ff021f0eabe5c1a6039b87a0030f956a8516e27
- Verdict: **ACCEPT**

## Summary
Small, scoped rules+docs slice. New pure kernel module mirrors existing probe/tool-rules patterns; deterministic check script wired into test-gate; no UI or trust-boundary changes.

## Findings

| Severity | Finding | Action |
|---|---|---|
| Info | Session layer must later map fiction → `coversExistingAction` / declared follow-ups | Out of scope (#194); noted for future combat UI |
| Info | `foldNamedAdvantageSources` duplicates script-local fold helpers | Acceptable for kernel purity; consolidate only if a shared domain fold is introduced later |

No Critical / Important findings.

## Architecture
- Lives under `src/domains/rules/sagadrive/**` (#94)
- No React/Supabase; barrel export only
- Docs stay normative source; kernel encodes mechanical limits

## typed-strict
PASS — no escape hatches in touched TS

## Composition gate
SKIPPED (same 8ff021f0eabe5c1a6039b87a0030f956a8516e27) — see `.qa/runs/composition-gate-combat-create-opportunity.md`

## Prerequisites
- `@test-gate` PASS this session
- `@verify-ticket` PASS
