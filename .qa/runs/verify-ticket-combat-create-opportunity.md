# Verify Ticket — combat-create-opportunity (#194)

- Date: 2026-09-20
- HEAD: WORKTREE (uncommitted on `issue-194-combat-create-opportunity` from `345c561`)
- Verdict: **PASS**

## Checks (@test-gate)

- Command: `npm run test-gate` (project.yaml checksCommand)
- Result: **PASS** (exit 0)
- Includes: `scripts/combat-create-opportunity-check.mjs` → PASS
- Secrets diff: PASS
- Dependency audit: informational, no critical/high

## Acceptance match

| Happy Path / Edge | Evidence |
|---|---|
| §7.4 docs define action + 4 grades + precedence | `docs/sagadrive core rules.md` |
| Forbidden outputs + §2.3 success-at-cost | kernel `CREATE_OPPORTUNITY_FORBIDDEN_OUTPUTS` + docs |
| Kernel tests: precedence, success, crit-success, crit-failure | `combat-create-opportunity-check.mjs` |
| §2.5 anti-stack / no 3d20 | `selectApplicableOpportunitySources` + `foldNamedAdvantageSources` |
| typed-strict / no side-effect jobs | check: no `any` / `as unknown as`; pure rules only |

## Scope

- In: docs, rules kernel, check script, test-gate wiring, QA acceptance/runs
- Out untouched: `src/app/session/**`, hazard engine, free conditions

## Security

- No new endpoints/auth/uploads — Secure-by-Default N/A for this slice

## Ergebnis

**PASS**
