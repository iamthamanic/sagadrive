# SagaDrive Core Rules

> **Dokumentstatus:** Lebender Regeldesign-Entwurf  
> **Stand:** 26. August 2026  
> **Zuletzt abgeschlossener Entscheidungsblock:** 5.7 – Sprachen, Werkzeuge und Berechtigungen  
> **Nächster Arbeitsblock:** 5.8 – Vollständige Fertigkeitsbeschreibungen  
> **Ziel:** Universelles, analog vollständig spielbares Kernregelsystem mit optionalen digitalen Erweiterungen

## Verwendung dieses Dokuments

Dieses Dokument ist die zentrale Arbeitsgrundlage für die SagaDrive Core Rules. Es trennt verbindlich beschlossene Regeln von noch offenen Designentscheidungen.

- **Verbindlich** bezeichnet gemeinsam festgelegte Kernregeln.
- **Teilweise festgelegt** bezeichnet ein beschlossenes Grundmodell, dessen konkrete Werte oder Detailregeln noch fehlen.
- **Offen** bezeichnet einen noch zu bearbeitenden Regelblock.
- Ein abgeschlossener offener Punkt wird durch die ausgearbeitete Regel ersetzt.
- Der Dokumentkopf wird nach jedem abgeschlossenen Block aktualisiert.
- Regeln aus Weltprofilen oder Abenteuermodulen dürfen den Kern erweitern oder ausdrücklich deaktivieren, aber nicht stillschweigend verändern.

---

## 1. Grundausrichtung

### 1.1 Regelkomplexität

SagaDrive verwendet eine mittlere Regelkomplexität. Die Regeln sollen taktisch belastbar sein, ohne für gewöhnliche Handlungen unnötige Untermechaniken einzuführen.

### 1.2 Spielstil

SagaDrive verbindet erzählerisches Spiel mit taktischen Entscheidungen.

- Außerhalb direkter Konflikte fördern die Regeln Konsequenzen, Fortschritt und Fail Forward.
- Im direkten Kampf gelten präzise, vorhersehbare Regeln.
- Figuren beginnen kompetent, bleiben aber verwundbar.
- Entscheidungen sollen wichtiger sein als das Sammeln kleiner situativer Zahlenboni.

### 1.3 Universeller Kern

Das Kernsystem ist nicht an Fantasy, Gegenwart, Science-Fiction oder ein bestimmtes Machtmodell gebunden.

Die Regeln bestehen aus:

1. dem stabilen SagaDrive-Kern,
2. Weltprofilen für Genre und Setting,
3. optionalen Abenteuermodulen,
4. optionalen digitalen Erweiterungen.

Der Kern muss vollständig mit Würfeln, Papier und Charakterbogen spielbar bleiben. Digitale Werkzeuge dürfen komplexere Module erleichtern, aber keine Voraussetzung für die Grundregeln sein.

---

## 2. Proben und Auflösung

### 2.1 Basisprobe

Wenn der Ausgang einer Handlung unsicher ist und sowohl Erfolg als auch Fehlschlag relevante Folgen besitzen, wird eine Probe verlangt.

```text
d20 + Attribut + Fertigkeit + Erfahrungsbonus + Spezialisierung + ausdrückliche Modifikatoren
```

Dabei gelten nur die Bestandteile, die auf die konkrete Probe anwendbar sind.

- Der Erfahrungsbonus gilt nur bei trainierten Fertigkeiten.
- Der Spezialisierungsbonus gilt nur, wenn die Spezialisierung eindeutig anwendbar ist.
- Numerische Modifikatoren existieren nur, wenn eine Fähigkeit, Ausrüstung, Bedingung oder Regel sie ausdrücklich vergibt.
- Der Gesamtwert wird mit einer Schwierigkeit oder einem Widerstand verglichen.

### 2.2 Erfolgsgrade und natürliche Würfe

| Ergebnis | Bedingung |
|---|---|
| Kritischer Erfolg | Gesamtergebnis mindestens 10 über dem Zielwert |
| Erfolg | Gesamtergebnis erreicht oder übertrifft den Zielwert |
| Fehlschlag | Gesamtergebnis liegt unter dem Zielwert |
| Kritischer Fehlschlag | Gesamtergebnis liegt mindestens 10 unter dem Zielwert |

Eine natürliche 20 verbessert den erreichten Erfolgsgrad um eine Stufe. Eine natürliche 1 verschlechtert ihn um eine Stufe. Ein Ergebnis kann nicht über einen kritischen Erfolg hinaus verbessert oder unter einen kritischen Fehlschlag verschlechtert werden.

### 2.3 Fehlschlag und Erfolg gegen Preis

Ein Fehlschlag lässt die Situation niemals unverändert.

Der GM kann statt eines vollständigen Fehlschlags einen Erfolg gegen einen klar benannten Preis anbieten. Die spielende Person entscheidet, ob sie diesen Preis akzeptiert.

Im direkten Kampf ist Erfolg gegen Preis nur bei ausdrücklich dafür vorgesehenen Fähigkeiten erlaubt.

Damit bleiben Recherche, Erkundung, soziale Szenen und andere handlungsrelevante Proben vor Sackgassen geschützt, ohne die Präzision des Kampfsystems aufzulösen.

### 2.4 Sicheres Arbeiten

