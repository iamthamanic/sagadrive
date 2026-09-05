# SagaDrive Core Rules – Validierungsplan

> **Status:** geplant, noch nicht vollständig durchgeführt  
> **Stand:** 26. August 2026  
> **Epic:** #18 – SagaDrive Core Rules – Validierungsphase  
> **Regelquelle:** `docs/sagadrive core rules.md`  
> **Aktuelle Produktpriorität:** Character Editor, Character Creation und UI/UX weiterbauen; die hier dokumentierte Regelvalidierung wird anschließend schrittweise abgearbeitet.

## Zweck

Die SagaDrive Core Rules sind in den Abschnitten 1 bis 18 als verbindlicher aktueller Regelstand beschlossen. Die dort enthaltenen Zahlen sind Playtestwerte. Bevor die Rule Engine weiter ausgebaut oder die Regeln als final belastbar betrachtet werden, müssen die Kernmechaniken mathematisch, szenariobasiert und praktisch validiert werden.

Diese Datei verhindert, dass die offenen Validierungsaufgaben während der weiteren Produktentwicklung verloren gehen. Sie ist kein Blocker für die aktuelle Arbeit am Character Editor.

Der Character Editor wird jetzt auf Basis der beschlossenen Regeln weiterentwickelt. Sobald die dafür notwendigen UI-, Tooltip-, Save- und Character-Creation-Flows stehen, wird er selbst zu einer wichtigen Validierungsoberfläche.

## Grundprinzip der Validierung

Eine Regel wird nicht geändert, weil sie theoretisch ungewöhnlich wirkt oder weil eine andere Lösung vertrauter wäre. Eine Core-Regel wird nur verändert, wenn mindestens einer dieser Gründe reproduzierbar dokumentiert werden kann:

1. mathematischer Grenzfall oder systematischer Wahrscheinlichkeitsfehler,
2. reproduzierbares Problem in Simulation oder Spieltest,
3. Widerspruch zwischen zwei Core-Regeln,
4. unnötige Komplexität ohne spielerischen Mehrwert,
5. fehlende oder unverhältnismäßig aufwendige analoge Durchführbarkeit.

Jede spätere Änderung muss mindestens enthalten:

- betroffene Regelstelle,
- bisherigen Wert oder bisherige Regel,
- reproduzierbares Testszenario,
- beobachtetes Problem,
- neuen Wert oder neue Regel,
- erwartete Auswirkung,
- erneuten Regressionstest der betroffenen Nachbarsysteme.

---

## Validierungs-Epic und Issues

Kanonisches Epic: **#18**

| Issue | Bereich | Zweck | Startbedingung |
|---:|---|---|---|
| #19 | Kernwahrscheinlichkeiten | d20-Kurve, Zielwerte, EB, Spezialisierung, Vorteil/Nachteil, Sicherheitswert, Widerstände | kann unabhängig zuerst durchgeführt werden |
| #20 | Charaktererschaffung & Progression | legale Builds, Caps, Archetypen, Essenzen, Spezies, Level 1–20 und direkt höherstufige Charaktere | beschlossene Core Rules reichen aus |
| #21 | Character Editor als Regelabbildung | UI, Tooltips, Live-Validierung, Save/Reload gegen die Core Rules prüfen | nach funktionalem Character-Creation-/Tooltip-Stand; blockiert aktuelle UI-Arbeit nicht |
| #22 | Kampf & Aktionsökonomie | Initiative, Aktionen, Reaktionen, Manöver, Deckung, Sicht, Reichweite | nach #19 |
| #23 | Schaden, Rüstung, Heilung, Sterben | Attrition, Schutz, Durchdringung, 0 HP, Sterbend, Ruhe | nach #19 und #22 |
| #24 | Gegner & Begegnungsbalance | Standardgegner, Schergen, Eliten, Bosse, Budgets, Boss-Aktionsökonomie | nach #22 und #23 |
| #25 | Kräfte & Essenzen | Ränge Novize bis Legende, alle fünf Essenzen, Kontrolle, Schaden, Dauer, Aufrechterhaltung | nach #19, #20 und #22 |
| #26 | Drive & Momentum | Ressourcenfluss, Rerolls, Teamressource, deaktivierte Varianten | nach #19 |
| #27 | Nichtkampf | Recherche, soziale Konflikte, Gemeinschaftsprojekte, Gefahren, Kontakte, Ruf | nach #19 |
| #28 | 18 Fertigkeiten | Skill-Abgrenzungen, Fachhandlungen, Spezialisierungen, alternative Attribute | nach #19 |
| #29 | Reisen, Chases, Fahrzeuge | Reise-Fail-Forward, Distanzleiste, Fortbewegungsmittel, Maßstab, Struktur | nach #19 und #22 |
| #30 | Weltprofile & Module | Fantasy/Gegenwart/Sci-Fi, Modulpriorität, deaktivierte Regeln, Ersatzregeln | nach #20, #25 und #26 |
| #31 | Analoger End-to-End-Playtest | komplette Sitzungen ohne App/Rule Engine | Abschluss nach den übrigen relevanten Validierungen |
| #32 | Ausrüstung & Ressourcen | Werkzeuge, Waffenmerkmale, Traglast, abstrakte Ressourcen | nach #19 |
| #33 | Zustände | alle Core-Zustände, Widerstände, Stapelung und Kombinationen | nach #19 und #22 |

