# Acceptance — avatar-rigging-providers-skintokens

<!-- seeded for GitHub issue #161 / avatar-order-22 -->

## Intent
Gemeinsamer Rigging-Provider-Vertrag (Meshy + SkinTokens); Success nie Capability; #6 bleibt SoT.

## Happy Path
- [ ] Port Submit/Status + Meshy/SkinTokens mocks
- [ ] Logical model3d keys only; free URL fail-closed
- [ ] SkinTokens default unavailable; existing-skeleton marked unavailable unless enabled
- [ ] Capabilities always pending
- [ ] check grün

## Scope
In: rigging-provider-contract domain + mocks + test-gate.
Out: Live GPU/SkinTokens worker, paid Meshy calls in CI.

## Composition Gate
- HEAD_SHA: (proof)
- BASE_SHA: (proof)
- Verdict: SKIPPED/CLEAR
- Proof: `.qa/runs/composition-gate-avatar-rigging-providers-skintokens.md`
