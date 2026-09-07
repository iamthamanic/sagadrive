# Composition Gate — architecture-migration-08-avatar-lore

- HEAD_SHA: cdb594a931205c42e75c5e0ddde97ede35be9c8f
- BASE_SHA: 5822c5998b5a90bf78a79a6a9f8550c022490f06
- Date: 2026-09-07
- Verdict: CLEAR

## Event
User opens CharacterEditor appearance tab (avatar canvas) or generates lore background.

## Hop chain
`CharacterEditor` / `CharacterBackgroundComposer` → `AvatarCanvas` + domain presets / `characterLoreService` → Three runtime or Edge Function → same UI state

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | 1 generate / 1 canvas mount → 1 service / 1 runtime | Single invoke per action; runtime owned by canvas | pass |
| Invalid/missing | Bad model URL / lore error → error state / toast | normalizeSafeUrl + lore error parsing preserved | pass |
| Two consumers / crash | Remount disposes runtime; no duplicate writers | dispose on unmount; explicit generate CTA | pass |

## Flags
none

## Skip reason
n/a
