# Feature: Human quality m5/f5 as sole species templates

## Intent
Ship only quality-20260921 **m5** (male) and **f5** (female) as the human species
template meshes so LiveAct / Character Editor preview uses the authored semi-real bases.

## Happy Path
- [ ] „M gelesen“ loads `human-male-quality-20260921-m5.glb?v=quality5`
- [ ] „W gelesen“ loads `human-female-quality-20260921-f5.glb?v=quality5`
- [ ] No mesh-version picker / no softreal rollback in product path
- [ ] LiveAct gear + camera still work on the m5 viewer
- [ ] `npm run test-gate` green

## Implementation Notes
- Domain map only; LiveAct UI from main unchanged.
- Removed public m1–m4 / softreal2 / legacy human-male/female GLBs.
- MToon default off for GLB loads (studio) so PBR maps stay readable.