Eine trainierte Figur kann unter kontrollierten Bedingungen sorgfältig arbeiten und statt eines d20-Wurfs einen Sicherheitswert verwenden.

```text
Sicherheitswert = 10 + alle auf die Probe anwendbaren Werte und Boni
```

Sicheres Arbeiten benötigt zusätzliche Zeit oder einen anderen vor der Probe festgelegten Aufwand. Es ist im direkten Kampf oder unter unmittelbarer Bedrohung nicht möglich, sofern keine Fähigkeit ausdrücklich etwas anderes erlaubt.

### 2.5 Vorteil und Nachteil

```text
Vorteil: Würfle 2d20 und verwende den höheren d20.
Nachteil: Würfle 2d20 und verwende den niedrigeren d20.
```

Jede eigenständige Vorteilsquelle hebt genau eine Nachteilsquelle auf und umgekehrt. Nach der Aufhebung aller Gegenquellen gilt entweder Vorteil, Nachteil oder ein normaler Wurf. Mehrere verbleibende Quellen erhöhen die Anzahl der Würfel nicht weiter.

Numerische Boni und Abzüge existieren nur, wenn eine ausdrücklich definierte Fähigkeit, Ausrüstung, Bedingung oder Regel sie vergibt. Der GM ersetzt gewöhnliche situative Bewertungen nicht spontan durch zusätzliche Zahlenwerte.

Dieselbe benannte Quelle kann denselben Wurf nicht mehrfach verändern.

### 2.6 Widerstände und vergleichende Proben

Bei einer gerichteten Handlung gegen ein Ziel wird grundsätzlich gegen einen statischen Widerstand gewürfelt.

```text
Widerstand = 10 + passendes Attribut + passende Fertigkeit
             + Erfahrungsbonus bei Training
             + anwendbare Spezialisierung
             + ausdrückliche Modifikatoren
```

Nur wenn beide Seiten gleichzeitig und aktiv dasselbe Ergebnis anstreben, wird eine vergleichende Probe verwendet. Dabei werden zuerst die Erfolgsgrade und danach die Gesamtergebnisse verglichen.

**Teilweise festgelegt:** Die Behandlung eines vollständigen Gleichstands wird zusammen mit den Konfliktregeln verbindlich definiert.

### 2.7 Schwierigkeiten

SagaDrive verwendet ein hybrides Schwierigkeitsmodell.

- Aufgaben besitzen feste, aus der Spielwelt abgeleitete Schwierigkeiten.
- Schwierigkeiten werden nicht automatisch an Stufe oder Stärke der handelnden Figuren angepasst.
- Stufenabhängige Richtwerte dienen dem Entwurf von Abenteuern und Herausforderungen.
- Ein Hindernis bleibt innerhalb der Spielwelt gleich schwierig, unabhängig davon, welche Figur es versucht.
- Höherstufige Inhalte dürfen schwierigere Hindernisse enthalten, ohne bereits bestehende Hindernisse nachträglich hochzuskalieren.

**Teilweise festgelegt:** Die endgültige numerische Tabelle von trivialen bis übermenschlichen Schwierigkeiten und die Richtwerte nach Stufenbereich müssen noch verbindlich eingetragen werden.

### 2.8 Zusammenarbeit

SagaDrive unterscheidet drei Kooperationsformen nach Art der Aufgabe.

#### Unterstützte Einzelprobe

Kann eine Person das Ziel stellvertretend für alle erreichen, wird eine unterstützte Einzelprobe verwendet.

#### Gruppenprobe

Muss jedes Gruppenmitglied das Hindernis selbst bewältigen, wird eine Gruppenprobe verwendet.

#### Gemeinschaftsprojekt

Benötigt das Ziel mehrere Arbeitsschritte oder längere Zeit, wird ein Gemeinschaftsprojekt verwendet.

**Teilweise festgelegt:** Voraussetzungen und mechanischer Umfang von Unterstützung, die genaue Auswertung von Gruppenproben sowie Fortschritts- und Rückschrittswerte für Gemeinschaftsprojekte werden im entsprechenden Regelblock ergänzt.

### 2.9 Verdeckte Informationen

Proben werden grundsätzlich offen von den spielenden Personen ausgeführt. Der GM darf eine Probe verdeckt ausführen, wenn bereits die Kenntnis des Würfelergebnisses verborgene Informationen offenlegen würde.

Verdeckte Proben verändern weder die Berechnung noch die Erfolgsgrade. Der GM verändert ein verdecktes Ergebnis nicht nachträglich.

### 2.10 Drive

Drive ist eine persönliche Ressource mit einem normalen Startwert von 3 und einem Maximum von 5.

Drive kann für folgende Zwecke ausgegeben werden:

- Wiederholung eines eigenen Wurfs,
- Einführung eines plausiblen charakterbezogenen Details,
- Aktivierung einer ausdrücklich markierten Drive-Fähigkeit.

Drive wird durch das freiwillige Akzeptieren einer klar benannten, charakterbezogenen Komplikation zurückgewonnen.

Drive kann Konsequenzen nicht allgemein nachträglich negieren.

### 2.11 Momentum

Momentum ist eine gemeinsame, vergängliche Gruppenressource mit einem Startwert von 0 und einem Maximum von 3. Am Ende jeder Szene verfällt 1 ungenutztes Momentum.

