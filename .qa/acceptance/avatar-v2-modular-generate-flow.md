# Feature: Avatar V2 21/22 — Modular Generate Flow (Editierbar)

<!-- #269 / Epic #248 — slug: avatar-v2-modular-generate-flow -->
<!-- Seeded after #268 merge (PR #290 @ 2cf5eae). Spike handoff is binding. -->

## Intent
Vertical Slice: `Mit KI erstellen` → `Editierbar & kleidungsfähig` endet in kanonischem Body + separaten Traits/Wearables/Props im gemeinsamen Editor — gemäß #268 Decision (`vision-parse-library-body-catalog-wearables`).

## Preconditions
- #268 Modular Generate Decomposition spike on main (`buildModularGenerateHandoffFor269`)
- #267 Generate UX modes (Editierbar vs Freie Form)
- Canonical Body Families, Identity Transfer, Starter Wardrobe, Wearable Runtime v2, Artifact/Analyzer

## Happy Path
- [x] Golden Gumo-like/humanoid Generate → validierter modularer Avatar mit wechselbarer Kleidung/Props
- [x] Job graph stages aus Spike (`parse-intent` … `structure-analyze`); max 1 paid retry/stage; cost confirm
- [x] Resultat nutzt dieselbe Artifact/Analyzer/Editor/Runtime-Pipeline wie Native/Import
- [x] Save/Reload + Animation/Equipment/Clothing E2E
- [x] Touched files: zero type escape hatches

## Edge Cases
- Wearable-Teiljob scheitert → partial modular / deterministic degrade; kein Character-Verlust; keine falschen Capabilities
- Canonical Body Match scheitert → Freie Form/Custom mit ehrlichem Hinweis (Spike: `unusualAnatomyDegradesTo: free-form`)
- Bekleideter Blob nie als `full modular` (Spike: `forbidFullModularFromBlob`)
- Props getrennt von skinned Wearables

## Scope
### In
- Orchestration job/use-case for modular generate
- Body-family + identity/traits + catalog wearables/props per spike rolePlan
- Progress UI (SagaDrive steps, no provider internals leak)
- Save/reload/editor/equipment/animation integration
### Out
- Custom Creature clothing auto-fit
- Marketplace
- New provider adapters / R&D reopen of #268

## Security Coverage
- Owner-scoped intermediate/output artifacts; bounded idempotent jobs
- Provider secrets/URLs server-side only
- Provider answers never authoritatively set roles/slots/capabilities without validation
- Each part validated against Role/Slot/Rig/Fit/GLB contracts

## Composition Gate
- HEAD_SHA: d367f70234b7dbce9fa39250184714fa7a6f4d88
- Verdict: CLEAR

## Implementation Notes
- Binding handoff: `buildModularGenerateHandoffFor269()` / `resolveModularGenerateDecompositionDecision()`
- Default approach: `vision-parse-library-body-catalog-wearables`
- Degraded: `generate-body-only-catalog-wearables`
- Domain: `src/domains/character/avatar/modular-generate-flow-v1.ts`
- UI: `AvatarModularGenerateProgress` + `CharacterEditor` orchestrates on Meshy success
- Save/Reload: `starter_wardrobe` + canonical `body_family` without species template
- Design: `.qa/design/avatar-v2-generate-decomposition-spike.md` + modular-pipeline §6
- Check: `scripts/avatar-v2-modular-generate-flow-check.mjs`
