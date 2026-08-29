# Acceptance — validate-character-creation-progression (#20)

## Quellen
- Ticket: #20 (Epic #18), Type: chore, Labels: P2, Validierung
- Regeln: `docs/sagadrive core rules.md` §3 (Attribute), §4 (Charakterstruktur, Speziesmerkmale), §5 (Fertigkeiten/Spezialisierungen), §11 (Fähigkeitsränge/Investitionen), §12 (Essenz-Aktivierung), §13 (Stufenaufstieg, sekundäre Essenz, §13.3 höherstufige Erschaffung), §17 (Verbindliche Reihenfolge)
- Validierungsplan: `docs/sagadrive core validation.md` A2

## Preconditions
- `scripts/lib/core-probe.mjs` existiert (Ränge/EB/Fertigkeitslimit als geteilte Wahrheit).
- `scripts/test-gate.mjs` orchestriert bestehende Engines.

## Happy Path (postcondition-style)
- **B1 Nullpunkt** (Mensch/Denker/Technologisch), **B2 Lumenglanz** (Elf/Heiler/Spirituell), **B3 Rostfaust** (Ork/Kämpfer/Körperlich), **B4 Spiegelbild** (Halbling/Kämpfer/Mental), **B5 Vek-tor** (Cyborg/Diplomat/Technologisch), **B6 Vesper** (Alien-Profil/Rebell/Gebunden, Merkmal 3 Punkte) → je vollständige Stufe-1-Basis nach §17-Reihenfolge; Herkunft jedes Punkte und jeder Fähigkeit im Report nachvollziehbar.
- B1, B2, B3 bis Stufe 20 fortgeschrieben: Zweitarchetyp (Stufe 6), weiterer Archetyp (Stufe 12, B1), sekundäre Essenz, Rank-V-Fähigkeit (mind. 4 niedrigere derselben Quelle) — jede Wahl über eine freie Fähigkeitswahl (Stufen 2,4,6,8,10,12,14,16,18,20) abgerechnet.
- §13.3: B1 als Direkterstellung auf Stufe 14 (Basis + Entwicklungen 2–14) erzeugt identische Endwerte wie inkrementelles Hochleveln.

## Edge Cases (erwartete Ablehnungen, fail-closed)
1. Attribute: Startwert 5 oder Kostenüberschreitung > 10 → Ablehnung.
2. Spezies: nur 2 von 3 Punkten ausgegeben → Ablehnung; Merkmal nicht in Speziesliste (Natürliche Waffe/Elf) → Ablehnung; Außergewöhnlicher Körperbau (nicht verfügbar) → Ablehnung; Nachteile erzeugen keine Zusatzpunkte (Budget bleibt strikt 3).
3. Hintergrund: 2 Punkte auf dieselbe Fertigkeit bzw. Fertigkeit außerhalb der Viererliste → Ablehnung.
4. Fertigkeiten: Startwert 4 → Ablehnung; weniger als 6 Fertigkeiten ≥ 1 → Ablehnung.
5. Spezialisierung: auf Fertigkeit 0 → Ablehnung; zweite unter Wert 3 → Ablehnung; dritte unter Wert 5 → Ablehnung; vierte → Ablehnung.
6. Archetypen: Erschließung vor Stufe 6 → Ablehnung; Zweitarchetyp mit nur 2 Primärarchetyp-Fähigkeiten → Ablehnung; Dritter vor Stufe 12 bzw. ohne je 3 Fähigkeiten in allen erschlossenen → Ablehnung; Vierter vor Stufe 18 → Ablehnung.
7. Sekundäre Essenz: vor Stufe 10 → Ablehnung; ohne Spezialist-Fähigkeit der Primäressenz → Ablehnung; identisch zur Primäressenz → Ablehnung.
8. Fähigkeiten: Rang über Charakterrang → Ablehnung; Experte mit < 2 niedrigeren derselben Quelle → Ablehnung; Meister mit < 3 → Ablehnung; Legende mit < 4 → Ablehnung.
9. Fertigkeitsentwicklung über aktuelles Fertigkeitslimit (z. B. Wert 4 bei Novize) → Ablehnung.
10. Überlappung Hintergrund/Archetyp auf derselben Fertigkeit verfälscht die Gesamtsumme 10 nicht (Positivtest, B2/B5).

