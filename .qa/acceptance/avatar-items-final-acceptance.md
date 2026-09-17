# Acceptance — avatar-items-final-acceptance

<!-- seeded for GitHub issue #163 / avatar-order-24 -->

## Intent
E2E-Vertrag für Avatar-Items-Epic: Inventory→Visual→Rigid/Skinned→Provider mocks; Inventory bleibt SoT.

## Happy Path
- [ ] Rigid fixtures sword/shield/helm/pack project + plan
- [ ] Skinned tunic gated by capability
- [ ] Two-handed collapse; missing binding
- [ ] Meshy/SkinTokens mock matrix
- [ ] Fit UI labels
- [ ] check in test-gate grün

## Scope
In: avatar-items-final-acceptance-check joining #158–#162.
Out: Live GPU, paid Meshy, full Playwright browser suite (covered by contract matrix in CI).

## Composition Gate
- HEAD_SHA: 2c2263d3bee00ec8d84a4eb28319a31feec34f20
- BASE_SHA: 3923064608b47fe7c64b76b3e66f7b65b66cfa0b
- Verdict: SKIPPED
- Proof: `.qa/runs/composition-gate-avatar-items-final-acceptance.md`
