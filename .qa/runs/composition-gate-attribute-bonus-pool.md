# Composition Gate — attribute-bonus-pool

- HEAD_SHA: WORKTREE (committed tip `b18a1061d34632d0869843788d156a38081b3601` + uncommitted attribute persistence / E2E / tooltip fixes)
- BASE_SHA: `dea1502ddef740ace9646a48a98838fbebcd131f` (merge-base with `main`; last merged PR on main: #83)
- Date: 2026-09-02
- Verdict: **CLEAR**

## Event
Spieler verteilt 15 Basis-Attribut-Bonuspunkte (+0…+4), optional permanente Level-8/16-Entwicklungen, sieht `d20 + Bonus`, und speichert den Charakter so, dass Basis und Entwicklung nachvollziehbar bleiben.

## Hop chain
`CharacterEditor` state (`baseAttributes`, `attributeAdvances`, `characterLevel`)
→ `attributeProgression.ts` (`isValidSagaDriveBaseAttributeDistribution` / `applySagaDriveAttributeAdvances` / `isValidSagaDriveAttributeBuild`)
→ UI-Karten (`+{base} Bonus`, Budget-Badge, optionale Entwicklungs-Selects, `AttributeD20Icon`)
→ abgeleitete Stats (`buildSagaDriveDerivedStatCards` mit **final** `attributes`)
→ Persistenz: `characterService.createCharacter({ attributes: final, sagadrive_profile: { baseAttributes, attributeAdvances, … } })`
→ Normalize/Load: `normalizeSagaDriveProfile` + `resolveSagaDriveAttributeBuildState` rekonstruiert Editor-State (Basis vs. Advances); Legacy ohne `baseAttributes` → Final als Basis, Advances leer
→ Server: `assertValidSagaDriveAttributePersistence` prüft Build + Final=Base+Advances bei vorhandenen `baseAttributes`

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors / 1 event | Eine Figur: Basis 15 exakt; je Level-8/16 genau ein Advance; Final ≤ +5; Derived nutzt Final. | Editor-Validierung und Derived-Cards folgen dem Final-Wert. Budget-Badge und Selects folgen Basis + separaten Advances. | pass |
| Invalid / missing | Summe ≠ 15, Basis > +4, fehlende Advances bei L8/16, Final > +5 → nicht speicherbar. | `attributeDistributionValid` blockiert Save; Server `isValidSagaDriveAttributeBuild` + Final-Match bei Persistenz. | pass |
| Two consumers / crash / round-trip | Save/Load behält Basis vs. permanente Entwicklung getrennt; Levelwechsel redistributiert Basis nicht. | `sagadrive_profile.baseAttributes` + `attributeAdvances` persistiert (JSONB, keine Schema-Migration). Save schreibt Final in `attributes` und Sources im Profil. Nach Save rehydriert der Editor via `resolveSagaDriveAttributeBuildState`. Legacy-Profile ohne Sources: Final = Basis, Advances `{}`. | pass |

## Flags
none

## Skip reason
n/a
