# Composition Gate — look-profile-persistence
- HEAD_SHA: f93afe7bf9e4b1fba5ba93c71c12c5d8c4b0b2be
- Date: 2026-09-27
- Verdict: **CLEAR**

## Event
User creates/edits a LookProfile → append-only version row → profile.current_version bump.

## Path
App/service → SupabaseLookProfileRepository.create/append → look_profiles + look_profile_versions (RLS) → read-back record

## Simulations
- N-actors: owner-scoped RLS; other users cannot read/write
- Invalid fallback: bad drafts rejected before write; unknown enums fail-closed
- Concurrent consumers: append uses unique (profile_id,version); bump requires matching current_version → conflict error
