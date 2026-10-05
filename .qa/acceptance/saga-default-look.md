# Feature: Saga default Look settings

<!-- issue #348 — feature slug: saga-default-look -->

## Intent

Saga settings gain an optional default LookProfile and a GM flag controlling whether players may use personal character Looks.

## Happy Path

- [x] Saga stores `defaultLookProfileId` or clears to null → resolution falls back to `SYSTEM_DEFAULT_LOOK_PROFILE_ID`
- [x] GM can save „Spieler dürfen einen eigenen Charakter-Look verwenden“; non-GM UI is read-only (RLS still gates UPDATE)
- [x] Settings UI shows preview/fallback and links to Look Editor (`pathForLookEdit`) — no authoring knobs
- [x] Save rejects / DB trigger rejects foreign or inactive LookProfile ids
- [x] Zero type escape hatches; `saga-default-look-check` + test-gate

## Edge Cases

- [x] Archived default → notice + UI falls back to System-Default selection
- [x] No default → system default in resolution helper
- [x] Non-GM sees readonly copy; save disabled

## Security Coverage

- projects UPDATE RLS (GM only)
- `enforce_default_look_profile_binding` trigger (owner + active)
- Client validates selected id is in `listLookProfiles` active set before save

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-saga-default-look.md`
