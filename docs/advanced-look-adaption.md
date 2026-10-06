# Advanced Look Adaption — Provider-neutral contract

Source: GitHub #355 (`advanced-look-contract`). Domain/infrastructure contracts only — **no** neural engine, GPU pipeline, or Adaption UI (#356).

## Purpose

Advanced Look Adaption describes how a future AI/neural provider may apply a **LookProfile** (same contract as Basic) for:

| Execution mode | Provider capability flag |
|----------------|--------------------------|
| `rendered` (offline / high quality) | `supportsRendered` |
| `realtime` (live / streaming path) | `supportsRealtime` |

The two flags are **independent**. A provider may support only rendered, only realtime, both, or neither.

## Same LookProfile / LookReference source

Basic and Advanced share:

- `LookProfile` + `LookProfileVersion` (`src/domains/look/types.ts`)
- `LookReference` with `style` \| `content`
- `LookExecutionMode` (`realtime` \| `rendered`)

Advanced does **not** introduce a parallel style object. Requests wrap an existing profile/version via `buildAdvancedLookAdaptionRequest`.

## Guide-input contract (Scriptoni-style 3D truth)

Reserved guide kinds (optional unless a future provider marks them required):

| Kind | Role |
|------|------|
| `beauty` | Beauty / shade guide |
| `clay` | Neutral clay / material guide |
| `depth` | Depth pass |
| `normals` | Normals pass |
| `edges` | Edge / outline guide |
| `segmentation` | Segmentation masks |
| `camera` | Camera / projection |
| `temporal` | Temporal context across frames |
| `motion` | Motion context for live paths |

Descriptors live in `ADVANCED_LOOK_GUIDE_INPUT_DESCRIPTORS`. No concrete engine is forced by listing a kind.

## Capability negotiation

```ts
negotiateAdvancedLookProvider({
  provider,           // AdvancedLookProviderCapabilities | null
  executionMode,      // 'rendered' | 'realtime'
  requestedGuideInputs,
})
```

Explicit degrade reasons:

| Reason | When |
|--------|------|
| `provider_missing` | No provider configured |
| `execution_mode_unsupported` | Mode not in provider flags |
| `advanced_capability_absent` | Provider declares neither rendered nor realtime |
| `guide_input_unsupported` | Reserved for hard-fail paths; soft omit uses `omittedGuideInputs` on success |

On success, unsupported requested guides are listed in `omittedGuideInputs` (soft degrade) while accepted ones remain in `acceptedGuideInputs`.

## Registry

`src/domains/look/advanced-look-provider-registry.ts` holds pluggable capability declarations. **No** neural provider is registered by default — `resolveAdvancedLookProviderForMode` returns `null` until a future slice registers one.

## Edge cases (contract behaviour)

- Provider supports only `rendered` → realtime negotiation fails with `execution_mode_unsupported`.
- Provider supports realtime with a reduced guide set → extra guides omitted, negotiation still `ok: true`.
- Session look change mid-stream (future) → rebuild request from the new LookProfile/version; re-negotiate.
- Advanced capability absent → `provider_missing` or `advanced_capability_absent`.
- Guide pass unavailable → omit from request / `omittedGuideInputs`; do not invent engine defaults.

## Non-goals

- Real AI frame generation
- Temporal consistency engine
- Live streaming to a neural provider
- Wiring a vendor as the domain standard

## Code map

| Artifact | Path |
|----------|------|
| Contract | `src/domains/look/advanced-adaption.ts` |
| Registry | `src/domains/look/advanced-look-provider-registry.ts` |
| Design note | `.qa/design/look-system.md` |
| Gate | `scripts/advanced-look-contract-check.mjs` |
| Acceptance | `.qa/acceptance/advanced-look-contract.md` |