Momentum entsteht durch:

- kritische Zusammenarbeit,
- gemeinsame Zielerreichung,
- ausdrücklich definierte Teamfähigkeiten.

Momentum kann für folgende Zwecke ausgegeben werden:

- Koordination,
- passende Nebeneffekte erfolgreicher Teamhandlungen,
- ausdrücklich definierte Teammanöver.

Momentum ersetzt weder persönlichen Drive noch individuelle Ressourcen.

### 2.12 Optionale Ressourcen

Drive und Momentum sind im Standardspiel aktiv. Ein Abenteuer kann beide Systeme unabhängig voneinander deaktivieren.

Andere Regeln dürfen ihre Verfügbarkeit nicht voraussetzen, sofern sie nicht ausdrücklich als Drive- oder Momentum-Regel gekennzeichnet sind. Bei deaktivierter Ressource müssen Abenteuer und Weltprofil festlegen, wie zwingend davon abhängige Fähigkeiten behandelt oder ersetzt werden.

---

## 3. Attribute

### 3.1 Attributsliste

SagaDrive verwendet sechs universelle Attribute.

| Attribut | Grundbedeutung |
|---|---|
| Stärke | Körperkraft, unmittelbare physische Leistung und Kraftübertragung |
| Geschicklichkeit | Koordination, Präzision, Beweglichkeit und Reaktionskontrolle |
| Ausdauer | körperliche Widerstandsfähigkeit, Belastbarkeit und Durchhaltevermögen |
| Verstand | Analyse, Wissen, Planung und technische oder methodische Problemlösung |
| Wahrnehmung | Aufmerksamkeit, Intuition, Orientierung und Erkennen relevanter Details |
| Charisma | Präsenz, Ausdruck, Einfluss und soziale Durchsetzung |

Die Begriffe werden im Regeltext ausgeschrieben. Ein späteres Glossar enthält Entsprechungen für Personen, die aus D&D, DSA, Pathfinder, Savage Worlds oder anderen Systemen wechseln.

### 3.2 Wertebereich

Attribute werden direkt verwendet. Es gibt keine aus Attributswerten abgeleiteten separaten Modifikatoren.

| Wert | Einordnung |
|---:|---|
| 0 | Nur durch ausdrücklich vorgesehene Merkmale, Zustände oder Kreaturenregeln |
| 1–4 | Regulärer Bereich bei der Charaktererschaffung |
| 5 | Menschlicher Spitzenwert; regulär erst durch Entwicklung oder besondere Herkunft |
| 6+ | Übermenschlich und nur durch ausdrücklich vorgesehene Regeln |

### 3.3 Startattribute

Bei der Charaktererschaffung verteilt eine Figur standardmäßig diese Werte frei auf ihre sechs Attribute:

```text
4, 3, 3, 2, 2, 1
```

Alternativ können zehn Attributspunkte verwendet werden.

| Attributswert | Kosten |
|---:|---:|
| 1 | 0 |
| 2 | 1 |
| 3 | 2 |
| 4 | 4 |

Kein reguläres Startattribut darf unter 1 oder über 4 liegen. Nicht ausgegebene Attributspunkte verfallen und können nicht für Fertigkeiten, Ausrüstung oder andere Charakterwerte verwendet werden.

Die digitale Charaktererschaffung zeigt zuerst die Standardreihe. Der Punktekauf erscheint als erweiterte, mathematisch gleichwertige Verteilungsoption.

### 3.4 Quellen von Attributswerten

Archetypen, Hintergründe, Wesenarten und Essenzen vergeben bei der regulären Charaktererschaffung keine allgemeinen Attributsboni. Dadurch bleibt die freie Figurenkonzeption erhalten und es entstehen keine mechanisch erzwungenen Kombinationen.

Ausdrücklich definierte besondere Merkmale oder spätere Entwicklungen können Attribute verändern, dürfen die festgelegten Grenzen aber nicht stillschweigend umgehen.

### 3.5 Attribute und Fertigkeiten

Jede Fertigkeit besitzt ein Standardattribut.

Außerhalb des direkten Kampfes kann ein anderes Attribut verwendet werden, wenn die beschriebene Vorgehensweise tatsächlich eine andere Art der Handlung darstellt. Das alternative Attribut muss vor der Probe feststehen.

Im direkten Kampf gilt das für die Handlung definierte Attribut. Ein anderes Attribut darf nur durch eine ausdrücklich vorgesehene Fähigkeit, Ausrüstung oder Regel verwendet werden.

### 3.6 Reine Attributsproben

Existiert für eine Handlung keine relevante Fertigkeit, wird eine reine Attributsprobe verwendet.

```text
d20 + Attribut + ausdrückliche Modifikatoren
```

Eine Fertigkeit mit Wert 0 gilt dagegen als untrainiert und wird weiterhin als Fertigkeitsprobe behandelt. Der Sicherheitswert steht bei reinen Attributsproben nicht zur Verfügung.

### 3.7 Attributsentwicklung

Attribute werden selten und zu hohen Entwicklungskosten gesteigert. Eine Stufe erhöht nicht automatisch alle Attribute oder sonstigen Charakterwerte.

- Reguläres Maximum: 5
- Werte ab 6: nur über ausdrücklich übermenschliche Regeln
- Exakte Steigerungsstufen und Kosten: noch offen