Die versehentlich erzeugten Duplikate #34, #35 und #36 sind geschlossen und nicht Bestandteil des Plans. Der kanonische Ausrüstungs-Validierungsslice ist #32.

---

# Phase A – mathematische und strukturelle Grundlagen

## A1. Kernwahrscheinlichkeiten – #19

> **Status:** durchgeführt (deterministische Engine) – 2026-08-28  
> **Skript:** `scripts/validate-core-probability.mjs`  
> **Report:** `.qa/runs/validate-core-probability-report.md`  
> **Ergebnis:** 1862 Check-Reihen / 266 Profile, 0 Befunde; exakte Deckung mit §19.1-Referenzwerten (+5 vs ZW15: 55 % / 79,75 % / 30,25 %).  
> Verdrahtet im Test Gate (`checkCoreProbabilityValidation`). Änderungen an Core-Konstanten (EB, Caps, Spezialisierung, Schwierigkeitsskala) laufen künftig automatisch gegen diese Matrix.

### Was muss geprüft werden?

Der vollständige Kerncheck:

```text
d20 + Attribut + Fertigkeit + Erfahrungsbonus + Spezialisierung + ausdrückliche Modifikatoren
```

Prüfmatrix:

- Stufen 1, 5, 9, 13, 17 und 20,
- Ränge Novize, Spezialist, Experte, Meister und Legende,
- Attribute 1 bis 5,
- Fertigkeiten 0 bis zum jeweils erlaubten Cap,
- untrainiert vs. trainiert,
- ohne und mit Spezialisierung +2,
- Zielwerte 5, 10, 15, 20, 25, 30 und 35,
- normaler Wurf,
- Vorteil,
- Nachteil,
- Sicherheitswert 10,
- statische Widerstände,
- natürliche 1 und natürliche 20.

### Zu messen

- Erfolgswahrscheinlichkeit,
- kritische Erfolgswahrscheinlichkeit,
- Fehlschlagswahrscheinlichkeit,
- kritische Fehlschlagswahrscheinlichkeit,
- Sprünge beim Erfahrungsbonus,
- Kompetenzabstand zwischen untrainiert, trainiert, spezialisiert und Weltklasse,
- Bereiche, in denen Zielwerte faktisch automatisch oder praktisch unmöglich werden.

### Warum?

Diese Kurve beeinflusst nahezu alle anderen Subsysteme. Kampf-, Powers-, Nichtkampf- und Gegnerdaten dürfen erst auf einer stabilen Grundwahrscheinlichkeit bewertet werden.

---

## A2. Charaktererschaffung & Progression – #20

### Pflicht-Builds

Mindestens:

- menschlicher Hacker,
- Fantasy-Heiler,
- körperlicher Kämpfer,
- mentaler Kämpfer,
- technologischer Diplomat,
- gebundener Rebell,
- mindestens eine Spezies mit vollständigem 3-Punkte-Merkmalsbudget.

