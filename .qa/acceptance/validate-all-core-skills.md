# Acceptance — validate-all-core-skills (#28)

## Quellen
- Ticket: #28 (Epic #18), Type: chore, Labels: P1, Validierung
- Regeln: `docs/sagadrive core rules.md` §5.1 (18 Skills), §5.2 (Spezialisierung +2, Leiter, Fachhandlung), §5.3 (Caps / anwendbarer EB), §5.6 (Handlungskategorien), §5.8 (Beschreibungen/Abgrenzungen), §3.5 (alternative Attribute), §3.6 (reine Attributschecks)
- Validierungsplan: `docs/sagadrive core validation.md` A3

## Preconditions
- `scripts/lib/core-probe.mjs` (SPECIALIZATION_BONUS, rankRowFor).
- Domain-Katalog: `src/domains/rules/sagadrive/character-creation/index.ts` → `sagaDriveSkillDefinitions`.

## Happy Path (postcondition-style)
- **18 Skills:** Katalog exakt Athletik…Auftreten; Domain-Keys/Labels/Attribute synced; Ticket-Alias „Steuern“ = Fortbewegungsmittel (`driving`).
- **Pro Skill:** gewöhnliche Anwendung @ Rang 0 erlaubt; trainierte @0 fail-closed / @1+ ok; Fachhandlung braucht Training + passende Spezialisierung (vor dem Wurf erkennbar).
- **Spezialisierung +2:** anwendbarer Spec erhöht Flat um genau +2; getrennt von Rang und EB.
- **Pflichtabgrenzungen:** 7 Paare + Wissen/Ermitteln — jede Handlung genau einer Fertigkeit (oder Ausdauer-Attribut) zugeordnet.
- **Universelle Abdeckung:** typische Handlungsmuster brauchen keine 19. Core-Fertigkeit (Belastbarkeit/Sprachen explizit non-Skill).

## Edge Cases (fail-closed)
1. Spec / Fachhandlung ohne Skilltraining → Ablehnung (§5.2/§5.6).
2. Skill über Rang-Cap → Ablehnung (§5.3).
3. Alternatives Attribut im direkten Kampf → Ablehnung (§3.5).
4. Reiner Attributscheck trotz existierender Fertigkeit → Ablehnung (§3.6).
5. Alternatives Attribut ersetzt Nachbarfertigkeit nicht dauerhaft (z. B. Technik+GES ≠ Fingerfertigkeit-Schloss).
6. 2./3. Spec unter Leiter-Minimum → Ablehnung; max 3 Specs.

## Gütekriterien
- 0 Findings; deterministisch; byte-reproduzierbarer Report.
- Keine Änderung an `docs/sagadrive core rules.md`.

## Security Coverage
- N/A — reines Regelskript; keine Endpoints, keine Nutzerdaten, keine Secrets.

## Scope
- In: Script, Report, Test-Gate, Acceptance, Composition-Gate-Proof.
- Out: neue Skills, Kampf-/Kräftebalance, Skill-Editor-UI (#21), Core-Doc-Rename Steuern.

## Implementation Notes
- **Engine:** `scripts/validate-all-core-skills.mjs`
- Report: `.qa/runs/validate-all-core-skills-report.md`
- Test-Gate: `checkAllCoreSkillsValidation()` nach World-Profiles
- Domain-Fix-Policy: nur wenn Sync rot; Core-Doc unverändert