---

## 4. Charakterstruktur

### 4.1 Stufen

SagaDrive verwendet 20 Charakterstufen. Eine Stufe gibt den allgemeinen Erfahrungsrahmen einer Figur an.

Ein Stufenaufstieg erhöht nicht automatisch sämtliche Werte. Stattdessen vergibt die jeweilige Stufe bestimmte Entwicklungsmöglichkeiten wie Fertigkeitssteigerungen, Spezialisierungen, Fähigkeiten oder seltene Attributssteigerungen.

### 4.2 Archetypen

SagaDrive verwendet geführte offene Archetypen.

- Jede Figur beginnt mit einem Primärarchetyp.
- Der Primärarchetyp gewährt den prägenden Kernzugang.
- Ein Sekundärarchetyp kann später durch gezielte Investition erschlossen werden.
- Archetypen besitzen keine getrennten Klassenstufen.
- Ein weiterer Archetyp verlangt vorher eine relevante Investition in bereits gewählte Archetypen.
- Die genaue Zugriffsschwelle wird in der vollständigen Entwicklungsregel festgelegt.

Archetypen sollen in jeder Welt funktionieren. Ihre Fähigkeiten beschreiben deshalb zuerst ihre regeltechnische Funktion. Das Weltprofil bestimmt anschließend, wie diese Funktion innerhalb des Settings erscheint.

### 4.3 Kombinationen

SagaDrive verwendet gemeinsame Archetyp- und Essenzfähigkeiten sowie 25 geführte Kombinationsprofile. Die Kombinationen sind Orientierungshilfen und keine 25 voneinander getrennten Regelsysteme.

### 4.4 Hintergrund

Der Hintergrund beschreibt erlernte Kompetenzen, soziale Einbindung und prägende Erfahrungen. Ein Hintergrund enthält:

- eine Liste aus vier passenden Fertigkeiten,
- Training in zwei unterschiedlichen Fertigkeiten dieser Liste,
- eine Spezialisierung,
- einen Milieuzugang,
- eine Verbindung oder Kontaktperson,
- eine charakterbezogene Komplikation.

Hintergründe vergeben keine Attributsboni und keine allgemeinen Kräfte. Startausrüstung wird im Ausrüstungsblock geregelt.

### 4.5 Wesenart

Die Wesenart beschreibt körperliche oder strukturelle Eigenschaften einer Figur und ist von Kultur und Hintergrund getrennt.

- Eine reguläre Wesenart verwendet ein kontrolliertes Merkmalsbudget von 3 Punkten.
- Wesenarten vergeben keine allgemeinen Attributs- oder Fertigkeitsboni.
- Wesenarten vergeben keine kulturellen Sprachen.
- Wesenartmerkmale gewähren keine zusätzlichen vollständigen Aktionen.
- Nachteile erzeugen keine zusätzlichen freien Merkmalspunkte.
- Hybride Wesenarten verwenden dasselbe kontrollierte Gesamtbudget.

Konkrete Merkmalskosten und der Merkmalskatalog sind noch offen.

### 4.6 Essenzen

Eine Essenz beschreibt das Wirkprinzip besonderer Fähigkeiten. Sie ist weder Beruf noch Attribut noch automatisch eine bestimmte Energiequelle.

SagaDrive verwendet fünf universelle Essenzen:

| Essenz | Abstraktes Wirkprinzip |
|---|---|
| Körperlich | Wirkung durch Körper, Biologie, Training oder körperliche Veränderung |
| Mental | Wirkung durch Geist, Fokus, Wahrnehmung oder mentale Projektion |
| Spirituell | Wirkung durch Seele, Glauben, Geister oder metaphysische Verbindung |
| Gebunden | Wirkung durch Bindung an Wesen, Artefakte, Pakte, Begleiter oder externe Quellen |
| Technologisch | Wirkung durch Geräte, Systeme, Konstruktionen oder technische Veränderung |

Jede Figur besitzt eine primäre Essenz. Eine sekundäre Essenz kann durch spätere Entwicklung erschlossen werden.

Das Weltprofil definiert für jede verfügbare Essenz:

- mögliche Manifestationen,
- settingbezogene Bezeichnungen,
- erlaubte Kraftquellen,
- relevante Wirkungskennzeichnungen,
- Grenzen und Gegenmaßnahmen.

Ein Arzt kann beispielsweise körperlich, mental oder technologisch ausgerichtet sein. Die Essenz beschreibt, wie besondere Wirkung erzeugt wird, nicht welchen Beruf die Figur ausübt.

Essenzen vergeben keine automatischen Attributs- oder Fertigkeitsboni.

### 4.7 Weltprofile

Ein Weltprofil verbindet den universellen Kern mit einem konkreten Setting. Es legt mindestens fest:

- verfügbare Wesenarten,
- Hintergründe und Milieus,
- Erscheinungsformen der Archetypen,
- Manifestationen der Essenzen,
- Magie- und Technologierahmen,
- Sprachen und Kommunikationsformen,
- verfügbare Ausrüstung,
- aktivierte optionale Module.

Die vollständige Vorlage für Weltprofile ist noch offen.

---

## 5. Fertigkeiten und Spezialisierungen

