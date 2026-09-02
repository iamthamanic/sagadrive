# SagaDrive Character Creation & Progression Report (#20)

Deterministische Prüfung von §17 (Erschaffung) und §13 (Progression). Kein RNG.

- Stufe-1-Basen (§17, 6 Pflichtkonzepte): 6/6
- Progressionen bis Stufe 20 (§13): 3/3
- §13.3-Direkterschaffungs-Äquivalenzen: 3
- Negative Pfade korrekt abgelehnt: 20
- Findings: 0

## Negative Pfade (fail-closed, mit Regelstelle)

- §3.3 Attributswert 5 → abgelehnt: §3.3: §3.3: X1: Attributswert 5 außerhalb +0…+4.
- §3.3 Attributsbudget überschritten → abgelehnt: §3.3: §3.3: X2: Attribut-Bonuspunkte 16 ≠ 15.
- §3.3 Attribut unter +0 → abgelehnt: §3.3: §3.3: X2b: Attributswert -1 außerhalb +0…+4.
- §4.5 Merkmalsbudget nur 2 Punkte → abgelehnt: §4.5: §4.5: X3: Merkmalsbudget 2 ≠ 3 — Nachteile erzeugen keine Zusatzpunkte.
- §4.5 Merkmal nicht in Speziesliste → abgelehnt: §4.5: §4.5: X4: „Natürliche Waffe" ist für Elf nicht zulässig.
- §4.5 Außergewöhnlicher Körperbau nicht verfügbar → abgelehnt: §4.5: §4.5: X5: unbekanntes Merkmal „Außergewöhnlicher Körperbau".
- §4.4 Hintergrund mit 3 Punkteinträgen → abgelehnt: §4.4: §4.4: X6: Hintergrund vergibt genau 2 Punkte (als 2 Einträge), erhalten 3.
- §4.4 Fertigkeit außerhalb der Hintergrundliste → abgelehnt: §4.4: §4.4: X7: „Heimlichkeit" ist nicht in der Hintergrundliste Labor ([Technik, Ermitteln, Wissen, Aufmerksamkeit]).
- §5.3 Startwert über Limit (Start-Maximum) → abgelehnt: §5.3: §5.3: X8: „Technik" würde 4 über Fertigkeitslimit 3 (Stufe 1) steigen.
- §5.4 freie Punkte ungleich 7 → abgelehnt: §5.4: §5.4: X9: freie Fertigkeitspunkte 6 ≠ 7 (nicht ausgegebene verfallen).
- §5.2 Spezialisierung auf Fertigkeit 0 → abgelehnt: §5.2: §5.2: XA: Spezialisierung 1 in „Akrobatik" erfordert Fertigkeitswert ≥ 1, vorhanden 0.
- §5.2 zweite Spezialisierung unter Wert 3 → abgelehnt: §5.2: §5.2: XB: Spezialisierung 2 in „Technik" erfordert Fertigkeitswert ≥ 3, vorhanden 2.
- §4.2 Zweitarchetyp vor Stufe 6 → abgelehnt: §4.2: §4.2: XC: Archetyp 2 frühestens Stufe 6.
- §4.2 Zweitarchetyp ohne 3 Investitionen (2 von 3) → abgelehnt: §4.2: §4.2: XD: Archetyp 2 erfordert 3 Fähigkeiten im erschlossenen Archetyp Denker, vorhanden 2.
- §4.2 Zweitarchetyp ohne 3 Investitionen (1 von 3) → abgelehnt: §4.2: §4.2: XD2: Archetyp 2 erfordert 3 Fähigkeiten im erschlossenen Archetyp Denker, vorhanden 1.
- §13.1 sekundäre Essenz vor Stufe 10 → abgelehnt: §13.1: §13.1: XE: sekundäre Essenz frühestens Stufe 10.
- §13.1 sekundäre Essenz ohne Spezialist+-Fähigkeit → abgelehnt: §13.1: §13.1: XF: sekundäre Essenz erfordert eine Spezialist+-Fähigkeit der Primäressenz Mental.
- §11.2 Meister-Rang vor Stufe 13 → abgelehnt: §11.2: §11.2: XG: Rang Meister erst ab Stufe 13 (Charakterrang Experte, Stufe 12).
- §11.2 Legende ohne 4 niedrigere der Quelle → abgelehnt: §11.2: §11.2: XH: Legende-Fähigkeit „Vorzeitiger Legendenrang" erfordert 4 niedrigere Fähigkeiten derselben Quelle „Archetyp Denker", vorhanden 3.
- §5.3 Fertigkeitsentwicklung über Limit bei Stufe 3 → abgelehnt: §5.3: §5.3: XI: „Technik" würde 4 über Fertigkeitslimit 3 (Stufe 3) steigen.

