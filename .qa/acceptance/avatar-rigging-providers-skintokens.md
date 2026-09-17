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
- HEAD_SHA: 87aa7b59a7bfbb74d9685b7dc714518afda275a8
- BASE_SHA: fa37073f6eaf61c6f9b9b8de3fb75d43b438221a
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-avatar-rigging-providers-skintokens.md`
