# Composition Gate — liveact-human-ground-truth-repair

- HEAD_SHA: 8ef781bdf532d5d6c187a6e3961c7e811e3c4d61
- Date: 2026-10-02
- Verdict: CLEAR

## Event
Final Coupled-Shell face3 human templates (m5/f5) are published and resolved for LiveAct consumption without semantic loss.

## Hop chain
reviewed GT (`agent_reviewed`) → surface ownership (GT-bound + topology-local) → coupled-shell resolution (Option C seam-local) → functional morph authoring (7/51) → final GLB (`*-face3-final.glb`) → VRM pack (`avatar-vrm-pack.mjs`) → published asset (`public/.../*-face3.{glb,vrm}`) → resolver (`species-template-models-v1.ts` + `?v=quality5-face3-coupled1`) → runtime loader → LiveAct consumption (`gazeMode=morphs`)

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | m5 and f5 both load validated face3 VRM | same contract URLs, no m5/f5 runtime branches | pass |
| invalid / missing | fail closed or generic GLB fallback | Generic `*-m5.glb` / `*-f5.glb` remain published; primary is face3 VRM | pass |
| 2 consumers / crash | cache-bust pins identical candidate | `quality5-face3-coupled1` + published SHA match final GLB/VRM | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | no open flags |

## Identity continuity
- m5 GLB SHA `5052b0adc8a3287a…` == public GLB == pack input; VRM `61225e434bf2e4ad…`
- f5 GLB SHA `f080391ae1b2e14a…` == public GLB == pack input; VRM `20db033a14640401…`
- jawOpen hashes preserved: m5 `e046833a…`, f5 `1956c38e…`
- L/R blink/smile semantics preserved through GLB→VRM morph parity
- Coupled-shell jaw secondary patches present after packaging (VRM functional + morph parity PASS)
- Gaze path unchanged; no #424 gains

## Skip reason
n/a
