# Audit Changes — WARN

### Scope
- Mode: branch `feat/item-workbench-forge-ux` vs `main`
- Base: `b6f5e48` (origin/main)
- HEAD: `e1f6d0e` (+ evidence chore if present)
- Files: 32+ (~1.4k LOC feature) + follow-up scroll/e2e
- Packages: frontend (Vite) + edge `main` dispatcher + docker/nginx wiring
- Depth: standard (+ UI verify)

### Phase A — Deterministic
| Check | Command | Result |
|-------|---------|--------|
| test-gate | `npm run test-gate` | PASS |
| item-workbench-check | `node scripts/item-workbench-check.mjs` | PASS |
| item-thumbnail/model3d/routing checks | scoped scripts | PASS |
| e2e item-workbench | `npx playwright test e2e/item-workbench.spec.ts` | PASS (after dual-shell fix) |
| Secrets RG | diff scan | PASS |

### Phase B — Security
| Check | Result |
|-------|--------|
| Secrets in diff | PASS (only `${MESHY_API_KEY:-}` env wiring) |
| .env staged | PASS |
| Auth/tenant | PASS / N/A — catalog service + edge authz unchanged for uploads; auto-draft uses same create APIs |
| AgentShield | SKIPPED (no `.cursor/` in diff) |
| F-01 | behind AuthGate |

### Phase C — Review lite
- Verdict contribution: warn
- Tags: `brooks`, `hoare`, `leaky`

| Severity | Tag | File | Issue | Action |
|----------|-----|------|-------|--------|
| Important | leaky | `Layout.tsx` (pre-existing) | Desktop+mobile trees both mount → dual Radix dialogs on body | Tracked; e2e scopes to topmost; product fix = single shell |
| Medium | hoare | `useItemEditor.ensureDraftId` | Auto-draft can create personal item when world selected but worldId empty | Intentional fail-open to personal; document in UX |
| Medium | brooks | acceptance vs UI | Acceptance originally said 3-col; forge is 2-col | Acceptance updated |
| Low | brooks | `itemAssetPending` | Module singleton pending queue | Acceptable for remount bridge |
| Low | — | docker-compose | MESHY env defaults empty | OK |

### Phase D — Optional
| Tool | Result |
|------|--------|
| Playwright evidence | PASS — `.qa/evidence/item-workbench/*.png` |
| Browser spot-check | PARTIAL — narrow viewport (<md) uses stacked scroll; desktop details scroll contract covered by e2e |

### UX Design Laws (forge)
| Law | Result |
|-----|--------|
| Hick / one purpose | PASS — forge create/edit |
| Fitts (≥44px) | PASS — min-h-11 CTAs / dropzone |
| Von Restorff Speichern | PASS — topbar primary |
| Doherty | PASS — upload/draft busy + toasts |
| Prägnanz / scroll | PASS after fix — details scroll md+; mobile outer scroll |
| Postel recover | PASS — draft/upload errors toast |

### Exit
**WARN** — shippable after acknowledging dual-shell dialog debt; run `@ecc-check` before PR merge.

### Next
- Optional: `@ecc-check` then PR from `feat/item-workbench-forge-ux`
- Do not push to `main` directly
