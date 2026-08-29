# Composition Gate Proof — validate-world-profiles-modules (#30)

- HEAD_SHA: Commit `feat(rules): world profiles & modules validation engine (#30)` auf `validate/world-profiles-modules` (`0276c15f...`, gemerged als PR #77 → main `8c7ed68`)
- BASE_SHA: `3fe478d` (main nach #76)

## Ablageklassen
- **UI-Flows:** keiner berührt (Diff nur `scripts/`, `.qa/`, `docs/`)
- **Service-Schicht:** keine
- **Backend/Persistenz:** keine Migration, kein Schema-Diff
- **Domain-Regeln:** NEU — `scripts/validate-world-profiles-modules.mjs` (§4.7 20-Felder-Audit, §16.1 Modulvertrag, §16.2 4-Stufen-Prioritäts-Resolver, §16.3 Deaktivierungs-Audit, §16.5 unabhängige Skalen)

## Risiko-Matrix
| Risiko | Bewertung | Behandlung |
|---|---|---|
| Stille Core-Abweichung über Weltprofil | hoch | §4.7/20-Abweichungsliste ist Pflicht; Negativpfad (Drive-Max still auf 4) wird fail-closed abgelehnt |
| Deaktivierte Ressource ohne Ersatz | hoch | §16.3-Audit verlangt Ersatzregel oder Nicht-Verfügbar-Markierung; Negativpfade Momentum + Spirituell-Sperrung abgelehnt |
| Modulpriorität mehrdeutig | mittel | §16.2-Resolver deterministisch; aktives Modul schlägt Weltprofil und Core; Profil-Überschreibversuch abgelehnt |
| Cross-Setting braucht neue Subsysteme | mittel | 6 Abbildungen nutzen ausschließlich Core-Mechaniken aus #19/#20/#25 (Probe, Ränge, Essenz-Aktivierung); nur Flavor/Tags/Quellen differieren |
| Magie/Tech Kopplung | niedrig | Achsen unabhängig (4/0, 0/3, 1/4) geprüft gegen §16.5-Skala 0–4 |

## Simulationsprofil
- 3 Pflichtprofile (Eldenmark, Graustadt, Orbita), alle 20 §4.7-Felder + Skalen + Deklarationen
- 3 §16.2-Konfliktfälle deterministisch aufgelöst
- 4 Negativpfade fail-closed mit Regelstelle in der Message
- Report deterministisch (MD5 `82f3868bcd6a75d88a122f68b466cdd2`, kein RNG)

## Verdict: CLEAR

## Notes
- `docs/sagadrive core rules.md` unverändert; alle Abweichungen leben als deklarierte Profildaten.
- **Datei-Historie / Kollisions-Fix:** Dieses Proof lag zunächst unter `composition-gate-world-profiles-modules.md` und kollidierte dort mit dem historischen UI-Proof des Weltprofil-Editors (`species-development`-Module, gemergt via #45, `c0dae15`). Der historische Proof wurde an seinem ursprünglichen Pfad wiederhergestellt; dieses Validation-Proof liegt jetzt unter dem korrekten Ticketslug `composition-gate-validate-world-profiles-modules.md` (Slug-Konvention analog #19–#26).