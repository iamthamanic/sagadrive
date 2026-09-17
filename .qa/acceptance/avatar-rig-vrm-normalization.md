# Acceptance — avatar-rig-vrm-normalization

<!-- seeded for GitHub issue #6 / avatar-order-06 -->

## Intent
Importierte und generierte Avatare werden providerneutral analysiert und auf einen kanonischen SagaDrive-Humanoid-Rig-/Capability-Vertrag normalisiert.

## Preconditions
- #5 custom import auf `main` (`rigAnalysisStatus: pending`).

## Happy Path
- [ ] Pure Domain: `SagaDriveHumanoidRigV1`, capability flags, analysis status DTO.
- [ ] Alias-Map VRM/Meshy/SkinTokens/Blender → canonical bones/anchors.
- [ ] Infrastructure analyzer with bounded traversal; no client capability escalation.
- [ ] App shows DE labels for analyzing/ready/limited/failed; unsupported features disabled with reason.
- [ ] Result includes `rigContractVersion`; reproducible for same bone set.
- [ ] architecture-boundary + typed-strict + rig-check grün.

## Edge Cases
- [ ] Incomplete skeleton → `rigged` but not `humanoid`.
- [ ] Twist/helper bones ignored; mapping remains unique.
- [ ] Fake provider success cannot upgrade capabilities.

## Scope
In: domain rig contract + capability resolver, infra alias mapping + bounded analyze, UI capability readout.
Out: Auto-rig jobs (#161), equipment UI, face tracking, animation assets (#8).

## Security Coverage
- B-09: Capabilities only from validated artifact analysis, never client claims.
- P-02: DE status messages without stack traces.
- Out: B-04/B-07/B-08.

## Composition Gate
- HEAD_SHA: WORKTREE
- Verdict: pending

## Implementation Notes
(filled after coding)
