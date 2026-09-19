# Verify Ticket — avatar-v2-custom-creature-contract (#264)

- Date: 2026-09-20
- HEAD_SHA: WORKTREE (uncommitted; base 7a4ccd8e805fa9fc14b43c7898f53745919a04e2)
- Verdict: **PASS**

## Checks
- [x] Acceptance loaded: `.qa/acceptance/avatar-v2-custom-creature-contract.md`
- [x] `@test-gate` depth=standard — PASS (`npm run test-gate`)
- [x] Feature check: `avatar-v2-custom-creature-contract-check.mjs` PASS
- [x] Architecture boundary check PASS
- [x] Secrets diff scan PASS
- [x] No UI changes → verify-ui N/A

## Acceptance mapping
| AC | Evidence |
|----|----------|
| Humanoid vs Custom getrennt, keine Humanoid-Regression | golden human/dwarf humanoid; V1 `resolveAvatarRigCapabilities` still in invariants |
| Custom ohne Humanoid-Bones | faruk-like + no-hands edge → animated + rigid/head |
| Evidence-driven / provider-neutral | resolver ignores claims; unknown → limited |
| Human/Dwarf/Faruk fixtures | `listCustomCreatureGoldenFixtures` + JSON golden refs |
| typed-strict | no `any`/`as unknown`/`@ts-ignore` in new domain file |

## Edge cases
| Edge | Evidence |
|------|----------|
| No hands → head/back/other | `assertCustomCreatureContractInvariants` no-hands |
| No humanoid map ≠ static-only | faruk `hasCustomAnimationClips` → `animated` |
| Unknown → limited | unknown skeleton status limited, no invented anchors |

## Scope
In: domain contract, fixtures, check, barrel, design §6, test-gate wire.
Out: auto-rig, UI, wearables for custom — not touched.
