# Feature: NPC Creature Power Framework

<!-- refined by implement for issue #195 -->

## Intent

SagaDrive erhält einen verbindlichen, UI-unabhängigen Regelkern für kompakte NPC-/Kreaturen-Statblocks: Stufe 1–20, Machtgrad, Standard/Elite/Boss, Kampfprofile, Benchmarks und Elite-/Boss-Impulse — ohne zweites Kampfsystem.

## Preconditions

- Design: `.qa/design/npc-creature-power-framework.md`, `.qa/design/npc-creature-benchmarks.md`
- Rules kernel under `src/domains/rules/sagadrive/**`

## Happy Path

- [x] Core §15 enthält Stufe 1–20, Machtgrad, Profile und Standard/Elite/Boss; alte Scherge-/Blanket-+1-Regeln entfernt
- [x] Pure Rules-Kernel-Funktionen liefern für alle 20 Stufen Primärwerte, DEF, HP, Widerstände, Schaden und Profiltransformationen deterministisch
- [x] Elite/Boss-Impulse, HP-Multiplikatoren, Wendepunkt, Cap-Verhalten und Rundung per Regression-Tests; keine UI-/Persistenzabhängigkeit
- [x] Bestehende Schadensklassen/EB-/Skillcaps/Wirkungsbudgets unverändert wiederverwendet
- [x] Touched files: zero type escape hatches; no external side-effect jobs

## Edge Cases

- [x] Nichtkämpferisch Stufe 12: kein Boss-Overlay; Schaden d4+1; DEF −1
- [x] Profilboni capped / max ±1 attack; resistance clamp vs defense
- [x] HP Profil×Rolle einmal aufrunden (`combineHealth`)
- [x] Kampfunfähig blockiert Impulse

## Regression

- [x] Enemy/encounter validate (#24) an neues §15 angepasst und grün
- [x] `architecture-boundary-check` / typed-strict via test-gate

## Assumptions

- Encounter-Budget über stark unterschiedliche Einzelstufen bleibt späterem Slice vorbehalten
- Zahlen sind verbindliche Playtestwerte

## Screenshots

N/A (rules-only, no UI)

## Security Coverage

| Item | Status | How |
|------|--------|-----|
| — | n/a | Pure domain math; no trust boundary |

## Composition Gate

- HEAD_SHA: edde5e8150cd2e2c412caa2236f3723dcae2f6e4
- BASE_SHA: 8a15acaa7828589699dcab2eea86b416ba608c21
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-npc-creature-power-framework.md`

## Implementation Notes

- `src/domains/rules/sagadrive/npc-creature-power/**`
- `scripts/npc-creature-power-framework-check.mjs` + test-gate wire
- Core §15 rewrite; `validate-enemy-encounter-boss-balance.mjs` updated