### Zu prüfen

- Attributsverteilung,
- zehn Fertigkeitspunkte,
- Hintergrundpunkte,
- Archetyppunkt,
- Spezialisierungen,
- Speziesbudget,
- Archetyp-Kernfähigkeit,
- primäre Essenz,
- erste Essenzmanifestation,
- abgeleitete Werte,
- vollständige Progression von Stufe 1 bis 20,
- Rangwechsel Novize → Spezialist → Experte → Meister → Legende,
- direkte Charaktererschaffung auf mindestens Stufe 1, 5, 9, 13, 17 und 20,
- zusätzliche direkte Builds auf Zwischenstufen, damit nicht nur Ranggrenzen funktionieren,
- vollständige Zuteilung aller bis zur Zielstufe erworbenen Fertigkeitsentwicklungen, freien Fähigkeiten und Attributssteigerungen,
- chronologisch erfüllbare Voraussetzungen bei direkt höherstufig erstellten Figuren,
- nachvollziehbare Herkunft jeder Entwicklung über Stufe und Quelle,
- zweiter/dritter/vierter Archetyp,
- sekundäre Essenz,
- Voraussetzungen der Fähigkeitsränge Spezialist bis Legende,
- Fertigkeitscaps,
- Attributssteigerungen auf 8 und 16.

### Ziel

Jeder Punkt eines Characters muss eine eindeutige Herkunft haben. Kein Build darf Regelgrenzen durch Reihenfolge, Überschneidung oder UI-Sonderlogik umgehen. Ein direkt höherstufig erstellter Charakter muss mechanisch demselben legalen Endzustand entsprechen können wie eine Figur, die tatsächlich von Stufe 1 bis zu dieser Stufe entwickelt wurde.

---

## A3. Alle 18 Fertigkeiten – #28

Jede Fertigkeit benötigt praktische Beispiele für:

- gewöhnliche Anwendung,
- trainierte Anwendung,
- Fachhandlung beziehungsweise passende Spezialisierung,
- mindestens einen Abgrenzungsfall.

Besonders wichtig:

- Athletik vs. Akrobatik vs. Ausdauer,
- Aufmerksamkeit vs. Ermitteln,
- Menschenkenntnis vs. Täuschen,
- Fingerfertigkeit vs. Technik,
- Überleben vs. Ermitteln,
- Nahkampf vs. Athletik bei Kampfmanövern,
- Auftreten vs. Überzeugen.

Die Prüfung soll bestätigen, dass die 18 Skills universell ausreichen und kein reguläres Handlungsmuster eine zusätzliche 19. Core-Fertigkeit benötigt.

---

## A4. Ausrüstung, Werkzeuge, Traglast und Ressourcen – #32

Zu testen:

- improvisierte Werkzeuge,
- fehlende essentielle Werkzeuge,
- hochwertige Werkzeuge,
- Finesse,
- Durchdringung,
- leichte, normale und schwere Ausrüstung,
- Traglast unter Cap,
- Traglast über Cap,
- mehr als doppelte Traglast,
- Ressourcenwerte 0–5,
- Kosten unter, gleich und über Ressourcenwert,
- Weltprofil mit konkreter Währung statt abstrakter Ressource.

---

# Phase B – Character Editor als Regeloberfläche

## B1. Character Editor – #21

Dieses Issue wird **nicht vorgezogen**, nur weil der Editor aktuell gebaut wird. Die UI-Arbeit kann jetzt normal weitergehen.

Die spätere Validierung beginnt, sobald die für Character Creation relevanten Bereiche funktional stehen.

### Zu prüfen

- Zielstufe 1–20 und automatisch abgeleiteter Rang,
- Spezies,
- Hintergrund,
- Archetyp,
- Essenz,
- Attribute,
- Fertigkeiten,
- Spezialisierungen,
- vollständige Entwicklungsbudgets bei direkt höherstufigen Figuren,
- chronologische Voraussetzungskontrolle für Fähigkeiten, Archetypen und sekundäre Essenz,
- abgeleitete Werte,
- Drive/Momentum-Anzeige soweit im Editor relevant,
- Save/Reload.