### 5.1 Universelle Fertigkeitsliste

SagaDrive verwendet 18 universelle Fertigkeiten.

| Nr. | Fertigkeit | Standardattribut |
|---:|---|---|
| 1 | Athletik | Stärke |
| 2 | Akrobatik | Geschicklichkeit |
| 3 | Fingerfertigkeit | Geschicklichkeit |
| 4 | Heimlichkeit | Geschicklichkeit |
| 5 | Nahkampf | Stärke |
| 6 | Fernkampf | Geschicklichkeit |
| 7 | Aufmerksamkeit | Wahrnehmung |
| 8 | Menschenkenntnis | Wahrnehmung |
| 9 | Überleben | Wahrnehmung |
| 10 | Ermitteln | Verstand |
| 11 | Wissen | Verstand |
| 12 | Technik | Verstand |
| 13 | Medizin | Verstand |
| 14 | Steuern | Geschicklichkeit |
| 15 | Überzeugen | Charisma |
| 16 | Täuschen | Charisma |
| 17 | Einschüchtern | Charisma |
| 18 | Auftreten | Charisma |

Es gibt keine zusätzliche Fertigkeit Belastbarkeit. Reine körperliche Widerstandsaufgaben verwenden Ausdauer oder, wenn tatsächliche sportliche Technik entscheidend ist, Athletik mit einem passenden Attribut.

### 5.2 Spezialisierungen

Eine Spezialisierung bezeichnet einen engen, eindeutig benannten Anwendungsbereich einer trainierten Fertigkeit.

```text
Anwendbare Spezialisierung: +2 auf die Probe
```

- Eine Probe erhält höchstens einen Spezialisierungsbonus.
- Eine Spezialisierung verändert weder das Standardattribut noch den Fertigkeitswert.
- Eine Fachhandlung kann eine passende Spezialisierung voraussetzen.
- Fachhandlungen müssen vor der Probe ausdrücklich als solche gekennzeichnet sein.
- Der GM erklärt eine gewöhnliche Handlung nicht erst nach dem Wurf zur Fachhandlung.

Die Anzahl der Spezialisierungen innerhalb derselben Fertigkeit ist begrenzt:

| Spezialisierung innerhalb der Fertigkeit | Voraussetzung |
|---:|---:|
| Erste | Fertigkeitswert 1 |
| Zweite | Fertigkeitswert 3 |
| Dritte | Fertigkeitswert 5 |

Eine Fertigkeit kann höchstens drei Spezialisierungen besitzen.

### 5.3 Fertigkeitswerte und Erfahrungsbonus

| Wert | Kompetenzstufe |
|---:|---|
| 0 | Untrainiert |
| 1 | Trainiert |
| 2 | Geübt |
| 3 | Fachkundig |
| 4 | Meisterlich |
| 5 | Weltklasse |

Eine Fertigkeit mit Wert 0 kann für gewöhnliche untrainierte Handlungen eingesetzt werden, erhält aber keinen Erfahrungsbonus.

Der Erfahrungsbonus bildet den allgemeinen Kompetenzzuwachs durch Charakterstufen ab. Er gilt nur bei einer trainierten Fertigkeit mit Wert 1 oder höher.

| Stufe | Erfahrungsbonus |
|---:|---:|
| 1–4 | +1 |
| 5–8 | +2 |
| 9–12 | +3 |
| 13–16 | +4 |
| 17–20 | +5 |

| Charakterstufe | Maximaler Fertigkeitswert |
|---:|---:|
| 1–4 | 3 |
| 5–12 | 4 |
| 13–20 | 5 |

Kein regulärer Startwert darf über 3 liegen.

### 5.4 Fertigkeiten bei der Charaktererschaffung

Eine Startfigur erhält insgesamt 10 Fertigkeitspunkte.

Als empfohlene Standardverteilung gilt:

```text
3, 2, 2, 1, 1, 1
```

Alternativ können die 10 Punkte frei und linear verteilt werden. Dabei gelten folgende Grenzen:

- maximaler Startwert 3,
- mindestens sechs Fertigkeiten mit Wert 1 oder höher,
- nicht ausgegebene Punkte verfallen.

Die Herkunft der Punkte ist:

| Quelle | Fertigkeitspunkte |
|---|---:|
| Hintergrund | 2 Punkte in zwei unterschiedlichen Fertigkeiten aus seiner Viererliste |
| Primärarchetyp | 1 Punkt aus seiner Fertigkeitsliste; darf sich mit dem Hintergrund überschneiden |
| Freie Verteilung | 7 Punkte |
| Gesamt | 10 Punkte |

Wesenart und Essenz vergeben keine Fertigkeitspunkte.

### 5.5 Fertigkeitsentwicklung

Eine Figur erhält auf folgenden Stufen jeweils eine Fertigkeitsentwicklung:

```text
3, 5, 7, 9, 11, 13, 15, 17, 19
```

Mit einer Fertigkeitsentwicklung kann eine der folgenden Möglichkeiten gewählt werden:

- eine Fertigkeit um 1 erhöhen,
- eine neue Fertigkeit von 0 auf 1 steigern,
- eine neue Spezialisierung erwerben.

Dabei gelten immer die Fertigkeitsgrenzen der aktuellen Charakterstufe. Nicht verwendete Fertigkeitsentwicklungen dürfen zurückgestellt werden.

