# Composition Gate — liveact-face-m5-pilot (#384)

## Verdict
CLEAR

## Scope
Offline QtMesh FaceRig authoring adapter under `scripts/**` + published m5-face1 GLB wiring.
No new multi-hop runtime producer→consumer chain. Domain remains provider-neutral.

## Hops
1. Offline CLI (`liveact-face-authoring-qtmesh.mjs`) → FaceRig → canonicalize (PBR restore, IBM fix, sparse morph pack) → #383 validator → run ledger
2. Public GLB path → existing LiveAct morph output (unchanged runtime adapters)

## Concurrent consumers
N/A for authoring CLI. Runtime consumers of morph targets unchanged from #329–#335.

## Invalid fallback
Missing `qtmesh` → explicit error / bootstrap; no silent Blender/Faceit fallback.

## Proof
- `node scripts/liveact-face-authoring-qtmesh-check.mjs` OK (fake CLI, no network)
- `node scripts/liveact-face-asset-check.mjs --profile core-v1` OK on published m5-face1 (~94MB sparse morphs)
- `species-template-models-v1.ts` points at m5-face1

## SHA
a92856931ac96e50bdfd1ee3596ddeb1f968b947
