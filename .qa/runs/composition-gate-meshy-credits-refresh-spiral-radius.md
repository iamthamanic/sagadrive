# Composition Gate — meshy-credits-refresh-spiral-radius

- Date: 2026-09-18
- HEAD: 185a0472506e5dd79fe571c114590ad27ab44f64
- Verdict: **CLEAR**

## Path
1. Producer: Edge `ai-provider-credentials` action `refresh` (owner BYOK + Meshy balance).
2. Consumer: `AvatarMeshyPanel` `configuredProviders[].meta.credits` (select + confirm modal).
3. Overlay: static CSS spiral inject (no credit hop).

## Simulations
- N-actors: refresh is per-user Edge + owner_user_id; no cross-tenant credit write.
- Invalid/missing: refresh failure keeps last known credits (fail soft); no invented balance.
- Two consumers: panel state is single SoT; SelectItem and modal both read `balanceCredits` / provider meta from same array.

## Notes
- No fan-out side effects; refresh does not start Meshy jobs.