Für jedes Feld muss beantwortet werden:

1. Welche Core-Regel ist die Quelle?
2. Ist der Tooltip fachlich korrekt?
3. Sind Limits und Voraussetzungen sichtbar oder zumindest eindeutig validiert?
4. Werden ungewöhnliche, aber legale Builds zugelassen?
5. Werden illegale Builds deterministisch verhindert?
6. Kommen berechnete Werte aus derselben Regelquelle und nicht aus unabhängigen UI-Konstanten?
7. Bleibt ein direkt höherstufig erstellter Build chronologisch legal und vollständig nachvollziehbar?

Beispiel für einen wichtigen Regressionstest:

- `Kämpfer + Mental` ist ungewöhnlich, aber legal.
- `Gebunden` ist der Core-Begriff; ältere Implementierungsnamen wie `Paktbasiert` dürfen nicht als Regelquelle bestehen bleiben.

Der Character Editor wird damit gleichzeitig UX-Test und erster realer Contract-Test zwischen Regelwerk und digitalem Modell.

---

# Phase C – direkter Kampf

## C1. Kampf & Aktionsökonomie – #22

> **Status:** durchgeführt (deterministische Engine) – 2026-08-28  
> **Skript:** `scripts/validate-combat-action-economy.mjs`  
> **Report:** `.qa/runs/validate-combat-action-economy-report.md`  
> **Ergebnis:** 10 Szenario-Blöcke (alle 11 Pflichtszenarien) über Bänder I/III/V, 57 Check-Reihen, 0 Befunde. Aktionsökonomie als State-Machine (§7.3), Advantage-Folding §2.5, Deckung §7.7 (Volldeckung fail-closed), Reichweite §7.8, Überraschung §7.2. Verdrahtet im Test Gate.

Pflichtszenarien:

- Nahkampfduell,
- Fernkampf mit Teildeckung,
- Fernkampf mit Volldeckung,
- Überraschung,
- Greifen und Entkommen,
- Schubsen,
- Zu-Fall-Bringen,
- Entwaffnen,
- Lösen vs. Gelegenheitsangriff,
- Bereithalten und Reaktion,
- Verborgener Angriff und anschließende Sichtbarkeit.

Zu beobachten:

- Zugdauer,
- Aktionen ohne klare Regelantwort,
- dominante Standardaktionen,
- Timing-Probleme,
- Reaktionshäufigkeit,
- Interaktion mit Bewegung und Zuständen.

---

## C2. Schaden, Schutz, Heilung und Sterben – #23

> **Status:** durchgeführt (deterministische Engine) – 2026-08-28  
> **Skript:** `scripts/validate-damage-healing-dying.mjs`  
> **Report:** `.qa/runs/validate-damage-healing-dying-report.md`  
> **Ergebnis:** 720 Szenario-Reihen (5 Schadensklassen × Schutz 0–5 × Dr 0–2 × Bänder I/III/V × 3 Ausdauerprofile), 0 Befunde. Exakte Schadensfaltungen inkl. Krit (nur Würfel verdoppelt), Dying-State-Machine (§8.5), Härtegrade Heroisch/Standard/Hart (§16.4), Erholungspfade (§8.8). Verdrahtet im Test Gate.

Testprofile:

- niedrige/mittlere/hohe Ausdauer,
- Begegnungsränge Novize, Experte und Legende,
- Schutz 0/1/2/3/5,
- mit und ohne Durchdringung.

Pflichtfälle:

- normaler Treffer,
- kritischer Treffer,
- mehrere Treffer,
- 0 Gesundheit,
- Schaden bei 0,
- Stabilisierung,
- Erste Hilfe,
- Verschnaufpause,
- volle Ruhe,
- Heroisch/Standard/Hart.

Messgrößen:

- Treffer bis Kampfunfähigkeit,
- Heilung pro Ruhephase,
- Sterbewahrscheinlichkeit,
- Effekt von Schutz,
- Attrition über mehrere Konflikte.

---

## C3. Zustände – #33

Alle Core-Zustände einzeln und kombiniert testen:

