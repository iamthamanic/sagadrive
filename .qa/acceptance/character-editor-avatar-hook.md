# Feature: character-editor-avatar-hook

<!-- #307 — Extract useCharacterAvatarEditor from CharacterEditor -->

## Intent
Avatar-/Appearance-/Meshy-State (~18 useState) aus `CharacterEditor.tsx` in `useCharacterAvatarEditor.ts` extrahieren — behavior-neutral, nach dem NPC-Editor-Muster. Adressiert Finding 2 aus #295 mit dem kleinsten sicheren Split.

## Preconditions
- CharacterEditor is the composition root under `src/app/character/edit/`
- Avatar gates (`avatar-*-check`, `avatar-v2-*-check`) remain green after the extract
- Pattern reference: `src/app/npc-creature/useNpcCreatureEditor.ts`

## Happy Path
- [ ] `useCharacterAvatarEditor` hält Appearance + Avatar-V2 + Meshy/Upload-State; CharacterEditor konsumiert den Hook
- [ ] Behavior-neutral: keine absichtliche UX-/Save-Änderung; Avatar-related `test-gate` checks grün
- [ ] CharacterEditor `useState`-Count für Avatar-Cluster ist 0 (State nur im Hook)
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout)
- [ ] `npm run test-gate` green for touched scope

## Edge Cases
- [ ] Preset bootstrap + load payload hydrieren Avatar-State über Hook-API
- [ ] Meshy `onSuccess` stabil (kein inline-Callback-Flicker-Regression)
- [ ] Import/modular-generate Result bleibt an Surfaces angebunden
- [ ] Race-Preset / Species-Template setzen Appearance über Hook; CharacterEditor behält Race-/Trait-Ownership

## Non-Goals
- Kein Zerlegen von Save/Load/Bootstrap, Inventory, Attributes, Skills
- Kein Spike-Rename (#295 Finding 3)
- Kein generischer Library-Hook (#295 Finding 4)
- Keine visuellen Redesigns

## Security Coverage
- F-01 XSS via model/portrait URLs: existing `normalizeSafeUrl` / runtime URL validation unchanged (out of refactor scope, preserved)
- F-03 Authz on portrait upload: still via `characterService.uploadPortrait` (owner session) — preserved
- B-01/B-04/B-07/B-08/B-09: no new backend surface
- P-04 secrets: no new secrets

## Regression
- [ ] Avatar-related deterministic checks still PASS
- [ ] Character editor load/save/portrait paths unchanged in behavior

## Assumptions
- Avatar gate scripts that previously read only `CharacterEditor.tsx` may also read `useCharacterAvatarEditor.ts` when identifiers moved with the state

## Screenshots
| Step | Filename |
|------|----------|
| n/a | refactor — no UI change |

## Composition Gate
- Verdict: SKIPPED (single-hop local state extract; see `.qa/runs/composition-gate-character-editor-avatar-hook.md`)

## Implementation Notes
- Added `src/app/character/edit/useCharacterAvatarEditor.ts` owning Appearance + Avatar-V2 + Meshy/Upload state, surfaces hooks, hydrate/Meshy/import/species-template handlers, portrait capture.
- `CharacterEditor.tsx` consumes the hook; avatar-cluster `useState` removed from the editor.
- Avatar + presets regression scripts read CharacterEditor + hook file so moved identifiers still gate.
- `sagaDriveDirty` lives in the hook; inventory still marks dirty via exposed setter.

