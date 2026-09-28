# Feature: Finale 10 SagaDrive-Starttemplates als Level-1-Build-Vertrag (#465)

## Intent
Fixiere vor der Implementierung den finalen SagaDrive-Core-Vertrag für die zehn vorkonfigurierten Level-1-Starttemplates.

## Happy Path
- [x] Design-Datei enthält exakt: Berserker, Vanguard, Zauberer, Technomant, Medicus, Mystiker, Assassine, Mechanom, Mentalist, Herold; keine Wächter/Waldläufer.
- [x] Je Rolle: Archetyp, Essenz, Background, Attribute `[4,3,3,2,2,1]`-Permutation, Archetyp-+1, BG-+2, freie +7, Background-Spezialisierung — regelkonform (final ≤3).
- [x] Kurze Begründung je Rolle; keine neue Klassen-/Ability-Regel.
- [x] Explizit: Spezies, Identity, Appearance, Avatar, Portrait, Inventar, Equipment nicht gesetzt.
- [x] Zero type escape hatches (docs-only).

## Composition Gate
- Verdict: SKIPPED (docs-only, no producer→consumer hop)
- Proof: `.qa/runs/composition-gate-character-starting-templates-design-v1.md`

## Implementation Notes
- `.qa/design/character-starting-templates-v1.md`
- Check: `scripts/character-starting-templates-design-v1-check.mjs`
