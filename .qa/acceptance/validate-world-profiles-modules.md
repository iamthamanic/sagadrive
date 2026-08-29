# Acceptance — validate-world-profiles-modules (#30)

## Quellen
- Ticket: #30 (Epic #18), Type: chore, Labels: P2, Validierung
- Regeln: `docs/sagadrive core rules.md` §4.7 (20 Pflichtfelder Weltprofil), §16.1 (Modulvertrag), §16.2 (Regelpriorität 4-stufig), §16.3 (Deaktivierung), §16.4 (Härtegrade), §16.5 (Magie-/Technologiestufen 0–4 unabhängig), §17 Schritt 1
- Validierungsplan: `docs/sagadrive core validation.md` F1

## Preconditions
- Engines #19–#26 existieren (die Profil-Engine referenziert deren Invarianten als Basis-Verhalten).

## Happy Path (postcondition-style)
- **Drei Pflichtprofile** (klassische Fantasy, moderne Gegenwart, High-Tech-SciFi) füllen alle 20 §4.7-Pflichtfelder explizit aus; jedes Profil deklariert Magie-/Technologiestufe (§16.5, unabhängig), aktive Module, deaktivierte Core-Regeln samt Ersatzregeln.
- **Cross-Setting-Abbildung:** identische funktionale Konzepte (Heiler körperlich vs technologisch; Kämpfer mental; Rebell gebunden) laufen in allen Profilen über dieselben Core-Mechaniken ohne neue Subsysteme — nur Flavor/Tags/Quellen differieren.
- **Modulpriorität (§16.2):** mindestens zwei absichtliche Konfliktfälle werden deterministisch nach der 4-Stufen-Priorität (spezifische Fähigkeit > Spezialmodul > Weltprofil > Core) aufgelöst.
- **Unabhängigkeit:** Fantasy = Magie 4/Tech 0, Gegenwart = Magie 0/Tech 3, Sci-Fi = Magie 1/Tech 4 — Achsen unabhängig einstellbar (Edge Case 3).

## Edge Cases (fail-closed)
1. **Stille Core-Änderung:** Profil setzt Drive-Max auf 4 ohne Deklaration als Abweichung → Ablehnung (§4.7 Feld 20).
2. **Deaktiviertes Drive/Momentum ohne Ersatzregeln:** Profil deaktiviert Momentum, referencing Momentum-Fähigkeiten ohne Ersatzbegrenzung → Ablehnung (§16.3).
3. **Modulkonflikt:** zwei Module beanspruchen denselben Core-Abschnitt ohne Konflikt-Deklaration → Ablehnung (§16.1).
4. **Prioritätsverstoß:** Weltprofil versucht, eine spezifischere Modulregel zu überschreiben → Ablehnung (§16.2).
5. **Genresperrung:** Gegenwart-Profil (Magie 0) erlaubt Spirituell-Essenz-Kraft volle Wirkung ohne Deklaration → Ablehnung; die Sperrung muss als deaktivierte Regel + Ersatzregel deklariert sein.

## Gütekriterien
- 0 Findings; deterministische Profil-Audits und Konflikt-Resolver; byte-reproduzierbarer Report.

## Security Coverage
- N/A — reines Regelskript; keine Endpoints, keine Nutzerdaten, keine Secrets.

## Scope
- In: 3 vollständige 20-Felder-Profile, Cross-Setting-Abbildungen, Modulvertrag + Priorität + 2 Konfliktfälle, Deaktivierungen + Ersatzregeln.
- Out: Lore-Ausbau, settingeigene Regel-Engines.

## Implementation Notes
- **Engine:** `scripts/validate-world-profiles-modules.mjs` — deterministisch (Report-MD5 `82f3868bcd6a75d88a122f68b466cdd2`), kein RNG.
- **Profileldaten:** 3 Pflichtprofile (Eldenmark/Fantasy Magie 4·Tech 0, Graustadt/Gegenwart Magie 0·Tech 3, Orbita/SciFi Magie 1·Tech 4) füllen alle 20 §4.7-Felder; Graustadt deklariert die Spirituell-Sperrung als deaktivierte Regel **mit** Ersatzregel (§16.3-Muster).
- **§16.2-Resolver:** 4-Stufen-Priorität implementiert (spezifisch > Modul > Profil > Core); 3 deterministische Konfliktfälle: Modul schlägt Core (§8.8-Heilung), Modul-Konflikt muss deklariert sein (§16.1), Weltprofil kann aktives Modul nicht überschreiben.
- **Cross-Setting (F1):** 6 Abbildungen — Heiler (Körperlich vs Technologisch), Kämpfer (Mental × 2 Flowers), Rebell (Gebunden × 2 Flavors) laufen alle über dieselben Core-Mechaniken (Essenz-Aktivierung aus #25, Rang-Gates aus #20), nur Flavor/Quellen-Tags differieren.
- **Negativpfade (fail-closed, mit Regelstelle):** stille Drive-Max-Änderung (§4.7/20), Momentum deaktiviert ohne Ersatzregel (§16.3), Spirituell-Sperrung ohne Markierung (§16.3), Weltprofil-Überschreibversuch eines aktiven Moduls (§16.2).
- **Unabhängigkeit:** Magie-/Tech-Achsen in allen Profilen frei kombiniert (4/0, 0/3, 1/4) — Edge Case 3 erfüllt.
- Report: `.qa/runs/validate-world-profiles-modules-report.md`; verdrahtet als `checkWorldProfilesValidation()`; F1-Status im Validation-Doc.
- Keine App-/UI-/Schema-Änderung; kein neues Dependency.