# Composition Gate — liveact-face-retarget-profile (#385)

## Verdict
CLEAR

## Scope
Single-hop pure domain transform + one engine call site before existing avatar output.

## Hops
1. LiveActEngine frame → `applyLiveActRetargetProfile` → `LiveActAvatarOutput.applyLiveActFrame`

## Concurrent consumers
Frame listeners still receive pre-retarget semantic frame; avatar output receives retargeted face weights.

## Invalid fallback
Bad profile → identity (normalize drops non-finite / invalid ranges).

## Proof
- `node scripts/liveact-retarget-profile-check.mjs` OK
