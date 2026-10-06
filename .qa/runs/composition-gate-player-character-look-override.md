# Composition Gate — player-character-look-override

- Issue: #351
- Feature slug: player-character-look-override
- HEAD_SHA: eeaf095a13ab44f9117aed881825318be02511be
- BASE_SHA: 0be228ebfb3b75b5f06782e5a13a99095ae87f5b
- Verdict: CLEAR

## Event
Character owner writes/clears appearance.personal_look_profile_id; resolution for player-character may apply it only when saga allows.

## Hop chain
CharacterLookSelector / CharacterEditor → characterService.updateCharacterPersonalLook|updateCharacter → assertPersonalLookOverrideWrite → characters.appearance UPDATE → enforce_personal_look_profile_binding (owner + active owned Look + no active saga with allow=false). Readers: resolveLookProfileId('player-character') ignores personal when playerOverridesAllowed false.

## Simulations
- N-actors: non-owner blocked by RLS + trigger; foreign look ownership rejected.
- Invalid/missing: archived look rejected; saga forbid rejects non-null write; null clear always ok for owner.
- Two consumers / crash: personal field is appearance JSON only; world/NPC resolution targets unchanged.

## Flags
none