## §13.3 Direkterschaffungs-Äquivalenz

- B1: Direkterschaffung = inkrementeller Aufstieg (Snapshot identisch, §13.3).
- B2: Direkterschaffung = inkrementeller Aufstieg (Snapshot identisch, §13.3).
- B3: Direkterschaffung = inkrementeller Aufstieg (Snapshot identisch, §13.3).

## Provenance — alle Builds (vollständige Herkunft)

### B1 Nullpunkt: Spezies Mensch, Hintergrund Labor, Primärarchetyp Denker, primäre Essenz Technologisch
    Merkmale (Mensch): Geschärfter Sinn, Umweltanpassung, Enge Resistenz = 3/3 Punkte
    Attribute: Bonuspool 1/3/2/4/3/2 = 15/15
    Technik += 1 → 1 (Hintergrund, Stufe 1)
    Ermitteln += 1 → 1 (Hintergrund, Stufe 1)
    Wissen += 1 → 1 (Primärarchetyp, Stufe 1)
    Technik += 2 → 3 (frei, Stufe 1)
    Ermitteln += 1 → 2 (frei, Stufe 1)
    Aufmerksamkeit += 1 → 1 (frei, Stufe 1)
    Wissen += 1 → 2 (frei, Stufe 1)
    Überleben += 1 → 1 (frei, Stufe 1)
    Steuern += 1 → 1 (frei, Stufe 1)
    Spezialisierung 1 in Technik: „Intrusion" (Wert 3)
    Kernfähigkeit Analyse (Novize, §11.3)
    Erste Essenzmanifestation: „Kaltstart" (Technologisch, Novize)
    Audit [§17/20]: Rang Novize, EB +1, Fertigkeitslimit 3, Drive 3, Gruppen-Momentum 0 — bestanden.
  Stufe 2 [§11.2] Fähigkeit „Traceback" (Novize, Quelle: Archetyp Denker)
    Spezialisierung 2 in Technik: „Netzspuren" (Wert 3)
  Stufe 4 [§11.2] Fähigkeit „Firewall-Reflex" (Novize, Quelle: Archetyp Denker)
    Technik += 1 → 4 (Fertigkeitsentwicklung, Stufe 5)
  Stufe 5 [§4.1] Rang Spezialist: EB +2, Fertigkeitslimit 4
  Stufe 6 [§4.2] Archetyp 2 „Rebell" erschlossen inkl. Kernfähigkeit (verbraucht freie Wahl)
    Ermitteln += 1 → 3 (Fertigkeitsentwicklung, Stufe 7)
  Stufe 8 [§3.7] Attribut Verstand → 5
  Stufe 8 [§11.2] Fähigkeit „Ghostwalk" (Spezialist, Quelle: Archetyp Rebell)
    Wissen += 1 → 3 (Fertigkeitsentwicklung, Stufe 9)
  Stufe 9 [§4.1] Rang Experte: EB +3, Fertigkeitslimit 4
  Stufe 10 [§11.2] Fähigkeit „Überladung" (Spezialist, Quelle: Essenz Technologisch)
    Spezialisierung 1 in Wissen: „Netzarchitekturen" (Wert 3)
  Stufe 12 [§11.2] Fähigkeit „Nebelform" (Novize, Quelle: Archetyp Rebell)
    Technik += 1 → 5 (Fertigkeitsentwicklung, Stufe 13)
  Stufe 13 [§4.1] Rang Meister: EB +4, Fertigkeitslimit 5
  Stufe 14 [§4.2] Archetyp 3 „Diplomat" erschlossen inkl. Kernfähigkeit (verbraucht freie Wahl)
    Aufmerksamkeit += 1 → 2 (Fertigkeitsentwicklung, Stufe 15)
  Stufe 16 [§3.7] Attribut Geschicklichkeit → 4
  Stufe 16 [§13.1] Sekundäre Essenz Mental inkl. Novize-Manifestation (verbraucht freie Wahl)
    Steuern += 1 → 2 (Fertigkeitsentwicklung, Stufe 17)
  Stufe 17 [§4.1] Rang Legende: EB +5, Fertigkeitslimit 5
  Stufe 18 [§11.2] Fähigkeit „Datenhoheit" (Meister, Quelle: Archetyp Denker)
    Ermitteln += 1 → 4 (Fertigkeitsentwicklung, Stufe 19)
  Stufe 20 [§11.2] Fähigkeit „Geist im Netz" (Legende, Quelle: Archetyp Denker)