### 5.6 Handlungskategorien und passive Werte

| Kategorie | Regel |
|---|---|
| Automatische Handlung | Keine Probe erforderlich |
| Gewöhnliche Handlung | Darf mit Fertigkeitswert 0 versucht werden |
| Trainierte Handlung | Benötigt Fertigkeitswert 1 oder höher |
| Fachhandlung | Benötigt Training und eine passende Spezialisierung |

Eine Handlung wird nur gewürfelt, wenn ihr Ausgang unsicher ist und beide möglichen Ausgänge relevante Konsequenzen besitzen.

Trainierte Handlungen und Fachhandlungen müssen in der Fertigkeitsbeschreibung, einer Weltregel, einem Abenteuer oder einer Fähigkeit ausdrücklich markiert sein. Die Einstufung wird vor dem Wurf bekannt gegeben.

SagaDrive verwendet keine allgemeine Liste passiver Fertigkeitswerte.

Wenn eine Figur aktiv gegen die unbemerkte Aufmerksamkeit eines Ziels handelt, wird dessen statischer Aufmerksamkeitswiderstand verwendet:

```text
10 + Wahrnehmung + Aufmerksamkeit
   + Erfahrungsbonus bei trainierter Aufmerksamkeit
   + anwendbare Spezialisierung
   + ausdrückliche Modifikatoren
```

Andere statische Widerstände folgen der allgemeinen Widerstandsformel aus Abschnitt 2.6.

### 5.7 Sprachen, Werkzeuge und Berechtigungen

#### Sprachen und Kommunikationsformen

Sprachen sind keine Fertigkeiten und besitzen keine eigenen Stufen.

Das Weltprofil bestimmt die gemeinsame Standardsprache oder eine vergleichbare allgemeine Kommunikationsform. Jede Figur beherrscht diese automatisch, sofern das Abenteuer nichts anderes festlegt.

Zusätzlich wählt jede Figur normalerweise eine weitere zum Hintergrund passende Kommunikationsform. Dazu können Sprachen, Dialekte, Gebärdensprachen oder settingbezogene Verständigungssysteme gehören. Das Weltprofil kann diese Anzahl verändern oder Sprachbarrieren vollständig deaktivieren.

Wer eine Kommunikationsform beherrscht, kann sie im gewöhnlichen Umfang ohne Probe verstehen und verwenden.

Eine Probe wird nur verlangt, wenn die Aufgabe darüber hinausgeht, beispielsweise bei altertümlichen Texten, mehrdeutigen Formulierungen, Fachsprache, kulturellen Anspielungen, unbekannten Dialekten oder beschädigten Aufzeichnungen. Dafür wird eine passende Fertigkeit wie Wissen, Ermitteln, Menschenkenntnis oder Technik verwendet.

Ohne Kenntnis einer Kommunikationsform ist gewöhnliches Verstehen nicht durch eine beliebige Fertigkeitsprobe möglich. Übersetzungshilfen, Dolmetscher, Kräfte, Technologie oder ausdrücklich definierte Fähigkeiten können diese Einschränkung aufheben.

Wesenarten gewähren nicht automatisch kulturelle Sprachen.

#### Werkzeuge

Werkzeuge sind Ausrüstung und keine eigenständigen Fertigkeiten oder Werkzeugkompetenzen.

- Die zugehörige Fertigkeit und gegebenenfalls eine Spezialisierung bestimmen die Kompetenz.
- Mit geeigneten Werkzeugen wird die Handlung normal ausgeführt.
- Mit unvollständigen oder improvisierten Werkzeugen erhält die Probe Nachteil.
- Wenn es zur Situation passt, kann ein vor der Probe festgelegter zusätzlicher Zeitaufwand diesen Nachteil ersetzen.
- Fehlt ein unverzichtbares Werkzeug, ist die Handlung nicht möglich.
- Hochwertige Werkzeuge gewähren nur die ausdrücklich in ihrer Beschreibung genannten Vorteile.
- Der Besitz eines Werkzeugs verleiht weder Training noch Erfahrungsbonus oder Spezialisierung.

#### Berechtigungen und Zugänge

Fachliche Kompetenz, gesellschaftlicher Zugang und rechtliche Erlaubnis sind voneinander getrennt.

Eine Figur kann eine Handlung beherrschen, ohne sie offiziell ausführen zu dürfen. Umgekehrt kann eine Figur Zugang oder Autorität besitzen, ohne fachlich kompetent zu sein.

Lizenzen, Ausweise, Mitgliedschaften, Rang, Kontakte, Sicherheitsfreigaben und Milieuzugänge werden durch Hintergrund, Weltprofil, Ausrüstung, Beziehungen oder Abenteuerzustände vergeben.

Eine fehlende Berechtigung erschwert nicht automatisch die eigentliche Fertigkeitsprobe. Sie kann den Zugang verhindern, eine vorherige Täuschung oder Beschaffung notwendig machen oder bei Entdeckung Konsequenzen auslösen.

### 5.8 Vollständige Fertigkeitsbeschreibungen

**Status: offen – nächster Arbeitsblock**

Für jede der 18 Fertigkeiten fehlen noch:

