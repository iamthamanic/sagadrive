# Acceptance — meshy-avatar-rigging-cpu-split

## Intent
Prevent Edge CPU hard-limit kills during Meshy avatar `rigging` by splitting remesh → rig → GLB download/upload across separate poll turns, and show honest offline copy when polls fail mid-rigging.

## Preconditions
- Self-host Edge Runtime enforces CPU time soft/hard limits per isolate
- `character-avatar-meshy` poll already splits generating→rigging transition once

## Happy Path
- [x] Remesh success returns from poll without starting Auto-Rig in the same isolate turn (`generation_settings.pipeline.remeshAcked`)
- [x] Auto-Rig success persists `pending_glb_url` and returns; download+storage upload happens on a later poll
- [x] Master GLB persist (keepMaster) returns before remesh create when it runs
- [x] Overlay offline copy distinguishes worker interrupt (`KI-Worker unterbrochen`)
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout)
- [x] `avatar-meshy-generation-check` PASS

## Edge Cases
- Concurrent polls: existing remesh/rig claim IDs still serialize creates
- Download failure still maps to public `download` failure without leaving hung 99% forever after explicit fail
- Missing pending URL with succeeded rig: re-fetch rig task URL once then store (next poll after ACK)

## Security Coverage
- B-02 CORS: out of scope (no CORS change)
- Owner-scoped job rows unchanged (service role patches by job id + prior ownership checks)

## Implementation Notes
- Migration `045_character_avatar_meshy_pending_glb.sql` (+ apply-migrations registry)
- Edge: `character-avatar-meshy/index.ts` step machine
- UX: `AvatarMeshyGeneratingOverlay.tsx`, `CharacterEditor.tsx`, `AvatarMeshyPanel.tsx`
- Check: `scripts/avatar-meshy-generation-check.mjs`
- Ops: restart `sagadrive-edge` after deploy; retry stuck jobs (clear sessionStorage job id if needed)