- Liegend,
- Gegriffen,
- Blind,
- Benommen,
- Verängstigt,
- Kampfunfähig,
- Bewusstlos,
- Erschöpfung,
- Verborgen relativ zu Beobachtern,
- Gestört,
- Deaktiviert.

Pflichtkombinationen:

- Gegriffen + Liegend,
- Blind + Fernkampf,
- Benommen + Bereithalten/Reaktion,
- Verängstigt + Bewegung,
- Erschöpfung 1–3,
- Bewusstlos bei 0,
- Verborgen gegenüber mehreren Beobachtern.

---

## C4. Gegner, Begegnungsbudgets und Bosse – #24

> **Status:** durchgeführt (deterministische Simulation) – 2026-08-28  
> **Skript:** `scripts/validate-enemy-encounter-boss-balance.mjs`  
> **Report:** `.qa/runs/validate-enemy-encounter-boss-balance-report.md`  
> **Ergebnis:** 290 Encounter-Zellen (Gruppen 3–6 × Bänder I–V × Routine/Standard/Schwer/Extrem × Boss/Elite/Schergen/Mixed) + 10 Boss-Szenarien, 0 Befunde. Gefallenstufen monoton, kein Schergen-Budget-Sprengen, kein Boss-Kollaps/Schleifkampf. Beobachtung: Solo-Boss-Niederlagengefahr wächst mit dem Band (Novize 0 % → Legende 58,3 % bei 4 Spielern, Budget 8 = Standard). Verdrahtet im Test Gate.

Gruppengrößen:

- 3,
- 4,
- 5,
- 6 Spielerfiguren.

Begegnungsränge:

- Novize,
- Spezialist,
- Experte,
- Meister,
- Legende.

Gegnertypen:

- Scherge,
- Standard,
- Elite,
- Boss.

Begegnungen:

- Routine,
- Standard,
- Schwer,
- Extrem.

Messgrößen:

- Kampfrunden,
- Ausfall-/Niederlagenquote,
- verbleibende Gesundheit/Ressourcen,
- Aktionsverhältnis Spieler zu Gegner,
- Fokusfeuer,
- Effekt des zweiten Boss-Initiativeslots,
- Effekt der zwei Boss-Reaktionen.

Die aktuelle Gegner- und Budgettabelle bleibt Playtestwert, bis diese Tests belastbare Ergebnisse liefern.

---

# Phase D – besondere Fähigkeiten und Metaressourcen

## D1. Kräfte, Essenzen und Ränge – #25

Für die Ränge Novize, Spezialist, Experte, Meister und Legende repräsentative Fähigkeiten testen.

Dimensionen:

- Schaden,
- Kontrolle,
- Mobilität,
- Schutz,
- Utility,
- Ziele,
- Fläche,
- Reichweite,
- Dauer,
- Aufrechterhaltung.

Alle fünf Essenzen:

- Körperlich,
- Mental,
- Spirituell,
- Gebunden,
- Technologisch.

Besonders kritisch:

- Experte bis Legende,
- mehrere Ziele + Kontrolle + lange Dauer,
- Aufrechterhaltung,
- direkte Gegenwirkung,
- sekundäre Essenz,
- Fähigkeiten aus mehreren Archetypen.

