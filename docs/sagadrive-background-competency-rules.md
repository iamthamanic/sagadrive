# SagaDrive Core Rules – Hintergrund-Templates und Kompetenzfluss

> **Status:** Verbindliche Core-Ergänzung für den Branch `feat/background-competency-system`  
> **Datum:** 29. August 2026  
> **Bezug:** `docs/sagadrive core rules.md`, insbesondere Abschnitte 3, 4.4, 5.8, 13 und 16  
> **Ziel:** Hintergründe für Einsteiger als geführte Templates nutzbar machen, ohne die freie Charaktererschaffung oder die bestehende Attribut-/Fertigkeitslogik zu verändern.

## 1. Grundsatz

Attribute, Fertigkeiten und Hintergrund bilden gemeinsam das **Kompetenzsystem** einer Figur, bleiben regeltechnisch aber unterschiedliche Ebenen.

- **Attribute** beschreiben grundlegende Leistungsfähigkeit.
- **Fertigkeiten** beschreiben konkrete erlernte Kompetenz.
- **Hintergrund** beschreibt, welche Kompetenzen die Figur vor Beginn ihrer Geschichte erworben hat und in welchen sozialen Kontext sie eingebunden ist.

Ein Hintergrund erhöht **keine Attribute**. Die visuelle oder digitale Zuordnung eines Hintergrunds zu Fertigkeiten oder deren Standardattributen ist eine Erklärung der Beziehung und kein zusätzlicher Regelbonus.

## 2. Hintergrund-Template

Ein reguläres Hintergrund-Template enthält verbindlich:

1. **Name und Kurzbeschreibung** des Hintergrunds.
2. **Vier passende Core-Fertigkeiten** als fester Fertigkeitspool.
3. **Zwei empfohlene Trainings** innerhalb dieses Viererpools.
4. **Empfohlene Spezialisierungen** für mindestens zwei der vier Fertigkeiten.
5. **Milieu-Vorschläge**.
6. **Kontakt-/Verbindungs-Vorschläge**.
7. **Komplikations-Vorschläge**.
8. Optional settingabhängige **Kommunikationsformen** oder vergleichbare Flavor-Vorschläge, sofern das Weltprofil diese verwendet.

Die Empfehlungen sind Hilfen und keine zusätzlichen mechanischen Vorteile.

## 3. Wahl innerhalb eines Templates

Nach Wahl eines Hintergrund-Templates gilt:

- Die vier Fertigkeiten des Templates bilden den festen Hintergrund-Pool.
- Die spielende Person wählt **zwei unterschiedliche Fertigkeiten aus diesem Pool** und erhält in jeder davon **+1 Fertigkeitspunkt**.
- Die spielende Person wählt **eine Spezialisierung**, die zu mindestens einer der beiden trainierten Fertigkeiten gehört und deren normale Voraussetzungen erfüllt.
- Milieu, Kontakt/Verbindung und Komplikation können aus den Vorschlägen übernommen oder frei passend formuliert werden.
- Empfohlene Trainings werden im digitalen Editor hervorgehoben, sind aber **nicht verpflichtend**.

Damit bleibt jeder Hintergrund individualisierbar, ohne dass Einsteiger den vollständigen Fertigkeitskatalog selbst analysieren müssen.

## 4. Freier Hintergrund

Neben Templates bleibt ein vollständig freier Hintergrund immer zulässig.

Ein freier Hintergrund verwendet dieselben mechanischen Grenzen wie ein Template:

- genau vier unterschiedliche passende Core-Fertigkeiten,
- Training in genau zwei unterschiedlichen Fertigkeiten dieses Pools,
- genau eine zulässige Spezialisierung,
- Milieuzugang,
- Kontakt oder Verbindung,
- charakterbezogene Komplikation.

Der freie Hintergrund darf keine Attributsboni, zusätzlichen Fertigkeitspunkte, zusätzlichen Kräfte oder andere Vorteile gegenüber Templates erzeugen.

## 5. Weltprofile und Verfügbarkeit

Weltprofile definieren, welche Hintergrund-Templates standardmäßig verfügbar sind.

- Ein Weltprofil darf Core-Templates umbenennen, neu beschreiben oder durch settingeigene Templates ergänzen.
- Settingeigene Templates müssen dieselbe mechanische Struktur einhalten, sofern das Weltprofil keine ausdrückliche Abweichung deklariert.
- Ein Template kann in mehreren Weltprofilen mechanisch ähnlich sein, aber andere Namen, Milieus, Kontakte und Flavor-Texte besitzen.
- Der freie Hintergrund bleibt standardmäßig verfügbar, sofern ein Weltprofil ihn nicht ausdrücklich aus einem begründeten Szenario heraus einschränkt.

## 6. Start-Fertigkeitspunkte

Die Verteilung der zehn Start-Fertigkeitspunkte bleibt unverändert:

| Quelle | Punkte |
|---|---:|
| Hintergrund | 2 Punkte in zwei unterschiedlichen Fertigkeiten des gewählten Viererpools |
| Primärarchetyp | 1 Punkt in einer typischen Fertigkeit des Primärarchetyps |
| Frei | 7 Punkte |
| **Gesamt** | **10 Punkte** |