### B2 Lumenglanz: Spezies Elf, Hintergrund Kloster, Primärarchetyp Heiler, primäre Essenz Spirituell
    Merkmale (Elf): Erweiterte Sicht, Geringer Ruhebedarf = 3/3 Punkte
    Attribute: empfohlene Verteilung 4/3/3/2/2/1 = 15/15
    Medizin += 2 → 2 (Hintergrund, Stufe 1)
    Menschenkenntnis += 1 → 1 (Primärarchetyp, Stufe 1)
    Überleben += 1 → 1 (frei, Stufe 1)
    Aufmerksamkeit += 1 → 1 (frei, Stufe 1)
    Ermitteln += 1 → 1 (frei, Stufe 1)
    Überzeugen += 1 → 1 (frei, Stufe 1)
    Wissen += 2 → 2 (frei, Stufe 1)
    Akrobatik += 1 → 1 (frei, Stufe 1)
    Spezialisierung 1 in Medizin: „Feldchirurgie" (Wert 2)
    Kernfähigkeit Feldversorgung (Novize, §11.3)
    Erste Essenzmanifestation: „Lindenlicht" (Spirituell, Novize)
    Audit [§17/20]: Rang Novize, EB +1, Fertigkeitslimit 3, Drive 3, Gruppen-Momentum 0 — bestanden.
  Stufe 2 [§11.2] Fähigkeit „Stilles Gebet" (Novize, Quelle: Archetyp Heiler)
    Medizin += 1 → 3 (Fertigkeitsentwicklung, Stufe 3)
  Stufe 4 [§11.2] Fähigkeit „Klinischer Blick" (Novize, Quelle: Archetyp Heiler)
    Medizin += 1 → 4 (Fertigkeitsentwicklung, Stufe 5)
  Stufe 5 [§4.1] Rang Spezialist: EB +2, Fertigkeitslimit 4
  Stufe 6 [§4.2] Archetyp 2 „Diplomat" erschlossen inkl. Kernfähigkeit (verbraucht freie Wahl)
    Spezialisierung 2 in Medizin: „Notfallversorgung" (Wert 4)
  Stufe 8 [§3.7] Attribut Charisma → 2
  Stufe 8 [§11.2] Fähigkeit „Seelenlicht" (Spezialist, Quelle: Essenz Spirituell)
    Überleben += 1 → 2 (Fertigkeitsentwicklung, Stufe 9)
  Stufe 9 [§4.1] Rang Experte: EB +3, Fertigkeitslimit 4
  Stufe 10 [§11.2] Fähigkeit „Wundversehen" (Spezialist, Quelle: Archetyp Heiler)
    Spezialisierung 1 in Überleben: „Feldlager" (Wert 2)
  Stufe 12 [§11.2] Fähigkeit „Wächterform" (Experte, Quelle: Essenz Spirituell)
    Wissen += 1 → 3 (Fertigkeitsentwicklung, Stufe 13)
  Stufe 13 [§4.1] Rang Meister: EB +4, Fertigkeitslimit 5
  Stufe 14 [§13.1] Sekundäre Essenz Körperlich inkl. Novize-Manifestation (verbraucht freie Wahl)
    Menschenkenntnis += 1 → 2 (Fertigkeitsentwicklung, Stufe 15)
  Stufe 16 [§3.7] Attribut Ausdauer → 4
  Stufe 16 [§11.2] Fähigkeit „Sanfte Hände" (Experte, Quelle: Archetyp Heiler)
    Spezialisierung 1 in Menschenkenntnis: „Lügen erkennen" (Wert 2)
  Stufe 17 [§4.1] Rang Legende: EB +5, Fertigkeitslimit 5
  Stufe 18 [§11.2] Fähigkeit „Seelenbrücke" (Experte, Quelle: Essenz Spirituell)
    Überzeugen += 1 → 2 (Fertigkeitsentwicklung, Stufe 19)
  Stufe 20 [§11.2] Fähigkeit „Chor der Heilung" (Legende, Quelle: Archetyp Heiler)