- eine vollständige Definition,
- klare Abgrenzungen zu ähnlichen Fertigkeiten,
- gewöhnliche untrainierte Anwendungen,
- trainierte Handlungen,
- Fachhandlungen,
- typische alternative Attribute außerhalb des direkten Kampfes,
- Beispiel-Spezialisierungen,
- typische Widerstände und Gegenfertigkeiten,
- Beispiele für Fantasy, Gegenwart und Science-Fiction.

---

## 6. Abgeleitete Charakterwerte

**Status: offen**

Zu definieren sind:

- Gesundheit oder Trefferpunkte,
- Verteidigung,
- Initiative,
- Bewegung,
- Tragkraft,
- körperliche, mentale und sonstige Widerstände,
- Erholungswerte,
- Interaktion mit Stufen, Attributen und Ausrüstung.

---

## 7. Konflikt- und Kampfsystem

**Status: offen**

Zu definieren sind:

- Beginn eines Konflikts,
- Initiative und Zugreihenfolge,
- Runden- und Zugstruktur,
- Aktionsökonomie,
- Bewegung und Positionierung,
- Reichweiten,
- Angriffe und Verteidigung,
- Reaktionen,
- Deckung und Sicht,
- Gelände und Höhenunterschiede,
- Gelegenheitsangriffe,
- Hilfe und Teammanöver,
- Flucht und Verfolgungsjagden,
- soziale und andere nicht körperliche Konfliktformen.

---

## 8. Schaden, Heilung und Tod

**Status: offen**

Zu definieren sind:

- Schadensberechnung,
- Schadensarten,
- Rüstung und Schadensminderung,
- kritische Treffer,
- Verwundungen,
- Kampfunfähigkeit,
- Sterben und Tod,
- Stabilisierung,
- natürliche Heilung,
- medizinische Heilung,
- Heilung durch Kräfte und Technologie,
- Ruhe und Regeneration,
- langfristige Verletzungen und optionale Härtemodule.

---

## 9. Zustände

**Status: offen**

Zu definieren sind:

- einheitliche Zustandsbegriffe,
- Beginn, Dauer und Ende,
- Stapelung und Ersetzung,
- körperliche Zustände,
- mentale Zustände,
- soziale Zustände,
- technische Zustände,
- Wechselwirkung mit Vorteil, Nachteil und Aktionsökonomie.

---

## 10. Ausrüstung und Inventar

**Status: offen**

Zu definieren sind:

- Waffenwerte,
- Waffenmerkmale,
- Rüstungen,
- Schilde und Schutzsysteme,
- Werkzeuge,
- Verbrauchsgegenstände,
- Traglast oder Inventarplätze,
- Qualität und Modifikationen,
- Geld, Wohlstand und Verfügbarkeit,
- Herstellung und Reparatur,
- Fahrzeuge,
- größere Ausrüstung und Anlagen,
- settingübergreifende Ausrüstungskategorien.

---

## 11. Fähigkeiten und Archetypen

**Status: offen**

Zu definieren sind:

- einheitlicher Aufbau einer Fähigkeit,
- Aktivierungsart und Aktionskosten,
- Ressourcen und Abklingbedingungen,
- Voraussetzungen,
- Fähigkeitsränge,
- Primärarchetyp-Fortschritt,
- Sekundärarchetyp-Zugriff,
- Voraussetzungen für weitere Archetypen,
- gemeinsame Archetypfähigkeiten,
- geführte Kombinationsprofile,
- Interaktion von Archetyp und Essenz.

---

## 12. Kräfte, Magie und Technologie

**Status: offen**

Zu definieren sind:

- universeller Aufbau besonderer Kräfte,
- Aktivierungsproben,
- Ressourcen, Belastung oder andere Begrenzungen,
- Ziele, Reichweite, Wirkungsbereich und Dauer,
- Aufrechterhaltung,
- Unterbrechung und Gegenmaßnahmen,
- Rituale und langfristige Effekte,
- Erschaffung eigener Kräfte,
- körperliche, mentale, spirituelle, gebundene und technologische Ausprägungen,
- Weltprofile ohne Magie oder mit begrenzter Technologie.

---

## 13. Vollständiger Stufenaufstieg

**Status: teilweise festgelegt**

Bereits festgelegt sind:

- 20 Charakterstufen,
- Erfahrungsbonus nach Stufenbereich,
- Fertigkeitsentwicklungen auf den Stufen 3, 5, 7, 9, 11, 13, 15, 17 und 19,
- stufenabhängige Fertigkeitsgrenzen,
- keine automatische Erhöhung aller Werte.

Noch zu definieren sind:

- vollständige Tabelle für Stufe 1 bis 20,
- Häufigkeit von Attributssteigerungen,
- Archetypfähigkeiten,
- Essenzentwicklung,
- Zugriff auf Sekundärarchetypen,
- allgemeine oder freie Fähigkeiten,
- Meilenstein- und Erfahrungspunktmodell,
- Umgang mit nachträglich begonnenen Figuren.

---

## 14. Nicht kämpferische Spielsituationen

**Status: offen**

Zu definieren sind:

- Erkundung,
- Reisen,
- Recherche,
- soziale Konflikte,
- Gefahren und Umwelt,
- Gemeinschaftsprojekte,
- Ausfallzeiten,
- Herstellung,
- Kontakte und Ruf,
- Verfolgungsjagden außerhalb klassischer Kämpfe.