## Gütekriterien (§19.5)
- 0 Befunde; jede erwartete Ablehnung mit exakter Regelstelle im Report.
- Deterministisch, byte-reproduzierbar, kein RNG.

## Security Coverage
- N/A — reines Regelskript, keine Endpoints, keine Nutzerdaten, keine Secrets. F-xx/B-xx/P-xx nicht anwendbar (kein UI, kein Backend, kein Upload).

## Scope
- In: Startattribute (Standard + Punktekauf), 10 Fertigkeitspunkte (Hintergrund 2/Archetyp 1/frei 7), Speziesmerkmalsbudget 3, Spezialisierungsgrenzen, Progression 1–20 (Attribute 8/16, Fertigkeitsentwicklungen, freie Fähigkeiten, Ränge, Zweit-/Dritt-/Viertarchetyp, sekundäre Essenz, Rank V), §13.3-Äquivalenz.
- Out: UI-Polish, Kampfbalance der Builds, Bestiary, Kräftebudget-Slice (#Rang-I–V-Kräftebudget).

## Implementation Notes
- **Engine:** `scripts/validate-character-creation-progression.mjs` — deterministisch (kein RNG, byte-reproduzierbar: Report-MD5 bei Wiederholung identisch).
- **Positivpfade:** 6 Pflichtkonzepte (A2): B1 Nullpunkt (Mensch/Denker/Technologisch, Punktekauf 12→9 Kosten), B2 Lumenglanz (Elf/Heiler/Spirituell), B3 Rostfaust (Ork/Kämpfer/Körperlich), B4 Spiegelbild (Halbling/Rebell/Mental), B5 Vek-tor (Cyborg/Diplomat/Technologisch, Hintergrund/Archetyp-Überlappung auf Wissen → Punktbuchhaltung korrekt), B6 Vesper (Alien-Profil „Schneggl"/Rebell/Gebunden, Flugfähig = exakt 3 Punkte).
- **Progression:** B1/B2/B3 bis Stufe 20 mit vollständigem §13-Eventbudget (9 Fertigkeitsentwicklungen inkl. Zurückstellung, 10 freie Fähigkeitswahlen, 2 Attributssteigerungen), Zweitarchetyp (Stufe 6, 3 Investitionen geprüft), weiterer Archetyp (B1: Diplomat Stufe 14), sekundäre Essenz (§13.1: Stufe 10+, Spezialist+-Fähigkeit der Primäressenz), Meister/Legende-Fähigkeiten (§11.2: 2/3/4 niedrigere der Quelle).
- **§13.3-Äquivalenz:** Direkterschaffung (Basis + Entwicklungen 2–20) erzeugt für alle 3 Builds einen **byte-identischen Snapshot** wie inkrementelles Hochleveln (Level, Attribute, Skills, Spezialisierungen, Fähigkeiten, Essenzen, Archetypen).
- **Negativpfade:** 19 fail-closed-Ablehnungen mit exakter Regelstelle (§3.3 Budget/Wertebereich, §4.5 Speziesbudget/Verfügbarkeit/Körperbau-Sperre, §4.4 Listenbindung, §5.3 Cap, §5.4 Budget, §5.2 Leiter, §4.2 Archetyp-Schwellen, §13.1 Essenz-Gates, §11.2 Rang- und Investitionspflichten).
- **Gefundene Modellfragen (dokumentiert, keine Regel-Bugs):** (1) B2/B3/B4/B5/B6 Builds mussten auf exakt 3 Speziespunkte korrigiert werden — beweist, dass das Budget fail-closed prüft; (2) §5.3-Cap macht Stufe-3-Erhöhungen auf bereits maximalen Novize-Fertigkeiten unmöglich — Pläne mussten Entwicklungen umstellen (legitimes §5.5-Verhalten, kein Widerspruch); (3) §13.1 verlangt die Spezialist+-Fähigkeit **in der Primäressenz** — bestätigt durch Fail bei falscher Quelle.
- Report: `.qa/runs/validate-character-creation-progression-report.md`; verdrahtet als `checkCharacterCreationValidation()`.
- Keine App-/UI-/Schema-Änderung; kein neues Dependency.