# Feature: E2E Auth Bootstrap Stability

<!-- e2e-auth-bootstrap-stability -->

## Intent
Local Admin login must not hang Browser E2E when remote GoTrue is slow/unreachable. Bound the existing GoTrue attempt with `AUTH_SESSION_TIMEOUT_MS` and fall back to the existing app-level Local Admin session.

## Happy Path
- [x] Controlled hang repro: Dashboard stays absent while token request is held (pre-fix)
- [x] Local Admin `signIn` uses `raceWithTimeoutOrSymbol` + `AUTH_SESSION_TIMEOUT_MS`
- [x] Timeout / network failure → Local Admin fallback → Dashboard
- [x] Successful GoTrue → real JWT user
- [x] Non-admin login unchanged (no admin fallback)
- [x] Shared `e2e/helpers/auth.ts` `ensureLoggedIn` used by previously duplicated specs
- [x] Cases A–E Playwright behavioral suite
- [x] Targeted flaky specs 5× PASS (`--retries=0`)
- [x] Full Browser E2E PASS (`CI=1`, `--retries=0`)

## Edge Cases
- [x] GoTrue abort → fallback
- [x] GoTrue hang > 1500ms → fallback before 15s E2E asserts
- [x] Bootstrap with stored Local Admin + slow auth → no hang

## Regression
- [x] No Face Anchor / #423 / Agent Review changes

## Screenshots
| Step | Filename |
|------|----------|
| Hang repro | `.qa/evidence/e2e-auth-gotrue-hang-repro/` |
| Cases A–E | `.qa/evidence/auth-local-admin-timeout/` |

## Composition Gate
- Verdict: SKIPPED
- Proof: `.qa/runs/composition-gate-e2e-auth-bootstrap-stability.md`
- Reason: in-process timeout + test helper; no producer→consumer fan-out
