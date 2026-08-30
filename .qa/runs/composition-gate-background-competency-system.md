# Composition Gate Proof — background competency system (#67)

- HEAD_SHA: ba7246a8d14372a78b790cf0b3f1f78baeb5705d
- BASE_SHA: 811ce2c2ce842ac63f4907b61ba15b4d62c99b98
- Verdict: CLEAR

## Event
Character creation changes a user-owned SagaDrive character profile. This slice adds optional `backgroundTemplateId` metadata while keeping the concrete background pool, trainings and specialization as the persisted source of truth. No new external side effect, worker, webhook or cross-user write is introduced.

## Hop chain
1. `CharacterEditor` owns the competency/background state and validates the 2+1+7 start allocation.
2. `CharacterBackgroundPanel` and `CharacterSkillsPanel` edit only local character-creation state.
3. `characterService.createCharacter` writes the existing `sagadrive_profile` JSONB payload through the existing owner-scoped character path.
4. `characterService` normalizes `backgroundTemplateId`; unknown or missing IDs degrade to `null` while concrete background values are preserved.
5. Existing Supabase character ownership/RLS and storage paths remain unchanged.

## Simulations
### N-actors
Multiple users/characters select the same static template. Templates contain no mutable shared state; each save copies concrete choices into that character's existing profile. No actor can mutate another actor's background through template selection.

### Invalid/missing
Missing or unknown `backgroundTemplateId` normalizes to `null` (Custom/Legacy). Invalid pool/training/specialization combinations remain visible as character validation errors rather than being silently rewritten. Template catalog invariants reject malformed static definitions.

### Two consumers / crash
The UI and persistence normalizer consume the same stable template ID, but saved mechanical choices are independent of the catalog. A refresh/crash after saving does not require template rehydration to reconstruct the build; concrete skillPool/trainedSkills/specialization remain stored. A later template edit therefore cannot retroactively mutate the saved character.

## Flags
- No new database table, migration or RLS policy.
- No new network endpoint or external side effect.
- Service change is normalization-only around existing `sagadrive_profile` JSONB.
- Existing character records without template metadata remain readable.
- Test Gate on code SHA `ba7246a8d14372a78b790cf0b3f1f78baeb5705d` completed successfully in Quality Gates run 33244002179 before this proof-only commit.
