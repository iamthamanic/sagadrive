# Composition Gate — npc-creature-creator-editor

- HEAD_SHA: e4dce1b89e907ec9d48405becd19cd356c6a6aae
- BASE_SHA: faf46045c37ccdc639fe8639b6fbb21a5c6a1414
- Date: 2026-09-14
- Verdict: CLEAR

## Event

User opens Library → NPCs & Kreaturen, taps `+ Neu` / `Erste Figur erstellen`, chooses NPC or Kreatur, starts Quick Create (default) or Vollständiger Charakter, submits a Statblock, then edits with live preview and Speichern.

## Hop chain

1. Library CTA (`onCreateNpc` / `onEditNpc`) → History routes `/npc-creatures/create` or `/npc-creatures/:id`
2. Create screen → `createNpcCreatureDefinition` facade → repository insert → `npc_creature_definitions` + RLS
3. Domain validate/parse + `normalizeCombatRoleForProfile` / `deriveNpcCreaturePower` (#195/#196)
4. Editor draft → `updateNpcCreatureDefinition` → payload with optional overrides/combatDetails
5. Live Statblock (`NpcCreatureStatblockPanel`) consumes `resolveNpcCreatureEffectiveStats` (one SoT for recommended vs override)
6. Full path → `clearCharacterEditorBootstrap` → existing CharacterEditor (no second full editor)

Cardinality: one create write per Erstellen; one update write per Speichern; live preview is read-only derivation (no write hop).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each signed-in user creates/edits only own Personal (or editable World) definitions | create/update go through session owner + #196 policy/RLS; no client-elevated owner | pass |
| Invalid/missing | Bad draft / noncombat+boss / missing id fails closed; save error keeps form; load miss shows retry/back | domain validate before write; editor keeps draft on save error; create preflight validate | pass |
| Two consumers / crash | Library browser + create/editor screens; CharacterEditor full path independent | separate routes; Statblock panel shared read-only; no shared mutable catalog singleton | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |
