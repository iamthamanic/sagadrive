## Audit Changes — WARN

### Scope
- Mode: uncommitted since last PR
- Base: `185a047` (PR #245 merge)
- Files: ~34 modified + untracked migrations/acceptance/edge remesh/rig (~2.3k LOC+)
- Packages: frontend + edge + sql
- Depth: standard (via ecc-check)

### Phase A — Deterministic
| Check | Command | Result |
|-------|---------|--------|
| test-gate | `npm run test-gate` | PASS |
| RG secrets | test-gate | PASS |
| Forced note | typecheck skips uncommitted on main | WARN |

### Phase B — Security
| Check | Result |
|-------|--------|
| Secrets in diff | PASS |
| Portrait upload auth/MIME/size/uid path | PASS |
| Meshy key client-side | PASS (Edge BYOK) |
| SSRF GLB download allowlist | PASS |
| AgentShield | SKIPPED |

### Phase C — Review lite
- Verdict contribution: warn
- Tags: `hoare` (AC not fully proven), `brooks` (large multi-ticket worktree)

| Severity | Tag | File | Issue | Action |
|----------|-----|------|-------|--------|
| Important | hoare | CharacterEditor / e2e | Auto + framed portrait not proven under headless WebGL | Manual/WebGL proof before PR |
| Medium | brooks | worktree | Multiple features (portrait, Meshy overlay, remesh/rig, sheet_status) in one uncommitted pile | Prefer split PRs |
| Low | seclv | uploadPortrait | Year-long signed URL (existing pattern) | Note only |
| Info | process | typecheck.mjs | Uncommitted files invisible to gate on main | Document / force base |

### Verdict: WARN

**Summary:** Deterministic gate green after regression-check update; storage bucket present; composition CLEAR. Ship blocked on incomplete UI proof of 3D portrait snapshot + multi-ticket scope hygiene.

### Next steps
- Prove portrait capture with WebGL (Tauri/desktop or headed Playwright)
- Split or finish Meshy auto-rig acceptance checkboxes
- Then `@ecc-check` → commit