### B3 Rostfaust: Spezies Ork, Hintergrund Militär, Primärarchetyp Kämpfer, primäre Essenz Körperlich
    Merkmale (Ork): Natürliche Waffe, Natürlicher Schutz = 3/3 Punkte
    Attribute: empfohlene Verteilung 4/3/3/2/2/1 = 15/15
    Nahkampf += 1 → 1 (Hintergrund, Stufe 1)
    Überleben += 1 → 1 (Hintergrund, Stufe 1)
    Athletik += 1 → 1 (Primärarchetyp, Stufe 1)
    Nahkampf += 2 → 3 (frei, Stufe 1)
    Fernkampf += 1 → 1 (frei, Stufe 1)
    Einschüchtern += 1 → 1 (frei, Stufe 1)
    Akrobatik += 1 → 1 (frei, Stufe 1)
    Aufmerksamkeit += 1 → 1 (frei, Stufe 1)
    Wissen += 1 → 1 (frei, Stufe 1)
    Spezialisierung 1 in Nahkampf: „Hiebwaffen" (Wert 3)
    Kernfähigkeit Kampfroutine (Novize, §11.3)
    Erste Essenzmanifestation: „Eisenhaut" (Körperlich, Novize)
    Audit [§17/20]: Rang Novize, EB +1, Fertigkeitslimit 3, Drive 3, Gruppen-Momentum 0 — bestanden.
  Stufe 2 [§11.2] Fähigkeit „Wuchtschlag" (Novize, Quelle: Archetyp Kämpfer)
    Einschüchtern += 1 → 2 (neue Fertigkeit, Stufe 3)
  Stufe 4 [§11.2] Fähigkeit „Schildhaltung" (Novize, Quelle: Archetyp Kämpfer)
    Nahkampf += 1 → 4 (Fertigkeitsentwicklung, Stufe 5)
  Stufe 5 [§4.1] Rang Spezialist: EB +2, Fertigkeitslimit 4
  Stufe 6 [§4.2] Archetyp 2 „Rebell" erschlossen inkl. Kernfähigkeit (verbraucht freie Wahl)
    Spezialisierung 2 in Nahkampf: „Wuchtschlag" (Wert 4)
  Stufe 8 [§3.7] Attribut Stärke → 5
  Stufe 8 [§11.2] Fähigkeit „Sprungfeder" (Spezialist, Quelle: Archetyp Rebell)
    Fernkampf += 1 → 2 (Fertigkeitsentwicklung, Stufe 9)
  Stufe 9 [§4.1] Rang Experte: EB +3, Fertigkeitslimit 4
  Stufe 10 [§11.2] Fähigkeit „Klingensturm" (Spezialist, Quelle: Essenz Körperlich)
    Spezialisierung 1 in Athletik: „Ringen" (Wert 1)
  Stufe 12 [§11.2] Fähigkeit „Nebelschritt" (Novize, Quelle: Archetyp Rebell)
    Einschüchtern += 1 → 3 (Fertigkeitsentwicklung, Stufe 13)
  Stufe 13 [§4.1] Rang Meister: EB +4, Fertigkeitslimit 5
  Stufe 14 [§13.1] Sekundäre Essenz Mental inkl. Novize-Manifestation (verbraucht freie Wahl)
    Spezialisierung 1 in Einschüchtern: „Kriegsdrohung" (Wert 3)
  Stufe 16 [§3.7] Attribut Ausdauer → 4
  Stufe 16 [§11.2] Fähigkeit „Sturmbrecher" (Experte, Quelle: Archetyp Kämpfer)
    Überleben += 1 → 2 (Fertigkeitsentwicklung, Stufe 17)
  Stufe 17 [§4.1] Rang Legende: EB +5, Fertigkeitslimit 5
  Stufe 18 [§11.2] Fähigkeit „Titanenwurf" (Meister, Quelle: Archetyp Kämpfer)
    Steuern += 1 → 1 (neue Fertigkeit, Stufe 19)
  Stufe 20 [§11.2] Fähigkeit „Eiserne Legion" (Legende, Quelle: Archetyp Kämpfer)

