# Audit Changes — character-presets

- Date: 2026-09-02
- Verdict: **WARN**
- Branch: `feat/character-presets`
- HEAD: `b7458019865d20a7e94c6f016ac5abed5a7bb093`
- PR: https://github.com/iamthamanic/sagadrive/pull/92

## Scope
- Mode: pr (`origin/main...HEAD`)
- Base: `cea1e6dbfa52dac93538b2dd59e71064dd303bc3` (`origin/main`)
- Files: 23 (~+1714/−41)
- Packages: frontend (Vite React) + supabase migration
- Depth: standard

## Phase A — Deterministic (`@test-gate` standard)
| Check | Command / probe | Result |
|-------|-----------------|--------|
| checksCommand | `npm run test-gate` | PASS (exit 0) |
| lint | `npm run lint` | PASS |
| typecheck | `npm run typecheck` | PASS |
| build | `npm run build` | PASS |
| presets regression | `scripts/character-presets-regression-check.mjs` | PASS |
| editor regression | `scripts/character-editor-regression-check.mjs` | PASS |
| typed-strict | RG on changed TS | PASS |
| secrets diff | RG on `main...HEAD` | PASS |
| secureByDefault | F-03 / B-10 / P-06 | PASS (no matches; no worker path) |

## Phase B — Security
| Check | Result |
|-------|--------|
| Secrets in diff | PASS |
| .env staged | PASS (none) |
| Owner RLS on `character_presets` | PASS (`owner_user_id = auth.uid()`, published forced false) |
| Snapshot validation before write | PASS (`assertValidSnapshot`) |
| AgentShield | SKIPPED (`.cursor/` not in scope) |

## Phase C — Review lite
- Verdict contribution: warn (UI proof gaps only)
- Tags: `hoare:` (validation preconditions present), `parnas:` (service vs UI boundaries OK)

| Severity | Tag | File | Issue | Action |
|----------|-----|------|-------|--------|
| medium | hoare | e2e/character-presets-smoke.spec.ts | Smoke covers chooser + empty Preset tab only; no live save/release/from-preset browser lock | acknowledge; optional follow-up e2e |
| note | race | characterPreset.service.ts | Duplicate-level guard is read-then-append (no DB unique on level); two concurrent tabs could race — low MVP risk | optional JSONB uniqueness later |

No critical/high SOLID or security findings in the preset hop chain.

## Phase D — Optional
| Tool | Result |
|------|--------|
| npm audit (vite high advisories) | WARN informational (dev-server; not introduced by this PR) |
| @verify-ticket | PASS (code + regression + test-gate) |
| @composition-gate | CLEAR (proof refreshed to HEAD) |
| @verify-ui | PARTIAL (chooser / empty / Einstellungen→Preset; missing 03/05 + live save/release) |

## Verdict: WARN

**Summary:** Deterministic gates and owner-scoped composition are solid. WARN only because browser proof does not yet cover save → release → create-from-preset (evidence 03/05 missing; requires green sheet + migration). Not a ship blocker for code correctness — run `@ecc-check` / fuller e2e before merge confidence on the write path.

## Next steps
- Optional: extend Playwright to save a legal Core character and capture `03-preset-version-pick.png` / `05-version-list-after-save.png`
- Confirm migration `012_character_presets` applied on target Supabase
- Run `@ecc-check` before merge (this audit is not a ship gate)
