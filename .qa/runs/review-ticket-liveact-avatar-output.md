# Review Ticket — liveact-avatar-output (#332)

- Verdict: **APPROVE**

## Summary

LiveAct frames now drive avatars through dedicated VRM/GLB output adapters with an explicit 52-channel alias table and capability reporting. Manual facial preview keeps exclusive layer semantics via `setWeight`; LiveAct and legacy face-tracking drive use `applyWeightsBatch` / direct expression apply without sibling nulling.

## Findings

| Severity | Item |
|----------|------|
| Info | GLB eye gaze depends on optional eye bone aliases; LookAt remains VRM-first. |

## Blockers

- none
