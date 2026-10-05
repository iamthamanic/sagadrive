# Feature: Look Runtime Adapter

<!-- issue #342 — feature slug: look-runtime-adapter -->

## Intent

Provider-neutral SagaDrive LookRuntime with Apply/Restore; ToonLab only as infrastructure detail (currently BLOCKED stub per #341).

## Happy Path

- [x] `LookRuntime` apply/restore API under `src/infrastructure/look/**`
- [x] Host MToon/PBR adapter reuses material snapshots (PBR Neutral reversible)
- [x] Character + Lighting applied on CharacterStudio preview path; PostFX routed (partial/no-op)
- [x] ToonLab adapter stub returns blocked; no npm dependency; no domain ToonLab types
- [x] Unknown material roles → `unclassified` (not blanket cloth)
- [x] AvatarCanvas stays ToonLab-free
- [x] test-gate check wired; zero type escape hatches

## Edge Cases

- [x] Prefer ToonLab while BLOCKED → soft-fallback to host-mtoon with notice
- [x] Reserved world capabilities → unsupported notice

## Security Coverage

Out of scope — presentation runtime; no authz changes.

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-look-runtime-adapter.md`
