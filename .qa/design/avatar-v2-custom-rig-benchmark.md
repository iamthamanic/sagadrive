# Avatar V2 — Custom Rig Benchmark Decision (#265)

**Status:** Binding for #266+ Custom Creature Original slice  
**Slug:** `avatar-v2-custom-rig-benchmark`  
**Domain:** `src/domains/character/avatar/custom-rig-benchmark-v1.ts`  
**Parent:** `.qa/design/avatar-v2-modular-pipeline.md` §6

## 1. Intent

Decide productive default/fallback rigging paths for Humanoid vs Custom Creature using a reproducible golden matrix — not README claims.

## 2. Fixtures

`human`, `dwarf`, `alien` (humanoid) · `gumo-like`, `faruk-like` (custom-creature)

## 3. Paths compared

| Path | Role |
|------|------|
| `meshy-full-rig` | Current Meshy auto-rig adapter |
| `meshy-generate-rig` | Generate-ingress remesh+rig (infra only) |
| `skintokens-full-rig` / `skintokens-existing-skeleton` | Provider contract; worker **unavailable** in this spike |
| `unirig-prior-art` | Research only — no SagaDrive adapter |
| `import-existing-rig` | Keep imported skeleton + Analyzer |

## 4. Decision

| Profile | Default | Fallback | Auto-rig |
|---------|---------|----------|----------|
| **humanoid** | `meshy-full-rig` | `import-existing-rig`, then generate-rig on Generate ingress | Required when no usable import rig |
| **custom-creature** | `import-existing-rig` | same (limited artifact OK) | **Optional** — never forced |

Hard rules:

- Provider success → capabilities stay **`pending`** until Analyzer/Revalidation.
- Poor skinweights → `needs-review` / `limited`, never success.
- SkinTokens self-host worker: **`unavailable`** (optional adapter later, no domain redesign).
- UniRig: prior art only — does not block #266.

## 5. Product implication for #266

Custom Creature „Original behalten“ uses import-existing / limited path. Auto-Rig explizit optional — no hard-stop if Auto-Rig is unsuitable.
