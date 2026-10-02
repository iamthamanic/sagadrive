# Composition Gate — liveact-human-ground-truth-repair

- Date: 2026-10-02
- Verdict: CLEAR

## Event
Current-HEAD compact reauthor face3 (Case B) published; review-thread reproducibility contract closed without oversized FaceRig containers.

## Hop chain
reviewed GT → surface ownership → coupled-shell (jaw) + smile/pucker GT surface → functional morph authoring → final GLB (`ea483b38…` / `871e38a7…`) → VRM pack (`7d32f2f4…` / `3d288739…`) → public `*-face3.{glb,vrm}` → resolver `?v=quality5-face3-repro1` → runtime loader → LiveAct

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N actors | m5+f5 same contract | shared authoring; no asset branches | pass |
| invalid/missing | generic GLB fallback | `*-m5/f5.glb` preserved | pass |
| 2 consumers | cache-bust pins SHA | `quality5-face3-repro1` | pass |

## Flags
none