### B4 Spiegelbild: Spezies Halbling, Hintergrund Straße, Primärarchetyp Rebell, primäre Essenz Mental
    Merkmale (Halbling): Enge Resistenz, Erweitertes Klettern = 3/3 Punkte
    Attribute: Bonuspool 1/4/2/3/3/2 = 15/15
    Heimlichkeit += 1 → 1 (Hintergrund, Stufe 1)
    Täuschen += 1 → 1 (Hintergrund, Stufe 1)
    Akrobatik += 1 → 1 (Primärarchetyp, Stufe 1)
    Heimlichkeit += 1 → 2 (frei, Stufe 1)
    Fingerfertigkeit += 1 → 1 (frei, Stufe 1)
    Akrobatik += 1 → 2 (frei, Stufe 1)
    Täuschen += 1 → 2 (frei, Stufe 1)
    Aufmerksamkeit += 1 → 1 (frei, Stufe 1)
    Ermitteln += 1 → 1 (frei, Stufe 1)
    Überleben += 1 → 1 (frei, Stufe 1)
    Spezialisierung 1 in Heimlichkeit: „Verfolgungslauf" (Wert 2)
    Kernfähigkeit Improvisation (Novize, §11.3)
    Erste Essenzmanifestation: „Spiegelgang" (Mental, Novize)
    Audit [§17/20]: Rang Novize, EB +1, Fertigkeitslimit 3, Drive 3, Gruppen-Momentum 0 — bestanden.

### B5 Vek-tor: Spezies Cyborg, Hintergrund Werkstatt, Primärarchetyp Diplomat, primäre Essenz Technologisch
    Merkmale (Cyborg): Geschärfter Sinn, Erweiterte Sicht = 3/3 Punkte
    Attribute: Bonuspool 2/2/2/3/2/4 = 15/15
    Technik += 1 → 1 (Hintergrund, Stufe 1)
    Wissen += 1 → 1 (Hintergrund, Stufe 1)
    Überzeugen += 1 → 1 (Primärarchetyp, Stufe 1)
    Überzeugen += 2 → 3 (frei, Stufe 1)
    Menschenkenntnis += 1 → 1 (frei, Stufe 1)
    Auftreten += 1 → 1 (frei, Stufe 1)
    Technik += 1 → 2 (frei, Stufe 1)
    Aufmerksamkeit += 1 → 1 (frei, Stufe 1)
    Wissen += 1 → 2 (frei, Stufe 1)
    Spezialisierung 1 in Überzeugen: „Verhandlung" (Wert 3)
    Kernfähigkeit Koordination (Novize, §11.3)
    Erste Essenzmanifestation: „Netzstimme" (Technologisch, Novize)
    Audit [§17/20]: Rang Novize, EB +1, Fertigkeitslimit 3, Drive 3, Gruppen-Momentum 0 — bestanden.

### B6 Vesper: Spezies Alien (Profil „Schneggl"), Hintergrund Bühne, Primärarchetyp Rebell, primäre Essenz Gebunden
    Merkmale (Alien): Flugfähig = 3/3 Punkte
    Attribute: Bonuspool 1/4/2/2/3/3 = 15/15
    Auftreten += 1 → 1 (Hintergrund, Stufe 1)
    Täuschen += 1 → 1 (Hintergrund, Stufe 1)
    Heimlichkeit += 1 → 1 (Primärarchetyp, Stufe 1)
    Akrobatik += 2 → 2 (frei, Stufe 1)
    Heimlichkeit += 1 → 2 (frei, Stufe 1)
    Täuschen += 1 → 2 (frei, Stufe 1)
    Auftreten += 1 → 2 (frei, Stufe 1)
    Aufmerksamkeit += 1 → 1 (frei, Stufe 1)
    Überleben += 1 → 1 (frei, Stufe 1)
    Spezialisierung 1 in Akrobatik: „Luftmanöver" (Wert 2)
    Kernfähigkeit Improvisation (Novize, §11.3)
    Erste Essenzmanifestation: „Schwarmruf" (Gebunden, Novize)
    Audit [§17/20]: Rang Novize, EB +1, Fertigkeitslimit 3, Drive 3, Gruppen-Momentum 0 — bestanden.
