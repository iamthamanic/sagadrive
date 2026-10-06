# Look System — Domain Contract (v1)

Source of truth for GitHub #339 (`look-profile-domain`). Pure domain only; no React, Supabase, or ToonLab types.

## Purpose

A **LookProfile** describes a visual look (style + optional content references) that can apply to world presentation and/or player characters. Resolution is deterministic and fail-closed for unknown persisted values.

## Core types

| Type | Role |
|------|------|
| `LookProfile` | Stable identity + current version pointer + ownership metadata |
| `LookProfileVersion` | Immutable version payload: source, references, capabilities, execution modes |
| `LookSource` | How the look was authored: `manual`, `preset`, `reference-analysis`, `imported` |
| `LookReference` | External/visual reference with kind `style` \| `content` (never swapped) |
| `LookScope` | Application target: `system`, `saga`, `session`, `player-character` |
| `LookCapability` | Functional: `character`, `lighting`, `postFx`. Reserved (world stubs): `environment`, `sky`, `water`, `vegetation`, `terrain`, `props`, `vfx` — see `LOOK_CAPABILITY_METADATA` / [docs/look-world-capabilities.md](../../docs/look-world-capabilities.md) (#346) |
| `LookExecutionMode` | `realtime` \| `rendered` |

## Capability metadata (#346)

- Single registry: `src/domains/look/capability-metadata.ts`
- Reserved domains are **unsupported** (`availability: 'reserved'`) with DE copy „Noch nicht verfügbar“
- Look Editor must render capability rows from `listLookCapabilityMetadata()` — never a parallel hardcoded world-domain list
- Future world renderers **extend** LookProfile capabilities; they do not invent a second style system

## Resolution rules

**World look** (scene / shared presentation):

1. Session override (if set)
2. Saga default
3. System default

**Player-character look**:

1. Personal override — **only if** GM allows player overrides for the session/saga
2. Session override
3. Saga default
4. System default

Missing saga default → system default. Unknown capability values must not crash resolution (ignored / unsupported flag).

## Reference analysis (#352)

- Contract: `LookReferenceAnalyzer` + `normalizeLookReferenceAnalysisPayload` in `src/domains/look/reference-analysis.ts`
- Input: 1–10 PNG/JPEG/WebP refs with `style` | `content` (+ optional weight)
- Content refs inform motif notes only — never automatic style sources
- Output: validated draft (palette, character/lighting/postFx knobs) + provenance `look-ref-analysis-v1`
- First vision provider is Edge/Infrastructure only (`supabase/functions/look-reference-analysis`); domain never imports provider types
- Invalid / leaked provider payloads must not become persisted LookProfiles

## Advanced Look Adaption (#355)

Provider-neutral future contract for AI/neural rendering — **define only**, no engine/UI (#356).

- Domain: `src/domains/look/advanced-adaption.ts` + `advanced-look-provider-registry.ts`
- Docs: [docs/advanced-look-adaption.md](../../docs/advanced-look-adaption.md)
- Capabilities: `supportsRendered` and `supportsRealtime` negotiate independently; missing → explicit degrade
- Guide inputs reserved: beauty, clay, depth, normals, edges, segmentation, camera, temporal, motion
- Reuses the same `LookProfile` / `LookReference` / `LookExecutionMode` contracts as Basic — no parallel style object
- No neural provider registered by default; registry is empty until a later slice

## Non-goals (this slice)

Persistence, UI, renderer adapters, ToonLab, environment renderers, neural engines.
