# Avatar V2 — Identity Transfer Spike Decision (#262)

**Status:** Binding for #263 Conversion  
**Slug:** `avatar-v2-identity-transfer-spike`  
**Parent:** `.qa/design/avatar-v2-modular-pipeline.md` / Epic #248  
**Domain contract:** `src/domains/character/avatar/identity-transfer-spike-v1.ts`

## 1. Intent

Decide how an Import/Generate look maps onto **Standard / Compact / Heavy** without leaving architecture to the conversion implementer.

## 2. Golden fixtures (controlled only)

| Id | Intent |
|----|--------|
| `human` | Neutral adult humanoid |
| `elf` | Stylized ears + slim silhouette |
| `dwarf` | Compact family proportions |
| `gumo-like` | Strongly stylized non-realistic identity |

No private user assets. External providers only receive these fixtures if ever used for optional AI paths.

## 3. Approaches compared (≥3)

| Approach | Local/repro | Default candidate |
|----------|-------------|-------------------|
| `landmark-morph-fitting` | Yes | **Yes (core)** |
| `material-trait-transfer` | Yes | **Yes (core)** |
| `texture-projection-bake` | Yes | **Yes (optional step)** |
| `ai-assisted` | No (credits, ToS, non-deterministic) | **Banned from default** |

Full scored matrix: `IDENTITY_TRANSFER_GOLDEN_MATRIX_V1` in the domain contract (deterministic aggregates).

## 4. Decision (canonical)

**Default pipeline (ordered):**

1. `landmark-morph-fitting`
2. `material-trait-transfer`
3. `texture-projection-bake` (only when identity estimate ≥ `0.62` and albedo available)

**Degraded fallback (fixed — no user gate):**

1. `landmark-morph-fitting` (wider clamps; silhouette > face)
2. `material-trait-transfer` only (skip bake)

**Banned from default:** `ai-assisted` (may exist later as optional provider path behind BYOK; never required).

## 5. Conversion contract for #263

See `buildIdentityTransferConversionPlan()`:

- **Inputs:** owner-scoped source artifact, structure analysis, family recommendation, optional albedo
- **Outputs:** target family, morph approximation, traits/colors, optional bake asset, `conversionStatus`, **no client capabilities**
- **Steps / degradedFallbackSteps:** encoded in domain — implement verbatim
- **Custom creature:** humanoid interpretation only; never claim lossless normalization

## 6. Relation to Import Original (#261)

Import Original keeps the mesh. Conversion (#263) is an **optional later path** that materializes a family body while preserving look via this pipeline. Source alone still never invents capabilities.

## 7. Security / license

- Golden fixtures only in benchmarks
- No secrets in matrix artifacts
- AI-assisted license/self-host fit scores fail default gate by design
