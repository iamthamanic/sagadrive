# Acceptance — advanced-look-adaption-ux (#356)

Slug: `advanced-look-adaption-ux`

## Intent
Look Editor exposes Advanced Look Adaption with separate Rendered/Live
capability status from the provider registry — never fake-executes.

## Given / When / Then

### Advanced section visible
- Given a user opens Look Editor
- When they select nav item **Advanced**
- Then `data-look-advanced-adaption="v1"` shows Basic vs Advanced copy
- And separate rows for `rendered` and `realtime` appear

### Unavailable modes
- Given the Advanced provider registry is empty (default)
- When Advanced section renders
- Then both run CTAs are disabled
- And status labels explain „Noch nicht verfügbar“ / kein Provider
- And no mock render or success toast is produced

### Provider capability display
- Given a provider is registered with `supportsRendered` and/or `supportsRealtime`
- When status is rebuilt from `listAdvancedLookProviders()`
- Then the matching row status becomes `available` without LookProfile schema changes
- And run CTAs remain disabled until an engine slice exists

### No secrets
- Given Advanced UI
- Then no provider secrets or raw node/prompt parameters are shown

## Evidence
- Domain: `src/domains/look/advanced-look-capability-status.ts`
- UI: `AdvancedLookAdaptionPanel.tsx` + Look Editor nav `advanced`
- Check: `scripts/advanced-look-adaption-ux-check.mjs`
- E2E: `e2e/advanced-look-adaption-ux.spec.ts`

## Composition Gate
- Verdict: SKIPPED (single-hop registry → UI; no side-effect path)
- Proof: `.qa/runs/composition-gate-advanced-look-adaption-ux.md`
- HEAD_SHA: WORKTREE (pre-commit)
