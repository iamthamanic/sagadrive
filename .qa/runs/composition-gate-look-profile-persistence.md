# Composition Gate — look-profile-persistence

- HEAD_SHA: f93afe7bf9e4b1fba5ba93c71c12c5d8c4b0b2be
- BASE_SHA: 6d4d42530c496d943dc3c33998c038d6577040b5
- Date: 2026-09-27
- Verdict: CLEAR

## Event
Authenticated owner creates or edits a LookProfile; a new immutable version row is appended and `look_profiles.current_version` advances.

## Hop chain
1. App calls `createLookProfile` / `appendLookProfileVersion` (look-service)
2. `SupabaseLookProfileRepository` validates draft via `normalizeLookProfileWriteDraft` (rejects provider blobs)
3. Writes `look_profiles` and/or `look_profile_versions` under RLS (`owner_user_id = auth.uid()`)
4. Optimistic bump of `current_version` matching prior revision
5. Read-back assembles `LookProfileRecord` via domain parsers

## Simulations
- N-actors: RLS + service `getAuthenticatedUserId` — other users cannot read/write foreign profiles
- Invalid/missing: unknown source/capability/provider keys rejected before write; missing profile → error; archived cannot append (must duplicate)
- Two consumers / crash: concurrent append hits unique (profile_id, version) or failed optimistic `current_version` match → explicit Konflikt error; no silent overwrite of prior versions

## Flags
None.
