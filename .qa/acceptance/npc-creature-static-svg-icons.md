# Acceptance — npc-creature-static-svg-icons

## Goal

Ship static SVG thumbnails for all 19 builtin NPC/creature definitions, same style as item icons, shown in the Library NPCs & Kreaturen browser.

## Composition Gate

- Proof: `.qa/runs/composition-gate-npc-creature-static-svg-icons.md`
- Verdict: **CLEAR**

## Checklist

- [x] Domain `iconKey` on `NpcCreatureDefinition` + parse/validate
- [x] `buildBuiltinNpcCreature` sets `iconKey` from id (dots → hyphens)
- [x] Cursor PNG → VTracer pipeline (same as items): 25 SVGs under `public/assets/npc-creatures/`
- [x] Manifest `assets/npc-creature-icons.manifest.json` + `npm run icons:vectorize:npc`
- [x] Library `EntityBrowserCard` uses `buildNpcCreatureIconPublicSrc`
- [x] `npc-creature-icon-assets-check` in test-gate (rejects hand-authored NPC SVGs)
- [x] Agent rule: `.cursor/rules/npc-creature-icons.mdc` — never skip Cursor→PNG→VTracer
- [x] README Recent changes
