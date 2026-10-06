# Acceptance — Advanced Look Adaption contract (#355)

Feature slug: `advanced-look-contract`

## Intent

Provider-neutral Advanced Look Adaption contract for future AI/neural rendering (`rendered` + `realtime`), reusing LookProfile/LookReference — no engine or UI.

## Checklist

- [x] Advanced Contract supports at least `rendered` and `realtime` as separate provider capabilities (`supportsRendered` / `supportsRealtime`)
- [x] Guide-input contract reserves beauty/clay, depth, normals, edges, segmentation, camera, and temporal/motion context without forcing a concrete engine
- [x] Capability negotiation treats `supportsRendered` and `supportsRealtime` independently; missing capabilities degrade explicitly
- [x] Basic and Advanced reference the same LookProfile / LookReference source contract (no parallel style objects)
- [x] Touched files: zero type escape hatches; `advanced-look-contract-check` wired in test-gate

## Evidence

- Domain: `src/domains/look/advanced-adaption.ts`, `advanced-look-provider-registry.ts`
- Docs: `docs/advanced-look-adaption.md`, `.qa/design/look-system.md`
- Gate: `node scripts/advanced-look-contract-check.mjs`

## Composition Gate

- Verdict: SKIPPED (single-hop domain/docs contract; no producer→consumer path)
- Proof: `.qa/runs/composition-gate-advanced-look-contract.md`