Ein Hintergrund-Template verändert diese Summe nicht. Es führt nur die Auswahl der zwei Hintergrundpunkte.

## 7. Digitale Charaktererschaffung – verbindliche Semantik

Die digitale Oberfläche darf Attribute, Hintergrund und Fertigkeiten in einer gemeinsamen Ansicht **Kompetenzen** darstellen, wenn die regeltechnischen Quellen klar getrennt bleiben.

Die Oberfläche muss für jeden Fertigkeitswert nachvollziehbar machen, aus welchen Quellen er besteht, zum Beispiel:

```text
Medizin 2
- Hintergrund +1
- Frei +1
Standardattribut: Verstand
Spezialisierung: Erste Hilfe
```

Dabei gelten folgende Darstellungsregeln:

- Eine Verbindung **Attribut → Fertigkeit** kennzeichnet das Standardattribut und **keine Freischaltvoraussetzung**.
- Eine Verbindung **Hintergrund → Fertigkeit** kennzeichnet Zugehörigkeit zum Viererpool bzw. einen vergebenen Hintergrundpunkt.
- Eine Verbindung **Archetyp → Fertigkeit** kennzeichnet eine typische Fertigkeit bzw. den vergebenen Primärarchetyp-Punkt.
- Nur echte Freischalt- oder Voraussetzungsketten dürfen visuell als harte Progression dargestellt werden.
- Beziehungen ohne Voraussetzung müssen im UI als solche erkennbar sein und dürfen nicht den Eindruck eines verpflichtenden Skill-Tree-Pfads erzeugen.

## 8. Empfohlener Charaktererschaffungsfluss

Für SagaDrive Core gilt digital folgende empfohlene Reihenfolge innerhalb des Kompetenzsystems:

1. Attribute festlegen.
2. Hintergrund-Template auswählen oder freien Hintergrund erstellen.
3. Die vier Hintergrund-Fertigkeiten sehen und zwei Trainings wählen.
4. Eine passende Spezialisierung festlegen.
5. Den Primärarchetyp-Punkt vergeben.
6. Die sieben freien Fertigkeitspunkte verteilen.
7. Gesamtverteilung und Quellen prüfen.

Die Schritte sind eine UX-Führung und keine Regel, die spätere Korrekturen verhindert. Vor Abschluss der Charaktererschaffung dürfen Entscheidungen innerhalb der normalen Regeln geändert werden.

## 9. Einsteigerfreundlichkeit und Freiheit

SagaDrive verwendet für Hintergründe das Prinzip **Template zuerst, freie Erstellung weiterhin möglich**.

Ein Template soll einem neuen Spieler die Frage beantworten:

> „Was hat mein Charakter vor Beginn seiner Geschichte gemacht, und welche Kompetenzen passen typischerweise dazu?“

Es soll nicht die Frage vollständig beantworten:

> „Welche exakte Person muss mein Charakter sein?“

Darum sind Fertigkeitspool und mechanische Grenzen strukturiert, während Training innerhalb des Pools, Spezialisierung, Kontakt, Milieu und Komplikation ausreichend individuelle Entscheidungen erlauben.

## 10. Core-Beispieltemplate: Straßenarzt

**Straßenarzt** ist ein Core-Beispiel für die Template-Struktur, kein settingübergreifend verpflichtender Hintergrund.

- Fertigkeitspool: **Medizin, Menschenkenntnis, Überleben, Aufmerksamkeit**
- Empfohlene Trainings: **Medizin, Menschenkenntnis**
- Beispiel-Spezialisierungen: Medizin – **Erste Hilfe**; Menschenkenntnis – **Krisengespräche**
- Beispiel-Milieus: Notaufnahmen, informelle Kliniken, Rettungsdienste
- Beispiel-Kontakte: Ärztin, Sanitäter, Klinikpersonal, lokaler Versorger
- Beispiel-Komplikationen: alte Schulden, frühere Fehlentscheidung, Verpflichtung gegenüber einem Milieu

Das Template verleiht keine zusätzlichen Boni über die normalen Hintergrundregeln hinaus.

## 11. Abgrenzung zu Archetypen

Hintergründe und Archetypen erfüllen unterschiedliche Funktionen:

- Der **Hintergrund** erklärt erworbene Startkompetenz und soziale Verankerung vor Beginn der Geschichte.
- Der **Archetyp** beschreibt die primäre spielerische Rolle und langfristige Fähigkeitsentwicklung.

Ein Hintergrund ist keine Klasse und kein Archetyp. Ein Hintergrund-Template darf deshalb keine Archetyp-Fähigkeit ersetzen, keine Archetyp-Freischaltung vorwegnehmen und keine eigene Progressionsleiste besitzen.

## 12. Abgrenzung zu Attributen

Hintergründe dürfen Attribute im digitalen Editor **hervorheben**, wenn die ausgewählten Fertigkeiten diese als Standardattribute verwenden. Daraus entsteht kein mechanischer Bonus.

Beispiel:

```text
Straßenarzt
  ↓ Pool
Medizin
  ↑ Standardattribut
Verstand
```

Diese Darstellung erklärt den Basischeck. Sie bedeutet ausdrücklich nicht `Straßenarzt → Verstand +1`.