---

## 15. Gegner- und Spielleitungsregeln

**Status: offen**

Zu definieren sind:

- vereinfachte Gegnerwerte,
- Schergen,
- Standardgegner,
- Elitegegner,
- Bosse,
- Begegnungsbalance,
- Richtwerte nach Stufenbereich,
- Gefahren und Fallen,
- NSC-Erschaffung,
- Belohnungen,
- Umgang mit Fail Forward und Erfolg gegen Preis,
- Vorbereitung eigener Abenteuer.

---

## 16. Abenteuermodule und Weltprofile

**Status: teilweise festgelegt**

Bereits festgelegt sind:

- stabiler universeller Kern,
- Weltprofile für settingbezogene Erscheinungsformen,
- unabhängig deaktivierbare Drive- und Momentum-Regeln,
- optionale komplexere Digitalmodule.

Noch zu definieren sind:

- verbindliche Weltprofil-Vorlage,
- Regelmodul-Schnittstelle,
- Abhängigkeiten und Konflikte zwischen Modulen,
- Realismus- und Härtegrade,
- Magie- und Technologiestufen,
- Kennzeichnung deaktivierbarer Regeln,
- Ersatzregeln für deaktivierte Kernressourcen,
- Kompatibilitätsanforderungen für veröffentlichte Welten und Abenteuer.

---

## 17. Charaktererschaffung

**Status: teilweise festgelegt**

Der endgültige Ablauf soll die bereits beschlossenen Bausteine in eine feste Reihenfolge bringen:

1. Weltprofil und aktive Module bestimmen.
2. Figurenkonzept festlegen.
3. Wesenart wählen.
4. Hintergrund wählen.
5. Primärarchetyp wählen.
6. Primäre Essenz wählen.
7. Attribute verteilen.
8. Fertigkeitspunkte und Spezialisierung anwenden.
9. Sprache oder Kommunikationsform wählen.
10. Abgeleitete Werte berechnen.
11. Fähigkeiten und Ausrüstung wählen.
12. Drive, Beziehungen und Komplikation festhalten.

Die Reihenfolge bleibt vorläufig, bis abgeleitete Werte, Fähigkeiten und Ausrüstung abgeschlossen sind.

---

## 18. Referenzen und Systementsprechungen

**Status: offen**

Benötigt werden verständliche Entsprechungstabellen für Personen, die andere Systeme kennen. Die Tabellen erklären funktionale Ähnlichkeiten, ohne SagaDrive-Regeln mit fremden Regeln gleichzusetzen.

Mindestens zu behandeln sind:

- Dungeons & Dragons,
- Das Schwarze Auge,
- Pathfinder,
- Savage Worlds,
- weitere für einzelne Regelblöcke relevante Systeme.

Benötigte Entsprechungen umfassen:

- Attribute,
- Fertigkeiten,
- Spezialisierungen,
- Archetypen und Multiclassing,
- Hintergründe,
- Wesenarten,
- Essenzen und Kraftquellen,
- Drive und Momentum,
- Stufen und Kompetenzentwicklung.

---

## 19. Mathematische Prüfung und Spieltests

**Status: offen**

Vor der finalen Freigabe müssen mindestens geprüft werden:

- Erfolgswahrscheinlichkeiten aller typischen Attribut- und Fertigkeitskombinationen,
- Auswirkungen des Erfahrungsbonus,
- Auswirkungen des Spezialisierungsbonus von +2,
- Vorteil und Nachteil über alle relevanten Zielwerte,
- Sicherheitswert 10,
- Widerstände,
- Kompetenzunterschiede zwischen den Stufenbereichen,
- Kampfwerte und erwartete Kampfdauer,
- Schadens- und Heilungskurven,
- Wirkung von Drive und Momentum,
- Charaktere mit Primär- und Sekundärarchetyp,
- Spielbarkeit ohne Drive und Momentum,
- analoge Spielbarkeit ohne digitale Berechnungen.

Erst nach dieser Prüfung werden Zahlenwerte als final belastbar gekennzeichnet.

---

## 20. Abschlusskriterien

Die SagaDrive Core Rules gelten als vollständig, wenn:

- alle offenen Abschnitte durch verbindliche Regeln ersetzt wurden,
- alle 18 Fertigkeiten vollständig beschrieben sind,
- Charaktererschaffung und Stufenaufstieg lückenlos funktionieren,
- Konflikt, Schaden, Heilung und Tod vollständig geregelt sind,
- Ausrüstung und besondere Kräfte in allen vorgesehenen Weltarten funktionieren,
- Gegner und Herausforderungen konsistent erstellt werden können,
- optionale Module ihre Abhängigkeiten deklarieren,
- mathematische Grenzfälle geprüft wurden,
- mehrere vollständige Testspiele dokumentiert wurden,
- Begriffslexikon, Referenztabellen und Schnellreferenz vorhanden sind,
- die Regeln analog ohne SagaDrive-Anwendung spielbar sind.

---

## Änderungsverlauf

| Datum | Stand |
|---|---|
| 26.08.2026 | Erster konsolidierter Entwurf. Verbindliche Entscheidungen aus den Blöcken 1 bis 5.7 übernommen. Offene Regelbereiche und Fortsetzungspunkt ergänzt. |