**D1-Status (2026-08-29, #25):** Umgesetzt. Deterministische Engine `scripts/validate-powers-essences-ranks.mjs` — 30 repräsentative Kräfte, alle 5 Essenzen × Ränge I–V, alle D1-Dimensionen; §12.6-Budget verhindert Schaden+Fläche+Dauer+Kontrolle gleichzeitig maximal; §12.2-Aktivierung exakt (32 Zeilen in 25–95 %); §12.4-Aufrechterhaltung und §12.5-Gegenwirkung (Gleichstand erhält bestehenden Effekt) fail-closed; §12.3-Begrenzungsmodelle ohne unbegrenzte Rückfüllung; sekundäre Essenz und Multi-Archetyp geprüft; 0 Findings. Report: `.qa/runs/validate-powers-essences-ranks-report.md`.

---

## D2. Drive und Momentum – #26

Varianten:

1. beide aktiv,
2. nur Drive,
3. nur Momentum,
4. beide deaktiviert.

Zu messen:

- Gewinn pro Szene,
- Ausgaben pro Szene,
- Cap-Häufigkeit,
- tatsächlicher Wert eines Drive-Rerolls,
- Momentum-Einfluss auf Teamaktionen,
- Fähigkeiten, die ohne Ressource keinen definierten Zustand haben.

Wichtig: Eine deaktivierte Ressource macht davon abhängige Fähigkeiten niemals stillschweigend kostenlos.

**D2-Status (2026-08-29, #26):** Umgesetzt. Deterministische Engine `scripts/validate-drive-momentum.mjs` — 60 exakte Reroll-Zeilen (1−(1−p)², Gewinn ≤ 25pp, Wahlrecht alt/neu geprüft), Drive/Momentum-Ledgers (Caps 5/3, 1-Drive-pro-Check, Verfall), alle vier §2.12-Varianten spielbar mit fail-closed Ablehnungen, §16.3-Abhängigkeiten mit Ersatzbegrenzungen. 0 Findings. Report: `.qa/runs/validate-drive-momentum-report.md`.

---

# Phase E – Nichtkampf und Bewegung außerhalb normaler Kämpfe

## E1. Nichtkampf, Recherche und soziale Konflikte – #27

Pflichtszenarien:

- essentielle Information recherchieren,
- komplexes Gemeinschaftsprojekt,
- reservierten NSC zu riskanter Hilfe bewegen,
- Gefahrenpassage,
- Kontakt einsetzen,
- Rufwirkung,
- Erkundung unter Zeitdruck.

Prüfen:

- Fail Forward,
- kein einzelner Wurf als Sackgasse,
- Projektfortschritt,
- Gruppencheck,
- soziale Haltung,
- Fortschrittsziel 3/5,
- Kontakte und Ruf ohne pauschale Boni.

**E1-Status (2026-09-06, #27):** Umgesetzt. Deterministische Engine `scripts/validate-noncombat-projects-social.mjs` — 7/7 Pflichtszenarien, Projektgrößen klein/komplex/groß, Bounds Ziel3≤7 / Ziel5≤11 Würfe, Cap 3 Checks/Intervall, Haltung als Kategorieverschiebung (keine freien Zahlenboni), Kontakt/Ruf ohne Würfelbonus, Fail-Forward ohne Sackgassen, Mechanik-Unterscheidbarkeit Einzel/Gruppe/Projekt. 0 Findings. Report: `.qa/runs/validate-noncombat-projects-social-report.md`.

---

## E2. Reisen, Verfolgungen, Fahrzeuge und Maßstab – #29

Pflichtszenarien:

- Fußverfolgung,
- Fahrzeugverfolgung,
- längere Reise mit Navigationsfehler,
- Fahrzeug gegen Fahrzeug,
- Person gegen Fahrzeug ohne Anti-Fahrzeug-Wirkung,
- definierte Schwachstelle.

Verfolgungsleiste:

```text
0 = eingeholt
2 = Standardstart
5 = entkommen
```

Prüfen:

- Dauer von Chases,
- Gleichstand,
- kritische Verschiebung,
- unterschiedliche plausible Skills,
- Maßstab,
- Struktur vs. Personenschaden,
- Übergang von Reise zu Chase zu direktem Kampf.

---

# Phase F – Universalität und Module

## F1. Weltprofile und Cross-Setting – #30

Mindestens drei vollständige Testprofile:

1. klassische Fantasy,
2. moderne/realistische Gegenwart,
3. Science-Fiction mit hoher Technologie.

Optional zusätzlich:

- Low-Magic,
- Hard-Mode,
- ungewöhnlicher Genremix.

Jedes Profil muss alle 20 Pflichtfelder des Core ausfüllen.

Zu testen:

- identische funktionale Figuren in unterschiedlichem Flavor,
- Magie- und Technologiestufen unabhängig voneinander,
- Modulprioritäten,
- aktive/deaktivierte Regeln,
- Ersatzregeln,
- kein stilles Überschreiben des Core.

---


**F1-Status (2026-08-29, #30):** Umgesetzt. Deterministische Engine `scripts/validate-world-profiles-modules.mjs` — 3 vollständige §4.7-Profile (Fantasy 4/0, Gegenwart 0/3, SciFi 1/4), §16.2-Prioritätsresolver mit 3 Konfliktfällen, §16.3-Deaktivierungen mit Ersatzregeln, 6 Cross-Setting-Abbildungen, 4 fail-closed Negativpfade. 0 Findings, Report deterministic (MD5 82f3868bcd6a75d88a122f68b466cdd2): `.qa/runs/validate-world-profiles-modules-report.md`.

# Phase G – analoger End-to-End-Playtest

## G1. Vollständige Testsitzungen – #31

Erst wenn die relevanten vorherigen Slices erledigt sind.

Mindestens drei vollständige analoge Sitzungen.

### Session A

- Character Creation,
- Exploration,
- Recherche oder soziale Szene,
- Standardkampf.

### Session B

- Reise oder Chase,
- Gemeinschaftsprojekt,
- schwerer Kampf mit Elite/Boss,
- Heilung und Ruhe.

### Session C

- anderes Weltprofil,
- mindestens Drive oder Momentum deaktiviert,
- keine digitale Unterstützung für Regelauflösung.

### Messen

- Regelpausen,
- Nachschlagehäufigkeit,
- manuelle Rechenschritte,
- ungeklärte Situationen,
- Regeln, die nur digital angenehm funktionieren,
- häufig vergessene Zustände/Ressourcen,
- tatsächliche Runden- und Szenendauer.

Der Core gilt erst dann als analog belastbar, wenn normale Gruppen diese Sitzungen ohne Rule Engine durchführen können.

---

# Empfohlene Reihenfolge

Die Validierung muss nicht jetzt beginnen. Sobald sie gestartet wird, ist diese Reihenfolge sinnvoll:

```text
#19 Kernmathematik
 ├─ #20 Charaktererschaffung/Progression
 │   └─ #21 Character-Editor-Regelabbildung
 ├─ #28 Fertigkeiten
 ├─ #32 Ausrüstung/Ressourcen
 ├─ #26 Drive/Momentum
 ├─ #27 Nichtkampf
 └─ #22 Kampf
      ├─ #23 Schaden/Heilung/Sterben
      ├─ #33 Zustände
      ├─ #29 Reisen/Chases/Fahrzeuge
      └─ #24 Gegner/Bosse

#20 + #22 + #19 -> #25 Kräfte/Essenzen
#20 + #25 + #26 -> #30 Weltprofile/Module
alle relevanten Slices -> #31 analoger End-to-End-Playtest
```

# Was jetzt als Nächstes passiert

Die Validierungsplanung ist damit geparkt und nachvollziehbar. Die aktuelle Produktarbeit kann wieder auf den Character Editor zurückgehen:

- Character Creation funktional fertigstellen,
- Zielstufe und Rang korrekt aus dem Core ableiten,
- höherstufige Charaktere mit vollständigen Entwicklungsbudgets baubar machen,
- UI/UX sauber machen,
- Tooltips auf Basis der neuen Core Rules einbauen,
- Character-Datenmodell und Save/Reload korrekt machen,
- echte Charaktere baubar machen,
- Avatar-/Look-System weiterentwickeln.

Diese Arbeit muss nicht auf mathematische Kampf- oder Gegnervalidierung warten.

Wenn der Character Editor funktional genug ist, wird #21 als gezielter Regel-/UX-Validierungsslice durchgeführt. Die tieferen mathematischen und spielmechanischen Tests bleiben in den übrigen Issues erhalten und können später systematisch abgearbeitet werden.

---

## Abschlussbedingung

Das Epic #18 kann geschlossen werden, wenn:

- alle relevanten Validierungs-Issues abgeschlossen sind,
- gefundene Regeländerungen erneut regressionsgetestet wurden,
- mehrere vollständige analoge Playtests dokumentiert sind,
- die Core Rules keine bekannten Widersprüche oder unvalidierten kritischen Zahlenbereiche mehr enthalten,
- Character Creation einschließlich direkt höherstufiger Figuren, Kampf, Nichtkampf, Kräfte, Gegner und Module in mindestens mehreren repräsentativen Weltprofilen funktionieren.