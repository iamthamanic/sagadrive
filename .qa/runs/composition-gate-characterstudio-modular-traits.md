# Composition Gate — characterstudio-modular-traits

- HEAD_SHA: 7de369649018ec1780fe5f01b0fb2409668529a6
- Date: 2026-09-17
- Verdict: CLEAR

## Event
Player selects a base trait card (e.g. hair=long) or a runtime overlay (helmet) is applied; the CharacterStudio preview shows the effective look; save persists only base traits.

## Hop chain
Producer (TraitCardPicker / setRuntimeOverlays)
→ Domain resolveEffectiveTraits + serializePersistedBaseTraits
→ CharacterStudioRuntime.applyAppearance + TraitLifecyclePort overlays group
→ GPU visibility/tint side-effect
→ AvatarCanvas / appearance.avatar.traits persistence label

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One card click → one base trait id updated; N overlays on different groups → N effective channels | requestApply per group; one overlay map entry per groupId | pass |
| invalid / missing | Unknown trait id → fail-closed error, previous selection kept | isAllowedTraitId + error loadState; toTraitAssetKey returns undefined | pass |
| 2 consumers / crash | Helmet overlay hides hair; remove overlay → exact base hair restored; stale apply generation discarded | resolveEffectiveTraits hide + empty overlays restore; generationRef in TraitCardPicker | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | — | — | — | — |

## Skip reason
n/a
