# Verify Ticket — liveact-human-ground-truth-repair (#423)

- Date: 2026-10-02
- HEAD_SHA: 8ef781bdf532d5d6c187a6e3961c7e811e3c4d61
- Verdict: PASS

## Checks (@test-gate)
- `npm run test-gate` PASS (fresh after publish + resolver + golden-avatar face3 check)

## Acceptance match
- Happy Path Stage A/B + visual + publish all checked
- Coupled Shell + Surface Safety postconditions checked
- Final Publish Gate section documents identities + resolver/cache
- Out of scope #424 not implemented

## Diff vs Intent
- In scope: GT authoring, coupled-shell, final GLB/VRM, publish, resolver, QA evidence, checks
- No secrets in diff
- Generic GLB fallback preserved (`public/.../m5.glb`, `f5.glb`)

## Runtime / Publish evidence
- both-assets-summary.json: Functional 7/7, Coupled Shell Body FP=0, Visual PASS, VRM functional + morph parity PASS
- Resolver points to `*-face3.vrm?v=quality5-face3-coupled1`
