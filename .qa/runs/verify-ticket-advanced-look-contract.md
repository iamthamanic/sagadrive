# Verify Ticket — advanced-look-contract (#355)

- HEAD_SHA: c7e215c38f316c7b01b6c674121d43dca6f8f150
- Date: 2026-10-06
- Verdict: PASS

## Checks (@test-gate)

- `npm run test-gate` → PASS (includes `advanced-look-contract-check`)
- `npm run typecheck` → PASS (3 changed TS files)
- Evidence: `.qa/runs/355-test-gate.txt`

## Acceptance match

| Checkbox | Evidence |
|----------|----------|
| `supportsRendered` / `supportsRealtime` separate | `AdvancedLookProviderCapabilities` + negotiation tests |
| Guide kinds reserved (beauty/clay/depth/normals/edges/segmentation/camera/temporal/motion) | `ADVANCED_LOOK_GUIDE_INPUT_KINDS` length 9 |
| Independent negotiation + explicit degrade | provider_missing / execution_mode_unsupported / advanced_capability_absent / strict guide fail |
| Same LookProfile/LookReference | `buildAdvancedLookAdaptionRequest` wraps profile+version |
| Zero type escape hatches | check section 6 + typed-strict via test-gate |

## Scope

In: domain contract, docs, registry, gate. Out: neural engine, UI (#356), GPU — not touched.

## Security

N/A — no auth/API/secrets; pure domain + docs.
