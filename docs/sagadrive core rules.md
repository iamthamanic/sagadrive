# SagaDrive Core Rules

> **Dokumentstatus:** Verbindlicher Core-Regelstand in Validierungsphase  
> **Stand:** 26. August 2026  
> **Zuletzt abgeschlossener Entscheidungsblock:** Regelentwurf Abschnitte 2 bis 18  
> **Aktueller Arbeitsblock:** 19 – Mathematische Prüfung und Spieltests  
> **Ziel:** Universelles, analog vollständig spielbares Kernregelsystem mit optionalen digitalen Erweiterungen

## Verwendung dieses Dokuments

Dieses Dokument ist die zentrale Arbeitsgrundlage für die SagaDrive Core Rules.

- Regeln in den Abschnitten 1 bis 18 gelten als **verbindlicher aktueller Core-Regelstand**.
- Zahlenwerte in diesen Abschnitten gelten als **verbindliche Playtestwerte**. Sie werden nur geändert, wenn Validierung oder Spieltests einen konkreten Änderungsbedarf zeigen.
- Abschnitt 19 dokumentiert die noch offene mathematische und praktische Validierung.
- Abschnitt 20 definiert die Kriterien für die endgültige Freigabe.
- Regeln aus Weltprofilen oder Abenteuermodulen dürfen den Kern erweitern oder ausdrücklich deaktivieren, aber nicht stillschweigend verändern.
- Änderungen am Core werden nach der Validierungsphase begründet und im Änderungsverlauf dokumentiert.

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

### 2.6 Widerstände, vergleichende Proben und Gleichstand

Bei einer gerichteten Handlung gegen ein Ziel wird grundsätzlich gegen einen statischen Widerstand gewürfelt.

```text
Widerstand = 10 + passendes Attribut + passende Fertigkeit
             + Erfahrungsbonus bei Training
             + anwendbare Spezialisierung
             + ausdrückliche Modifikatoren
```

Nur wenn beide Seiten gleichzeitig und aktiv dasselbe Ergebnis anstreben, wird eine vergleichende Probe verwendet. Dabei werden zuerst die Erfolgsgrade und danach die Gesamtergebnisse verglichen.

Bei vollständigem Gleichstand bleibt der Status quo bestehen.

- Angreifer gegen Verteidiger: Die verteidigende Seite hält ihre Position.
- Verfolgungsjagd: Die Distanz verändert sich nicht.
- Tauziehen oder vergleichbare Konkurrenz: Keine Seite erzielt Fortschritt.
- Es wird nicht automatisch erneut gewürfelt.

Eine normale Probe, deren Ergebnis exakt den Zielwert erreicht, ist ein Erfolg.

### 2.7 Schwierigkeiten

Aufgaben besitzen feste, aus der Spielwelt abgeleitete Schwierigkeiten. Sie skalieren nicht automatisch mit der Charakterstufe.

| Schwierigkeit | Zielwert | Bedeutung |
|---|---:|---|
| Trivial unter Druck | 5 | Für kompetente Figuren normalerweise sicher |
| Einfach | 10 | Gewöhnliche Herausforderung |
| Anspruchsvoll | 15 | Erfordert verlässliche Kompetenz |
| Schwer | 20 | Deutlich über Alltagsniveau |
| Extrem | 25 | Nur sehr kompetent zuverlässig erreichbar |
| Legendär | 30 | Herausragende Spitzenleistung |
| Übermenschlich | 35 | Normalerweise jenseits menschlicher Möglichkeiten |
| Weltverändernd | 40+ | Nur mit außergewöhnlichen Mitteln erreichbar |

Stufenabhängige Werte dienen ausschließlich dem Abenteuerdesign:

| Stufe | Normale Herausforderungen | Schwere Herausforderungen | Außergewöhnliche Herausforderungen |
|---|---:|---:|---:|
| 1–4 | 10–15 | 20 | 25 |
| 5–8 | 15 | 20 | 25 |
| 9–12 | 15–20 | 25 | 30 |
| 13–16 | 20 | 25 | 30 |
| 17–20 | 20–25 | 30 | 35 |

Ein bereits existierendes Hindernis verändert seinen Zielwert nicht, nur weil eine höherstufige Figur es versucht.

### 2.8 Zusammenarbeit

SagaDrive unterscheidet unterstützte Einzelproben, Gruppenproben und Gemeinschaftsprojekte.

#### Unterstützte Einzelprobe

Kann eine Person das Ziel stellvertretend für alle erreichen, führt sie die Probe aus.

- Bis zu zwei qualifizierte Helfende können unterstützen.
- Jede qualifizierte Hilfe zählt als eigenständige Vorteilsquelle.
- Für trainierte Handlungen muss auch die unterstützende Figur die erforderliche Fertigkeit trainiert haben.
- Für Fachhandlungen muss eine unterstützende Figur die relevante Spezialisierung besitzen, sofern ihre Hilfe fachlich denselben Teil der Aufgabe betrifft.
- Mehrere verbleibende Vorteilsquellen erzeugen weiterhin nur den normalen Vorteil nach Abschnitt 2.5.

#### Gruppenprobe

Muss jedes Gruppenmitglied selbst handeln, führt jede Figur eine eigene Probe aus.

| Ergebnis | Gruppenwert |
|---|---:|
| Kritischer Erfolg | +2 |
| Erfolg | +1 |
| Fehlschlag | -1 |
| Kritischer Fehlschlag | -2 |

- Gruppenwert über 0: Die Gruppe erreicht das gemeinsame Ziel.
- Gruppenwert unter 0: Die Gruppe scheitert und die angekündigte Konsequenz tritt ein.
- Gruppenwert 0: Status quo; individuelle Konsequenzen können trotzdem gelten.

#### Gemeinschaftsprojekt

Mehrstufige oder länger dauernde Vorhaben verwenden Fortschrittspunkte.

| Projektgröße | Benötigter Fortschritt |
|---|---:|
| Klein | 4 |
| Komplex | 8 |
| Groß | 12 |
| Episch | 16 |

Pro Arbeitsintervall werden höchstens drei Projektproben ausgeführt. Weitere Beteiligte unterstützen diese Proben oder übernehmen erzählerische Aufgaben.

| Ergebnis | Fortschritt |
|---|---:|
| Kritischer Erfolg | +2 |
| Erfolg | +1 |
| Fehlschlag | +0 und eine passende Zeit-, Ressourcen- oder Komplikationsfolge |
| Kritischer Fehlschlag | -1, mindestens 0 Gesamtfortschritt, plus deutliche Komplikation |

### 2.9 Verdeckte Informationen

Proben werden grundsätzlich offen ausgeführt. Der GM darf eine Probe verdeckt ausführen, wenn bereits die Kenntnis des Würfelergebnisses verborgene Informationen offenlegen würde.

Verdeckte Proben verändern weder Berechnung noch Erfolgsgrade. Der GM verändert ein verdecktes Ergebnis nicht nachträglich.

### 2.10 Drive

Drive ist eine persönliche Ressource mit einem normalen Startwert von 3 und einem Maximum von 5.

Drive kann ausgegeben werden für:

- Wiederholung eines eigenen Wurfs,
- Einführung eines plausiblen charakterbezogenen Details,
- Aktivierung einer ausdrücklich markierten Drive-Fähigkeit.

Für eine eigene Probe kann höchstens 1 Drive ausgegeben werden.

Bei einer Wiederholung wird die gesamte Probe einschließlich Vorteil oder Nachteil unter denselben Bedingungen erneut gewürfelt. Die spielende Person darf anschließend das alte oder das neue Ergebnis wählen.

Drive wird durch das freiwillige Akzeptieren einer klar benannten, charakterbezogenen Komplikation zurückgewonnen.

Drive kann Konsequenzen nicht allgemein nachträglich negieren.

### 2.11 Momentum

Momentum ist eine gemeinsame, vergängliche Gruppenressource mit einem Startwert von 0 und einem Maximum von 3. Am Ende jeder Szene verfällt 1 ungenutztes Momentum.

Momentum entsteht durch:

- kritische Zusammenarbeit,
- gemeinsame Zielerreichung,
- ausdrücklich definierte Teamfähigkeiten.

Momentum kann ausgegeben werden für:

- Koordination,
- passende Nebeneffekte erfolgreicher Teamhandlungen,
- ausdrücklich definierte Teammanöver.

Momentum ersetzt weder persönlichen Drive noch individuelle Ressourcen.

### 2.12 Optionale Ressourcen

Drive und Momentum sind im Standardspiel aktiv. Ein Abenteuer kann beide Systeme unabhängig voneinander deaktivieren.

Eine davon abhängige Fähigkeit muss für den Fall einer deaktivierten Ressource ausdrücklich eine Ersatzbegrenzung definieren oder gilt als nicht verfügbar. Es gibt keine stillschweigenden Ersatzkosten.

---

## 3. Attribute

### 3.1 Attributsliste

SagaDrive verwendet sechs universelle Attribute.

| Attribut | Grundbedeutung |
|---|---|
| Stärke | Körperkraft, unmittelbare physische Leistung und Kraftübertragung |
| Geschicklichkeit | Koordination, Präzision, Beweglichkeit und Reaktionskontrolle |
| Ausdauer | körperliche Widerstandsfähigkeit, Belastbarkeit und Durchhaltevermögen |
| Verstand | Analyse, Wissen, Planung und methodische Problemlösung |
| Wahrnehmung | Aufmerksamkeit, Intuition, Orientierung und Erkennen relevanter Details |
| Charisma | Präsenz, Ausdruck, Einfluss und soziale Durchsetzung |

### 3.2 Wertebereich

Attribute werden direkt verwendet. Es gibt keine aus Attributswerten abgeleiteten separaten Modifikatoren.

| Wert | Einordnung |
|---:|---|
| 0 | Nur durch ausdrücklich vorgesehene Merkmale, Zustände oder Kreaturenregeln |
| 1–4 | Regulärer Bereich bei der Charaktererschaffung |
| 5 | Menschlicher Spitzenwert |
| 6+ | Übermenschlich und nur durch ausdrücklich vorgesehene Regeln |

### 3.3 Startattribute

Standardverteilung:

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

Kein reguläres Startattribut darf unter 1 oder über 4 liegen. Nicht ausgegebene Punkte verfallen.

### 3.4 Quellen von Attributswerten

Archetypen, Hintergründe, Wesenarten und Essenzen vergeben bei der regulären Charaktererschaffung keine allgemeinen Attributsboni.

### 3.5 Attribute und Fertigkeiten

Jede Fertigkeit besitzt ein Standardattribut.

Außerhalb des direkten Kampfes kann ein anderes Attribut verwendet werden, wenn die beschriebene Vorgehensweise tatsächlich eine andere Art der Handlung darstellt. Das alternative Attribut muss vor der Probe feststehen.

Im direkten Kampf gilt das für die Handlung definierte Attribut, sofern keine ausdrückliche Regel etwas anderes erlaubt.

### 3.6 Reine Attributsproben

Existiert keine relevante Fertigkeit:

```text
d20 + Attribut + ausdrückliche Modifikatoren
```

Eine Fertigkeit mit Wert 0 gilt dagegen als untrainierte Fertigkeitsprobe. Sicheres Arbeiten steht bei reinen Attributsproben nicht zur Verfügung.

### 3.7 Attributsentwicklung

Eine Figur erhöht auf Stufe 8 und Stufe 16 jeweils ein Attribut um 1.

- Reguläres Maximum: 5
- Werte ab 6: nur über ausdrücklich übermenschliche Regeln
- Eine Attributssteigerung darf nicht gegen andere Entwicklungsoptionen eingetauscht werden, sofern ein Modul dies nicht ausdrücklich erlaubt.

---

## 4. Charakterstruktur

### 4.1 Stufen

SagaDrive verwendet 20 Charakterstufen. Eine Stufe gibt den allgemeinen Erfahrungsrahmen einer Figur an, erhöht aber nicht automatisch sämtliche Werte.

### 4.2 Archetypen

SagaDrive verwendet fünf universelle Archetypen.

| Archetyp | Kernfunktion | Typische Fertigkeiten |
|---|---|---|
| Kämpfer | Direkter Konflikt, Schutz, Druck | Athletik, Nahkampf, Fernkampf, Einschüchtern |
| Denker | Analyse, Planung, Systeme | Ermitteln, Wissen, Technik, Aufmerksamkeit |
| Heiler | Stabilisierung, Versorgung, Fürsorge | Medizin, Menschenkenntnis, Wissen, Überleben |
| Rebell | Infiltration, Beweglichkeit, Improvisation | Akrobatik, Fingerfertigkeit, Heimlichkeit, Täuschen |
| Diplomat | Einfluss, Führung, Koordination | Überzeugen, Menschenkenntnis, Auftreten, Einschüchtern |

Jede Figur beginnt mit einem Primärarchetyp. Weitere Archetypen werden über freie Fähigkeitswahlen erschlossen und besitzen keine eigenen Klassenstufen.

- Zweiter Archetyp: frühestens Stufe 6; mindestens drei Fähigkeiten aus dem Primärarchetyp.
- Dritter Archetyp: frühestens Stufe 12; mindestens drei Fähigkeiten in jedem bereits erschlossenen Archetyp.
- Vierter Archetyp: frühestens Stufe 18; mindestens drei Fähigkeiten in jedem bereits erschlossenen Archetyp.

Das Erschließen eines neuen Archetyps verbraucht eine freie Fähigkeitswahl und enthält dessen Rang-I-Kernfähigkeit.

### 4.3 Kombinationen

Die fünf Archetypen und fünf Essenzen erzeugen 25 geführte Kombinationsprofile. Diese sind Orientierungshilfen und keine eigenen Klassen oder Subsysteme.

### 4.4 Hintergrund

Ein Hintergrund enthält:

- eine Liste aus vier passenden Fertigkeiten,
- Training in zwei unterschiedlichen Fertigkeiten dieser Liste,
- eine Spezialisierung,
- einen Milieuzugang,
- eine Verbindung oder Kontaktperson,
- eine charakterbezogene Komplikation.

Hintergründe vergeben keine Attributsboni und keine allgemeinen Kräfte.

### 4.5 Wesenart

Eine reguläre Wesenart verwendet ein Merkmalsbudget von 3 Punkten.

- Keine allgemeinen Attributs- oder Fertigkeitsboni.
- Keine kulturellen Sprachen.
- Keine zusätzlichen vollständigen Aktionen.
- Nachteile erzeugen keine zusätzlichen freien Merkmalspunkte.
- Hybride Wesenarten verwenden dasselbe Gesamtbudget.

#### Merkmalskosten

**Kosten 1 – kleines Merkmal**

Beispiele:

- geschärfter einzelner Sinn,
- natürliche Waffe: unbewaffneter Schaden steigt von d4+1 auf d6+1,
- Vorteil gegen eine eng definierte Gefahrenart,
- Anpassung an eine bestimmte Umgebung.

**Kosten 2 – starkes Merkmal**

Beispiele:

- natürliche Schutzwirkung 1,
- volle Kletter- oder Schwimmbewegung,
- amphibisches Leben,
- deutlich verbesserte Sichtform.

**Kosten 3 – definierendes Merkmal**

Beispiele:

- Flugbewegung,
- Überleben in einer extremen Umwelt ohne normale Schutzmittel,
- außergewöhnlicher Körperbau mit klar definierter mechanischer Wirkung.

Wesenartmerkmale dürfen keine vollen Zusatzaktionen, allgemeinen Attributsboni, allgemeinen Fertigkeitsboni, zusätzlichen Drive, zusätzliches Momentum oder einen Archetyp ersetzen.

### 4.6 Essenzen

SagaDrive verwendet fünf universelle Essenzen.

| Essenz | Wirkprinzip |
|---|---|
| Körperlich | Körper, Biologie, Training oder körperliche Veränderung |
| Mental | Geist, Fokus, Wahrnehmung oder mentale Projektion |
| Spirituell | Seele, Glauben, Geister oder metaphysische Verbindung |
| Gebunden | Bindung an Wesen, Artefakte, Pakte, Begleiter oder externe Quellen |
| Technologisch | Geräte, Systeme, Konstruktionen oder technische Veränderung |

Jede Figur besitzt eine primäre Essenz. Eine sekundäre Essenz kann später erschlossen werden. Essenzen vergeben keine automatischen Attributs- oder Fertigkeitsboni.

### 4.7 Weltprofile

Ein Weltprofil muss mindestens festlegen:

1. Name und Genre,
2. Tonalität,
3. Standard-Härtegrad,
4. verfügbare Wesenarten,
5. Milieus und Hintergründe,
6. Erscheinungsformen der Archetypen,
7. verfügbare Essenzen und ihre Manifestationen,
8. Magiestufe,
9. Technologiestufe,
10. Sprachen und Kommunikationsformen,
11. verfügbare Ausrüstung,
12. Ressourcen- oder Währungsmodell,
13. Reisen und Fahrzeuge,
14. typische Gefahren,
15. aktive Module,
16. deaktivierte Core-Regeln,
17. Ersatzregeln für deaktivierte Core-Regeln,
18. relevante Wirkungskennzeichnungen und Gegenmaßnahmen,
19. Richtwerte für Begegnungen und Gegner,
20. jede ausdrückliche Abweichung vom Core.

Ein Weltprofil darf Core-Regeln niemals stillschweigend verändern.

---

## 5. Fertigkeiten und Spezialisierungen

### 5.1 Universelle Fertigkeitsliste

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

Es gibt keine zusätzliche Fertigkeit Belastbarkeit. Reines körperliches Aushalten verwendet Ausdauer. Athletik wird verwendet, wenn sportliche Technik oder aktive körperliche Leistung entscheidend ist.

### 5.2 Spezialisierungen

Eine passende Spezialisierung gibt:

```text
+2 auf die Probe
```

- Höchstens eine Spezialisierung pro Probe.
- Fachhandlungen können eine passende Spezialisierung voraussetzen.
- Fachhandlungen müssen vor dem Wurf als solche erkennbar sein.

| Spezialisierung in derselben Fertigkeit | Voraussetzung |
|---:|---:|
| Erste | Fertigkeitswert 1 |
| Zweite | Fertigkeitswert 3 |
| Dritte | Fertigkeitswert 5 |

Maximal drei Spezialisierungen pro Fertigkeit.

### 5.3 Fertigkeitswerte und Erfahrungsbonus

| Wert | Kompetenzstufe |
|---:|---|
| 0 | Untrainiert |
| 1 | Trainiert |
| 2 | Geübt |
| 3 | Fachkundig |
| 4 | Meisterlich |
| 5 | Weltklasse |

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

### 5.4 Fertigkeiten bei der Charaktererschaffung

Eine Startfigur erhält 10 Fertigkeitspunkte. Empfohlene Standardverteilung:

```text
3, 2, 2, 1, 1, 1
```

Grenzen:

- maximaler Startwert 3,
- mindestens sechs Fertigkeiten auf 1 oder höher,
- nicht ausgegebene Punkte verfallen.

| Quelle | Fertigkeitspunkte |
|---|---:|
| Hintergrund | 2 Punkte in zwei unterschiedlichen Fertigkeiten seiner Viererliste |
| Primärarchetyp | 1 Punkt aus seiner Fertigkeitsliste |
| Freie Verteilung | 7 |
| Gesamt | 10 |

### 5.5 Fertigkeitsentwicklung

Fertigkeitsentwicklung auf den Stufen:

```text
3, 5, 7, 9, 11, 13, 15, 17, 19
```

Je Entwicklung:

- Fertigkeit um 1 erhöhen,
- neue Fertigkeit von 0 auf 1,
- neue Spezialisierung erwerben.

Nicht verwendete Fertigkeitsentwicklungen dürfen zurückgestellt werden.

### 5.6 Handlungskategorien und passive Werte

| Kategorie | Regel |
|---|---|
| Automatische Handlung | Keine Probe |
| Gewöhnliche Handlung | Darf mit Fertigkeitswert 0 versucht werden |
| Trainierte Handlung | Fertigkeitswert 1+ erforderlich |
| Fachhandlung | Training und passende Spezialisierung erforderlich |

SagaDrive verwendet keine allgemeine Liste passiver Fertigkeitswerte.

Aufmerksamkeitswiderstand:

```text
10 + Wahrnehmung + Aufmerksamkeit
   + Erfahrungsbonus bei trainierter Aufmerksamkeit
   + anwendbare Spezialisierung
   + ausdrückliche Modifikatoren
```

### 5.7 Sprachen, Werkzeuge und Berechtigungen

Sprachen sind keine Fertigkeiten. Das Weltprofil bestimmt die gemeinsame Standardsprache. Jede Figur beherrscht normalerweise zusätzlich eine zum Hintergrund passende Kommunikationsform.

Werkzeuge sind Ausrüstung:

- geeignete Werkzeuge: normale Probe,
- unvollständige oder improvisierte Werkzeuge: Nachteil,
- passender zusätzlicher Zeitaufwand kann diesen Nachteil ersetzen,
- fehlt ein unverzichtbares Werkzeug, ist die Handlung unmöglich,
- hochwertige Werkzeuge haben nur ausdrücklich definierte Vorteile.

Berechtigungen, Lizenzen, Rang, Kontakte und Sicherheitsfreigaben sind von fachlicher Kompetenz getrennt.

### 5.8 Vollständige Fertigkeitsbeschreibungen

#### 5.8.1 Athletik

**Standardattribut:** Stärke

Athletik beschreibt trainierte körperliche Bewegung und kontrollierte Kraftanwendung gegen Entfernungen, Höhen, Strömungen, Lasten und unbelebte Hindernisse.

Typische Anwendungen: Klettern, Schwimmen, Springen, Sprinten, Tauchen, Heben, Ziehen, Festhalten, gewaltsames Öffnen und kraftvolles Lösen aus körperlichen Behinderungen.

Normale Bewegung benötigt keine Probe. Ausdauer + Athletik kann außerhalb des direkten Kampfes für langfristige sportliche Leistung verwendet werden. Reines Aushalten verwendet Ausdauer. Kampfmanöver werden mit Nahkampf eingeleitet.

Geeignete Spezialisierungen: Klettern, Schwimmen, Tauchen, Springen, Sprinten, Kraftakt, Rettung.

#### 5.8.2 Akrobatik

**Standardattribut:** Geschicklichkeit

Akrobatik beschreibt Balance, präzise Körperkontrolle, kontrollierte Landungen, Rollen, Ausweichen durch Bewegung und das bewegliche Lösen aus körperlichen Behinderungen.

Typische Anwendungen: Balance auf schmalem Untergrund, kontrollierte Stürze, Parkour, schwierige Landungen, Durchqueren beweglicher Hindernisse und akrobatisches Entkommen.

Akrobatik ersetzt weder Athletik für Kraft und Klettern noch Nahkampf für das Einleiten eines Kampfmanövers.

Geeignete Spezialisierungen: Balance, Parkour, Fallen, Entkommen, Luftakrobatik.

#### 5.8.3 Fingerfertigkeit

**Standardattribut:** Geschicklichkeit

Fingerfertigkeit beschreibt unauffällige oder besonders präzise manuelle Handlungen mit kleinen Gegenständen.

Typische Anwendungen: Taschendiebstahl, Fingertricks, kleine Gegenstände verbergen, manuelle Präzisionsarbeit und mechanische Schlösser bedienen.

Technische Analyse, Konstruktion und Reparatur verwenden Technik. Eine Fachhandlung kann beide Kompetenzen voraussetzen.

Geeignete Spezialisierungen: Taschendiebstahl, Schlösser, Tricks, Feinmechanik, Verbergen.

#### 5.8.4 Heimlichkeit

**Standardattribut:** Geschicklichkeit

Heimlichkeit beschreibt das Verbergen der eigenen Anwesenheit und unbemerkte Bewegung.

Typische Anwendungen: Schleichen, Verstecken, Beschattung, unbemerkter Zugang und Ausnutzen von Deckung.

Heimlichkeit wird normalerweise gegen den Aufmerksamkeitswiderstand relevanter Beobachter gewürfelt. Ein erfolgreicher Angriff aus dem Verborgenen erhält Vorteil und offenbart die angreifende Figur danach normalerweise.

Geeignete Spezialisierungen: Schleichen, Verstecken, Beschattung, Infiltration, urbane Tarnung.

#### 5.8.5 Nahkampf

**Standardattribut:** Stärke

Nahkampf beschreibt Angriffe und aktive Kampfmanöver innerhalb unmittelbarer Reichweite.

Typische Anwendungen: unbewaffnete Angriffe, Nahkampfwaffen, Greifen, Schubsen, Zu-Fall-Bringen und Entwaffnen.

Geschicklichkeit ersetzt Stärke nur bei einer Waffe oder Fähigkeit mit ausdrücklichem Finesse-Effekt.

Geeignete Spezialisierungen können einzelne Waffenfamilien, unbewaffneter Kampf oder definierte Manöver sein.

#### 5.8.6 Fernkampf

**Standardattribut:** Geschicklichkeit

Fernkampf beschreibt gezielte Angriffe mit Projektilen, Wurfwaffen und anderen direkt bedienten Distanzwaffen.

Reichweite, Sicht und Deckung verändern die Probe nur nach den ausdrücklichen Kampfregeln.

Geeignete Spezialisierungen können Bögen, Schusswaffen, Wurfwaffen oder settingbezogene Waffengruppen sein.

#### 5.8.7 Aufmerksamkeit

**Standardattribut:** Wahrnehmung

Aufmerksamkeit beschreibt unmittelbares Wahrnehmen relevanter Veränderungen.

Typische Anwendungen: Hinterhalte bemerken, Geräusche lokalisieren, Bewegung erkennen, Veränderungen in einer Szene wahrnehmen und versteckte Gefahren entdecken.

Systematische Rekonstruktion und gezielte Spurenauswertung verwenden Ermitteln.

Geeignete Spezialisierungen: Hinterhalte, Geräusche, visuelle Suche, Wachsamkeit, Überwachung.

#### 5.8.8 Menschenkenntnis

**Standardattribut:** Wahrnehmung

Menschenkenntnis beschreibt das Einschätzen von Stimmung, Absicht, Motivation und sozialer Dynamik.

Sie erlaubt keine Gedankenleserei. Gegen Täuschungsversuche wird sie normalerweise als Widerstand oder aktive Gegenprobe verwendet.

Geeignete Spezialisierungen: Lügen erkennen, Verhandlungspartner, Gruppendynamik, Motivation, Stressreaktionen.

#### 5.8.9 Überleben

**Standardattribut:** Wahrnehmung

Überleben beschreibt Orientierung und praktische Handlungsfähigkeit in schwierigen Umgebungen.

Typische Anwendungen: Navigation, Spuren verfolgen, Nahrung und Wasser finden, Wetter einschätzen, Lager wählen und sichere Routen erkennen.

Geeignete Spezialisierungen: Navigation, Spuren, Wildnis, urbane Survival-Situationen, Wetter, bestimmte Umgebungen.

#### 5.8.10 Ermitteln

**Standardattribut:** Verstand

Ermitteln beschreibt systematische Suche, Rekonstruktion und methodische Informationsgewinnung.

Typische Anwendungen: Tatorte auswerten, Quellen vergleichen, Archive durchsuchen, Zusammenhänge rekonstruieren und gezielte Recherche.

Eine für den Fortgang zwingend notwendige Information wird niemals ausschließlich hinter einer einzelnen erfolgreichen Probe verborgen. Die Probe entscheidet über Tiefe, Geschwindigkeit, Kosten, Sicherheit oder Zusatzinformationen.

Geeignete Spezialisierungen: Tatorte, Archive, digitale Recherche, Forensik, Befragungsanalyse.

#### 5.8.11 Wissen

**Standardattribut:** Verstand

Wissen beschreibt erlerntes Fachwissen, Einordnung und Anwendung bekannter theoretischer Zusammenhänge.

Spezialisierungen definieren Wissensgebiete wie Geschichte, Recht, Naturwissenschaften, Okkultes, Medizinwissen, bestimmte Kulturen oder settingbezogene Fachgebiete.

#### 5.8.12 Technik

**Standardattribut:** Verstand

Technik beschreibt Bedienen, Analysieren, Reparieren, Konstruieren und Umgehen technischer oder mechanischer Systeme.

Außerhalb des direkten Kampfes kann Geschicklichkeit + Technik verwendet werden, wenn die technische Kompetenz feststeht und ausschließlich manuelle Präzision entscheidend ist.

Geeignete Spezialisierungen: Elektronik, Mechanik, Computer, Fahrzeuge, Robotik, Sicherheitssysteme.

#### 5.8.13 Medizin

**Standardattribut:** Verstand

Medizin beschreibt Diagnose, Stabilisierung, Behandlung, Chirurgie und biologische Gesundheitsversorgung.

Reparaturen rein technischer Wesen oder Maschinen verwenden normalerweise Technik. Hybride Systeme können eine passende Spezialisierung oder beide Fertigkeiten voraussetzen.

Geeignete Spezialisierungen: Notfallmedizin, Chirurgie, Diagnose, Toxikologie, Psychiatrie, bestimmte Spezies.

#### 5.8.14 Steuern

**Standardattribut:** Geschicklichkeit

Steuern beschreibt die aktive Kontrolle von Fahrzeugen, Reittieren oder vergleichbaren Bewegungssystemen unter schwierigen Bedingungen.

Routinefahrt benötigt keine Probe. Navigation verwendet andere passende Fertigkeiten.

Geeignete Spezialisierungen: Bodenfahrzeuge, Motorräder, Fluggeräte, Wasserfahrzeuge, Raumfahrzeuge, Reittiere.

#### 5.8.15 Überzeugen

**Standardattribut:** Charisma

Überzeugen beschreibt ehrlichen sozialen Einfluss, Verhandlung, Führung und glaubwürdige Argumentation.

Überzeugen ist keine Gedankenkontrolle und kann keine Handlung erzwingen, die dem Ziel fundamental unvereinbar erscheint.

Geeignete Spezialisierungen: Verhandeln, Diplomatie, Führung, Verkauf, Vermittlung.

#### 5.8.16 Täuschen

**Standardattribut:** Charisma

Täuschen beschreibt Lügen, Ablenkungen, falsche Darstellung und bewusste Irreführung.

Täuschen wird typischerweise gegen Menschenkenntnis aufgelöst. Eine physische Fälschung benötigt zusätzlich die passende praktische Fertigkeit.

Geeignete Spezialisierungen: Lügen, Verkleidung, Ablenkung, falsche Identität, Betrug.

#### 5.8.17 Einschüchtern

**Standardattribut:** Charisma

Einschüchtern beschreibt Einfluss durch Drohung, Dominanz und glaubwürdig vermittelte Gefahr.

Außerhalb des direkten Kampfes kann Stärke verwendet werden, wenn tatsächlich eine körperliche Machtdemonstration die Handlung trägt.

Einschüchtern kann kein Ziel zu offensichtlich selbstzerstörerischen Handlungen zwingen.

Geeignete Spezialisierungen: Verhör, Drohung, körperliche Präsenz, Autorität, psychologischer Druck.

#### 5.8.18 Auftreten

**Standardattribut:** Charisma

Auftreten beschreibt bewusste Darbietung vor anderen.

Typische Anwendungen: Musik, Schauspiel, Rede, Tanz, Unterhaltung und öffentliche Inszenierung.

Außerhalb direkter Konflikte kann ein alternatives Attribut verwendet werden, wenn die technische Ausführung statt Präsenz den Schwerpunkt bildet.

Geeignete Spezialisierungen: Musik, Schauspiel, Rede, Tanz, Comedy oder andere klar definierte Darbietungsformen.

---

## 6. Abgeleitete Charakterwerte

### 6.1 Gesundheit

```text
Gesundheit = 12 + (2 × Ausdauer) + (2 × Erfahrungsbonus)
```

Gesundheit wächst bewusst langsam. Stufen allein sollen Figuren widerstandsfähiger, aber nicht zu unverwundbaren Schadenspuffern machen.

### 6.2 Verteidigung

```text
Verteidigung = 10 + Geschicklichkeit + Erfahrungsbonus + max(Nahkampf, Akrobatik)
```

Spezialisierungen werden nicht auf Verteidigung angerechnet.

### 6.3 Initiative

```text
d20 + Wahrnehmung + Aufmerksamkeit
     + Erfahrungsbonus bei trainierter Aufmerksamkeit
```

Bei Gleichstand entscheidet:

1. höherer Initiativmodifikator,
2. höhere Wahrnehmung,
3. Spielerfigur vor NSC,
4. bei gleicher Seite entscheidet diese Seite die Reihenfolge.

### 6.4 Bewegung

Standardbewegung: **9 Meter pro Zug**.

Optionales Raster: 1 Feld = 1,5 Meter; Standardbewegung = 6 Felder.

### 6.5 Widerstände

```text
Körperwiderstand = 10 + Ausdauer + Erfahrungsbonus
Reflexwiderstand = 10 + Geschicklichkeit + Erfahrungsbonus
Geistwiderstand = 10 + Verstand + Erfahrungsbonus
Manöverwiderstand = 10 + Erfahrungsbonus
                    + max(Stärke + Athletik, Geschicklichkeit + Akrobatik)
```

### 6.6 Erholung

```text
Erholung = Ausdauer + Erfahrungsbonus
```

### 6.7 Traglast

```text
Traglast = 5 + (2 × Stärke) Lastpunkte
```

---

## 7. Konflikt- und Kampfsystem

### 7.1 Zeitstruktur

Eine Kampfrunde entspricht ungefähr 6 Sekunden.

### 7.2 Überraschung

Eine überraschte Figur:

- hat Nachteil auf Initiative,
- besitzt bis zum Beginn ihres ersten Zuges keine Reaktion.

### 7.3 Zugstruktur

Jede Figur besitzt pro Zug:

- 1 Hauptaktion,
- 1 Bewegung,
- 1 einfache freie Interaktion,
- 1 Reaktion pro Runde.

Es gibt keine allgemeine Bonusaktion.

Eine Hauptaktion kann für eine zweite normale Bewegung verwendet werden.

### 7.4 Kernaktionen

**Angreifen:** Einen normalen Angriff oder ein Kampfmanöver ausführen.

**Sprinten:** Hauptaktion; zusätzliche volle Bewegung.

**Lösen:** Hauptaktion; eigene Bewegung löst für den Rest des Zuges keine Gelegenheitsangriffe aus.

**Verteidigen:** Hauptaktion; Angriffe gegen die Figur haben bis zum Beginn ihres nächsten Zuges Nachteil. Eigene aktive Reflexproben erhalten in diesem Zeitraum Vorteil.

**Helfen:** Qualifizierte Hilfe nach Abschnitt 2.8.

**Bereithalten:** Hauptaktion; Auslöser und Handlung festlegen. Die Handlung wird später als Reaktion ausgeführt.

**Verstecken:** Hauptaktion; Heimlichkeit nach den normalen Regeln.

### 7.5 Gelegenheitsangriffe

Verlässt eine Figur freiwillig die Nahkampfreichweite eines Gegners, kann dieser seine Reaktion für einen Gelegenheitsangriff verwenden.

Kein Gelegenheitsangriff durch:

- Lösen,
- erzwungene Bewegung,
- Teleportation oder vergleichbare Versetzung.

### 7.6 Kampfmanöver

#### Greifen

Nahkampf gegen Manöverwiderstand.

- Erfolg: Ziel ist Gegriffen.
- Kritischer Erfolg: zusätzlich darf das Ziel bis zu 1,5 Meter verschoben werden.

#### Entkommen

Hauptaktion; Athletik oder Akrobatik gegen den Manöverwiderstand des greifenden Gegners.

#### Schubsen

Nahkampf gegen Körperwiderstand.

- Erfolg: 1,5 Meter verschieben.
- Kritischer Erfolg: bis zu 3 Meter verschieben.

#### Zu-Fall-Bringen

Nahkampf gegen Reflexwiderstand.

Erfolg: Ziel wird Liegend.

#### Entwaffnen

Nahkampf gegen Verteidigung.

- Erfolg: gehaltener Gegenstand fällt zu Boden.
- Kritischer Erfolg: angreifende Figur bestimmt eine erreichbare Fallrichtung.

### 7.7 Deckung und Sicht

- Teildeckung: Fernkampfangriffe gegen das Ziel haben Nachteil.
- Volldeckung: Ziel kann nicht direkt anvisiert werden.
- Unklare Sicht: relevante Angriffe und Sichtproben haben Nachteil.
- Angriff aus dem Verborgenen: Vorteil; die angreifende Figur wird danach normalerweise sichtbar.
- Höhenunterschiede geben keinen allgemeinen Zahlenbonus.

### 7.8 Reichweite

Waffen besitzen eine normale und gegebenenfalls eine maximale Reichweite.

- bis normale Reichweite: normale Probe,
- über normale bis maximale Reichweite: Nachteil,
- über maximale Reichweite: Angriff unmöglich.

---

## 8. Schaden, Heilung und Tod

### 8.1 Schadensklassen

Waffenschaden ist standardmäßig unabhängig vom Attribut.

| Klasse | Schaden |
|---|---:|
| Unbewaffnet | d4+1 |
| Leicht | d6+1 |
| Standard | d8+2 |
| Schwer | d10+3 |
| Extrem | d12+4 |

### 8.2 Kritischer Schaden

Bei einem kritischen Treffer werden nur die Schadenswürfel verdoppelt, nicht feste Boni.

Beispiel:

```text
d8+2 -> 2d8+2
```

### 8.3 Schutz und Rüstung

Rüstung erhöht nicht die Verteidigung, sondern reduziert erlittenen Schaden.

| Schutz | Mindeststärke | Typische Kategorie |
|---:|---:|---|
| 1 | 1 | leicht |
| 2 | 2 | mittel |
| 3 | 4 | schwer |

Unterhalb der Mindeststärke:

- Bewegung -3 Meter,
- Nachteil auf Akrobatik,
- Nachteil auf Heimlichkeit.

Ein Schild gibt +1 Verteidigung und belegt eine Hand.

Normale persönliche Ausrüstung besitzt höchstens Schutz 3. Durch Fähigkeiten kann gewöhnlicher Gesamtschutz bis 5 steigen. Fahrzeuge und Strukturen können darüber liegen.

### 8.4 Schadenskennzeichnungen

Universelle Schadenskennzeichnungen:

- Kinetisch
- Thermisch
- Elektrisch
- Chemisch
- Biologisch
- Mental
- Spirituell
- System

Eine Resistenz oder Schwäche muss immer auf klar definierte Kennzeichnungen verweisen.

### 8.5 Kampfunfähigkeit und Sterben

Bei 0 Gesundheit ist eine Figur kampfunfähig.

- Absichtlich nicht tödlicher Abschluss: stabil bei 0.
- Sonst: Sterbend 1.

Am Ende jedes eigenen Zuges:

```text
d20 + Ausdauer + Erfahrungsbonus gegen Zielwert 15
```

| Ergebnis | Wirkung |
|---|---|
| Kritischer Erfolg | stabil |
| Erfolg | Sterbend -1 |
| Fehlschlag | Sterbend +1 |
| Kritischer Fehlschlag | Sterbend +2 |

- Sterbend 0: stabil.
- Sterbend 3: Tod.
- Schaden bei 0 Gesundheit: Sterbend +1.
- Kritischer Schaden bei 0: Sterbend +2.

### 8.6 Massiver Schaden

Erreicht ein einzelner Schadenseffekt mindestens:

```text
aktuelle Gesundheit + maximale Gesundheit
```

tritt sofortiger Tod ein, sofern eine Weltregel dies nicht ausdrücklich ersetzt.

### 8.7 Erste Hilfe

Trainierte Medizin, Hauptaktion, medizinisches Set, Zielwert 15.

| Ergebnis | Wirkung |
|---|---|
| Kritischer Erfolg | stabil und 1 Gesundheit |
| Erfolg | stabil |
| Fehlschlag | keine Veränderung |
| Kritischer Fehlschlag | Sterbend +1 |

### 8.8 Erholung

**Verschnaufpause:** 10 sichere Minuten; stellt einmal zwischen bedeutenden Konflikten Erholung Gesundheit wieder her.

**Medizinische Versorgung während der Verschnaufpause:** Medizin Zielwert 15; bei Erfolg werden statt Erholung insgesamt 2 × Erholung Gesundheit wiederhergestellt. Nicht zusätzlich.

**Stabile Figur bei 0:** Nach 10 sicheren Minuten erhält sie 1 Gesundheit.

**Volle Ruhe:** ungefähr 8 sichere Stunden; stellt im Standard-Härtegrad die volle Gesundheit wieder her.

---

## 9. Zustände

### 9.1 Allgemeine Regel

Derselbe Zustand stapelt normalerweise nicht. Eine erneute Anwendung aktualisiert seine Dauer, sofern die Quelle nichts anderes sagt.

### 9.2 Liegend

- Eigene Angriffe haben Nachteil.
- Nahkampfangriffe aus unmittelbarer Nähe gegen die Figur haben Vorteil.
- Fernere Angriffe gegen die Figur haben Nachteil.
- Aufstehen kostet die Hälfte der normalen Bewegung.

### 9.3 Gegriffen

- Bewegung 0.
- Entkommen benötigt eine Hauptaktion nach Abschnitt 7.6.

### 9.4 Blind

- Sichtabhängige Handlungen haben Nachteil.
- Angriffe gegen die Figur haben Vorteil.
- Rein sichtabhängige Ziele können unmöglich wahrnehmbar sein.

### 9.5 Benommen

- Keine Reaktion.
- Nächster d20-Wurf vor Ende des nächsten eigenen Zuges hat Nachteil.

### 9.6 Verängstigt

- Figur kann sich der Quelle nicht freiwillig nähern.
- Direkte Handlungen gegen die Quelle haben Nachteil.

### 9.7 Kampfunfähig

Keine Hauptaktion, Bewegung oder Reaktion.

### 9.8 Bewusstlos

Kampfunfähig, liegend und nimmt die Umgebung nicht bewusst wahr.

### 9.9 Erschöpfung

| Stufe | Wirkung |
|---:|---|
| 1 | Bewegung -3 Meter |
| 2 | zusätzlich Nachteil auf körperliche Fertigkeitsproben |
| 3 | zusätzlich keine Reaktionen und Erholung halbiert |

Jede weitere Erschöpfungsstufe verursacht Schaden in Höhe der Erholung, statt eine zusätzliche Stufe zu erzeugen.

### 9.10 Verborgener Zustand

Verborgen ist kein globaler Zustand, sondern gilt immer relativ zu bestimmten Beobachtenden.

### 9.11 Technische Zustände

**Gestört:** Nutzung des betroffenen Geräts oder Systems hat Nachteil.

**Deaktiviert:** Das System ist bis zur Behebung nicht nutzbar.

---

## 10. Ausrüstung und Inventar

### 10.1 Waffenmerkmale

Universelle Merkmale:

- Finesse
- Reichweite
- Wurf
- Zweihändig
- Durchdringung X
- Laden
- Nichttödlich
- Verbergbar
- Fläche
- Laut
- Schwer

**Finesse:** Geschicklichkeit darf Stärke bei Nahkampfangriffen ersetzen.

**Durchdringung X:** Ignoriert X Punkte Schutz.

### 10.2 Lastpunkte

Gegenstände besitzen normalerweise 0 bis 3 Lastpunkte.

```text
Traglast = 5 + (2 × Stärke)
```

Über Traglast:

- Bewegung -3 Meter,
- Nachteil auf Athletik und Akrobatik.

Über dem Doppelten der Traglast ist normale längere Bewegung nicht möglich.

### 10.3 Ressourcenmodell

Standardmäßig verwendet SagaDrive einen abstrakten Ressourcenwert von 0 bis 5.

| Wert | Bedeutung |
|---:|---|
| 0 | mittellos |
| 1 | knapp |
| 2 | stabil |
| 3 | komfortabel |
| 4 | wohlhabend |
| 5 | institutionelle Ressourcen |

Gegenstände besitzen ebenfalls Kostenwerte 0 bis 5.

- Kosten mindestens 2 unter Ressourcenwert: routinemäßig verfügbar.
- Kosten 1 unter Ressourcenwert: normalerweise bezahlbar.
- Kosten gleich Ressourcenwert: bezahlbar, danach Ressourcenwert vorübergehend -1.
- Kosten über Ressourcenwert: benötigt Kontakt, Kredit, Beute, Projekt oder andere ausdrückliche Quelle.

Ein Weltprofil darf das abstrakte Modell vollständig durch konkrete Währung ersetzen.

### 10.4 Fahrzeuge und Größenmaßstab

| Maßstab | Beispiel |
|---:|---|
| 0 | Person |
| 1 | Fahrzeug oder schwere Maschine |
| 2 | Struktur |
| 3 | kolossales Objekt |

Gegen ein Ziel eine Maßstabsstufe größer wird Schaden nach Schutz halbiert, wenn keine Durchdringung, Anti-Fahrzeug-Wirkung oder definierte Schwachstelle verwendet wird.

Bei zwei oder mehr Maßstabsstufen Unterschied ist regulärer struktureller Schaden normalerweise unmöglich.

Fahrzeuge besitzen mindestens:

- Struktur,
- Verteidigung,
- Schutz,
- Geschwindigkeit,
- Handling,
- Crew,
- Maßstab,
- Merkmale.

Gefährliche Fahrmanöver verwenden Steuern.

---

## 11. Fähigkeiten und Archetypen

### 11.1 Fähigkeitsformat

Jede Fähigkeit definiert:

- Name,
- Quelle,
- Rang I bis V,
- Voraussetzungen,
- Aktivierungsart,
- Auslöser,
- Ziel,
- Reichweite,
- Effekt,
- Dauer,
- Ressource oder Nutzungsbegrenzung,
- Wirkungskennzeichnungen,
- Skalierung.

### 11.2 Fähigkeitsränge

| Rang | Früheste Stufe |
|---:|---:|
| I | 1 |
| II | 5 |
| III | 9 |
| IV | 13 |
| V | 17 |

Zusätzliche Investitionsanforderungen:

- Rang III: mindestens 2 niedrigere Fähigkeiten derselben Quelle.
- Rang IV: mindestens 3 niedrigere Fähigkeiten derselben Quelle.
- Rang V: mindestens 4 niedrigere Fähigkeiten derselben Quelle.

### 11.3 Kernfähigkeiten der Archetypen

#### Kämpfer – Kampfroutine

Einmal pro Zug nach einem erfolgreichen Angriff oder Kampfmanöver:

- +2 Schaden oder
- 1,5 Meter Bewegung ohne Gelegenheitsangriff.

#### Denker – Analyse

Hauptaktion; Ermitteln gegen passenden Zielwert oder Widerstand.

- Erfolg: Eine relevante mechanische Eigenschaft des Ziels oder Problems wird aufgedeckt; die nächste passende Probe eines Verbündeten erhält Vorteil.
- Kritischer Erfolg: zusätzlich +1 Momentum, höchstens einmal pro Runde durch diese Fähigkeit.

#### Heiler – Feldversorgung

Medizinisches Set, Hauptaktion, Medizin Zielwert 15.

- Erfolg: Ziel heilt Erholung.
- Kritischer Erfolg: Ziel heilt 2 × Erholung.
- Dasselbe Ziel kann diese Fähigkeit höchstens einmal pro Szene erhalten.

#### Rebell – Improvisation

Einmal pro Zug darf eine Nachteilsquelle ignoriert werden, wenn sie ausschließlich aus improvisierter Ausrüstung, ungünstiger körperlicher Position oder unvollständigem Werkzeug stammt.

Nicht anwendbar auf Verletzungen, gegnerische Kräfte, Magie oder vergleichbare externe Effekte.

#### Diplomat – Koordination

Die Figur kann Helfen innerhalb sinnvoller Kommunikationsreichweite einsetzen. Führt eine unterstützte Handlung zu einem kritischen Erfolg, entsteht +1 Momentum, höchstens einmal pro Runde durch diese Fähigkeit.

### 11.4 Geführte Archetyp-Essenz-Kombinationen

| Archetyp | Körperlich | Mental | Spirituell | Gebunden | Technologisch |
|---|---|---|---|---|---|
| Kämpfer | übermenschlicher Krieger | psionischer Duellant | heiliger Wächter | Paktchampion | Kampfanzug-/Waffenspezialist |
| Denker | biologischer Taktiker | Psion/Analyst | Seher | okkulter Forscher | Ingenieur/Hacker |
| Heiler | Feldmediziner/Biomant | mentaler Heiler | Priester/Schamane | Lebensbinder | Cybermediziner |
| Rebell | Akrobat/Mutant | Illusionist/Infiltrator | Trickster | gebundener Außenseiter | Saboteur/Hacker |
| Diplomat | charismatischer Feldführer | Telepath | spiritueller Sprecher | Gesandter | Netzwerk-/Informationsführer |

Diese Profile geben keine zusätzlichen Regeln. Sie zeigen nur mögliche Interpretationen bestehender Fähigkeiten.

---

## 12. Kräfte, Magie und Technologie

### 12.1 Einheitliches Kraftmodell

SagaDrive verwendet kein universelles Mana- oder Zauberslot-System.

Eine besondere Kraft ist eine Fähigkeit mit mindestens:

- Essenz,
- Rang,
- Effekt,
- Reichweite,
- Dauer,
- Widerstand,
- Begrenzung.

### 12.2 Aktivierungsprobe

Wenn eine Kraft eine Aktivierungsprobe verlangt:

```text
d20 + festgelegtes Attribut + Erfahrungsbonus + ausdrückliche Modifikatoren
```

Eine erschlossene Essenz zählt für diese Aktivierungsprobe als Training. Es gibt keine eigene Essenz-Fertigkeit.

### 12.3 Begrenzungsmodelle

Mögliche Begrenzungen:

- einmal pro Szene,
- Ladungen,
- Munition,
- Komponenten,
- Erschöpfung,
- Vorbereitung,
- Aufrechterhaltung,
- externe Quelle,
- Ritual.

### 12.4 Aufrechterhaltung

Eine Figur kann standardmäßig nur einen besonderen aufrechterhaltenen Effekt gleichzeitig halten. Beginnt sie einen zweiten, endet der erste, sofern eine Fähigkeit nichts anderes erlaubt.

### 12.5 Gegenwirkung

Eine direkte Gegenwirkung verwendet eine vergleichende Kraftprobe. Bei vollständigem Gleichstand bleibt der bestehende Effekt bestehen.

### 12.6 Wirkungsbudget nach Rang

Die folgenden Werte sind Designrichtlinien, keine automatische Schadensformel.

| Rang | Richtwert |
|---:|---|
| I | ein Ziel, kurze Wirkung, ungefähr d6+2 Schaden oder vergleichbarer Effekt |
| II | mehrere Ziele oder ungefähr 2d6+2 |
| III | kleine Fläche, starke Kontrolle oder ungefähr 3d6+3 |
| IV | großer taktischer Effekt oder ungefähr 4d6+4 |
| V | szenenprägender Effekt oder ungefähr 5d6+5 |

Mehr Ziele, Fläche, Reichweite, Dauer und Kontrolle verbrauchen dasselbe Wirkungsbudget. Eine Kraft soll nicht alle Dimensionen gleichzeitig maximieren.

Dauerhaft weltverändernde Effekte werden als Projekt, Ritual oder Abenteuerziel behandelt.

---

## 13. Vollständiger Stufenaufstieg

| Stufe | Entwicklung |
|---:|---|
| 1 | EB +1, Fertigkeitslimit 3, Primärarchetyp + Kernfähigkeit, primäre Essenz + erste Manifestation |
| 2 | freie Fähigkeit |
| 3 | Fertigkeitsentwicklung |
| 4 | freie Fähigkeit |
| 5 | EB +2, Fertigkeitslimit 4, Fertigkeitsentwicklung, Rang II verfügbar |
| 6 | freie Fähigkeit, zweiter Archetyp möglich |
| 7 | Fertigkeitsentwicklung |
| 8 | Attribut +1, freie Fähigkeit |
| 9 | EB +3, Fertigkeitsentwicklung, Rang III verfügbar |
| 10 | freie Fähigkeit, sekundäre Essenz möglich |
| 11 | Fertigkeitsentwicklung |
| 12 | freie Fähigkeit, dritter Archetyp möglich |
| 13 | EB +4, Fertigkeitslimit 5, Fertigkeitsentwicklung, Rang IV verfügbar |
| 14 | freie Fähigkeit |
| 15 | Fertigkeitsentwicklung |
| 16 | Attribut +1, freie Fähigkeit |
| 17 | EB +5, Fertigkeitsentwicklung, Rang V verfügbar |
| 18 | freie Fähigkeit, vierter Archetyp möglich |
| 19 | Fertigkeitsentwicklung |
| 20 | freie Fähigkeit oder Rang-V-Abschlussfähigkeit |

### 13.1 Sekundäre Essenz

Frühestens Stufe 10.

Voraussetzungen:

- erzählerischer oder weltbezogener Zugang,
- mindestens eine Rang-II-Fähigkeit, die die primäre Essenz tatsächlich verwendet.

Das Erschließen verbraucht eine freie Fähigkeitswahl und enthält eine Rang-I-Manifestation der neuen Essenz.

### 13.2 Aufstiegsmodell

Standard: Meilensteinaufstieg.

Optionales Entwicklungsmodell:

```text
4 Entwicklungspunkte = 1 Stufe
```

Richtwerte:

- Teilziel: 1 Punkt,
- bedeutendes Ziel: 2 Punkte,
- außergewöhnlicher Kampagnenmeilenstein: bis 4 Punkte.

Entwicklungspunkte werden nicht nach getöteten Gegnern vergeben.

Neue Figuren steigen auf der aktuellen Gruppenstufe ein und erhalten alle regulären Entwicklungen dieser Stufe. Es gibt keine Aufholstrafe.

---

## 14. Nicht kämpferische Spielsituationen

### 14.1 Erkundung

Ein bedeutender Erkundungsabschnitt entspricht ungefähr 10 Minuten.

Mögliche Rollen:

- Späher,
- Navigator,
- Suchender,
- Sicherung,
- Unterstützung.

Es wird nur gewürfelt, wenn tatsächliche Unsicherheit und relevante Konsequenzen bestehen.

### 14.2 Reisen

Reisen werden in sinnvolle Abschnitte von Stunden, halben Tagen oder Tagen unterteilt.

Fehlschläge verändern die Situation durch beispielsweise:

- Zeitverlust,
- Ressourcenverbrauch,
- ungünstige Position,
- Entdeckung,
- Umweltfolge.

Ein Fehlschlag erzeugt nicht bloß denselben Wurf erneut.

### 14.3 Recherche

Längere Recherche verwendet Gemeinschaftsprojekte.

Eine zwingend notwendige Information wird nicht hinter einem einzelnen Wurf verborgen. Proben bestimmen Geschwindigkeit, Tiefe, Risiko, Kosten und zusätzliche Erkenntnisse.

### 14.4 Soziale Haltung

| Haltung | Bedeutung |
|---|---|
| Feindselig | aktiv gegen die Figur |
| Reserviert | misstrauisch oder abweisend |
| Neutral | keine klare Tendenz |
| Offen | grundsätzlich zugänglich |
| Unterstützend | aktiv hilfsbereit |

Grundschwierigkeiten für Bitten:

| Bitte | Zielwert |
|---|---:|
| gering | 10 |
| bedeutend | 15 |
| riskant | 20 |
| sehr belastend | 25 |
| fundamentaler Widerspruch zum Eigeninteresse | unmöglich ohne veränderte Umstände |

Eine Haltungsstufe verschiebt die Schwierigkeit um eine Kategorie der Tabelle, nicht durch einen freien Zahlenmodifikator.

### 14.5 Längerer sozialer Konflikt

Fortschrittsziel:

- normal: 3,
- groß: 5.

| Ergebnis | Fortschritt |
|---|---:|
| Kritischer Erfolg | +2 |
| Erfolg | +1 |
| Fehlschlag | +0 und Konsequenz |
| Kritischer Fehlschlag | -1, mindestens 0, plus Komplikation |

SagaDrive verwendet keine sozialen Trefferpunkte.

### 14.6 Gefahren

Gefahren verwenden einen passenden Widerstand oder eine passende Fertigkeit gegen einen Zielwert.

| Ergebnis | Standardwirkung |
|---|---|
| Kritischer Erfolg | kein Schaden |
| Erfolg | halber Schaden |
| Fehlschlag | voller Schaden |
| Kritischer Fehlschlag | doppelter Schaden oder voller Schaden plus ausdrücklich definierte schwere Folge |

Richtwerte:

| Gefahr | Schaden |
|---|---:|
| gering | d6+1 |
| gefährlich | 2d6+2 |
| schwer | 3d6+3 |
| katastrophal | 4d6+4 oder mehr |

### 14.7 Ausfallzeit

Eine Ausfallzeitperiode kann verwendet werden für:

- Herstellung,
- Reparatur,
- Recherche,
- Training,
- Einkommen,
- Kontaktpflege,
- Behandlung,
- soziale Projekte.

Größere Herstellung und Reparatur verwenden Gemeinschaftsprojekte.

### 14.8 Kontakte

Ein Kontakt besitzt:

- Fachgebiet,
- Reichweite,
- Zuverlässigkeit 1 bis 3.

Kontakte geben Zugang, Information oder Ressourcen, aber keinen allgemeinen Würfelbonus.

### 14.9 Ruf

Ruf wird je Fraktion geführt.

| Wert | Bedeutung |
|---:|---|
| -2 | feindselig |
| -1 | misstrauisch |
| 0 | neutral |
| +1 | bekannt |
| +2 | vertraut |

Ruf verändert Zugang und Haltung, nicht automatisch Würfelwerte.

### 14.10 Verfolgungsjagden

Distanzleiste:

```text
0 = eingeholt
5 = entkommen
Start = 2
```

Jede Runde wählen beide Seiten eine plausible Fertigkeit oder Fahrhandlung und führen eine vergleichende Probe aus.

- Sieg: Distanz 1 in Richtung der siegenden Seite.
- Kritischer Erfolg gegen Fehlschlag oder schlechter: Distanz 2.
- Gleichstand: keine Veränderung.

Die Struktur gilt für Verfolgungen zu Fuß, mit Tieren, Fahrzeugen, Schiffen oder vergleichbaren Mitteln.

---

## 15. Gegner- und Spielleitungsregeln

### 15.1 Begegnungsstufen

| Band | Charakterstufen |
|---:|---:|
| I | 1–4 |
| II | 5–8 |
| III | 9–12 |
| IV | 13–16 |
| V | 17–20 |

### 15.2 Standardgegner

| Band | Angriff | Verteidigung | Gesundheit | Standardschaden |
|---:|---:|---:|---:|---:|
| I | +6 | 14 | 18 | d6+1 |
| II | +8 | 16 | 20 | d8+1 |
| III | +10 | 18 | 22 | d8+2 |
| IV | +12 | 20 | 24 | d10+2 |
| V | +14 | 22 | 26 | d10+3 |

Widerstände liegen normalerweise innerhalb von Verteidigung ±2.

Diese Werte sind verbindliche Playtestwerte und müssen in Abschnitt 19 empirisch validiert werden.

### 15.3 Gegnertypen

#### Scherge

- Verteidigung -2,
- Schaden eine Klasse niedriger,
- keine komplexen Reaktionen,
- jeder erfolgreiche Schadenseffekt von mindestens 1 besiegt den Schergen.

#### Elite

- Gesundheit ×2,
- Angriff +1,
- mindestens eine besondere Reaktion oder Fähigkeit.

#### Boss

- Gesundheit ×3,
- Verteidigung +1,
- Angriff +1,
- Schaden ungefähr eine Klasse höher,
- zwei Initiativeslots pro Runde,
- zwei Reaktionen pro Runde,
- dieselbe starke Spezialfähigkeit normalerweise höchstens einmal pro Runde,
- mindestens eine Phase, Schwäche oder taktische Veränderung.

### 15.4 Bedrohungspunkte

Innerhalb desselben Bands:

| Typ | Punkte |
|---|---:|
| Scherge | 1 |
| Standardgegner | 2 |
| Elite | 4 |
| Boss | 8 |

Gruppenbudget:

| Begegnung | Budget |
|---|---:|
| Routine | 1 × Zahl der Spielerfiguren |
| Standard | 2 × Zahl der Spielerfiguren |
| Schwer | 2,5 × Zahl der Spielerfiguren |
| Extrem | 3 × Zahl der Spielerfiguren |

Ein Gegner ein Band über der Gruppe kostet doppelt. Ein Gegner ein Band darunter kostet halbiert.

Auch diese Budgets sind Playtestwerte.

### 15.5 GM-Vorbereitung

Jede bedeutende Szene definiert mindestens:

- Ziel,
- Einsatz,
- mögliche Konsequenzen,
- relevante NSC,
- Zielwerte und Widerstände,
- verfügbare Informationen,
- mindestens einen alternativen Weg für ein zentrales Hindernis.

Der GM verändert Würfelergebnisse nicht nachträglich.

Fehlschläge erzeugen konkrete Veränderungen wie Preis, Zeitverlust, Position, Aufmerksamkeit, Verbrauch oder neue Gefahr.

---

## 16. Abenteuermodule und Weltprofile

### 16.1 Modulvertrag

Jedes Regelmodul deklariert:

- ID,
- Version,
- Zweck,
- veränderte Core-Abschnitte,
- Voraussetzungen,
- Abhängigkeiten,
- Konflikte,
- Aktivierung,
- Ersatzregeln,
- analoge Durchführung,
- optionale digitale Unterstützung.

### 16.2 Regelpriorität

Bei Konflikten gilt:

1. ausdrücklich spezifische Fähigkeit, Gegenstand oder Gefahr,
2. ausdrücklich aktives Spezialmodul,
3. Weltprofil,
4. SagaDrive Core.

Eine spezifischere Regel darf eine allgemeinere nur dort überschreiben, wo sie dies tatsächlich beschreibt.

### 16.3 Deaktivierte Drive- oder Momentum-Regeln

Wird Drive oder Momentum deaktiviert, muss jede zwingend davon abhängige Fähigkeit:

- eine explizite Ersatzbegrenzung erhalten oder
- als nicht verfügbar markiert sein.

### 16.4 Härtegrade

#### Heroisch

Bei 0 Gesundheit wird eine normale Figur nur durch einen kritischen Treffer oder ausdrücklich tödliche Gefahr Sterbend. Andernfalls ist sie stabil bei 0.

#### Standard

Regeln aus Abschnitt 8 gelten unverändert.

#### Hart

- Bei 0 Gesundheit startet eine Figur auf Sterbend 2.
- Volle Ruhe heilt nur 2 × Erholung.
- Jedes Erreichen von 0 erzeugt zusätzlich eine Wunde.
- Jede Wunde reduziert maximale Gesundheit um 2.
- Wunden werden durch Medizin und Ausfallzeit behandelt.
- Maximal drei Wunden; jede weitere verursacht stattdessen Sterbend +1.

### 16.5 Magie- und Technologiestufen

Magie und Technologie werden unabhängig bewertet.

| Stufe | Bedeutung |
|---:|---|
| 0 | nicht vorhanden |
| 1 | selten |
| 2 | etabliert, aber begrenzt |
| 3 | weit verbreitet |
| 4 | weltprägend |

---

## 17. Charaktererschaffung

Verbindliche Reihenfolge:

1. Weltprofil und aktive Module bestimmen.
2. Figurenkonzept festlegen.
3. Wesenart und Wesenartmerkmale wählen.
4. Hintergrund wählen.
5. Primärarchetyp wählen.
6. Primäre Essenz wählen.
7. Attribute verteilen.
8. Hintergrund-Fertigkeitspunkte anwenden.
9. Archetyp-Fertigkeitspunkt anwenden.
10. Freie Fertigkeitspunkte verteilen.
11. Spezialisierung wählen.
12. zusätzliche Sprache oder Kommunikationsform wählen.
13. Archetyp-Kernfähigkeit und erste Essenzmanifestation wählen.
14. abgeleitete Werte berechnen.
15. Startausrüstung und Ressourcen bestimmen.
16. Kontakt und charakterbezogene Komplikation festhalten.
17. Drive auf 3 setzen.
18. Gruppen-Momentum auf 0 setzen.
19. Fertigkeitsgrenzen, Voraussetzungen und Merkmalsbudget prüfen.

---

## 18. Referenzen und Systementsprechungen

Die folgenden Systeme dienen nur als Orientierung für bekannte Spielkonzepte. SagaDrive übernimmt deren Regeln nicht automatisch.

### 18.1 Dungeons & Dragons

Ähnliche Orientierungspunkte:

- sechs breite Attribute,
- Training/Kompetenzbonus,
- 20 Charakterstufen,
- Aktions- und Reaktionsrhythmus.

Wesentliche Unterschiede:

- keine getrennten Klassenstufen,
- keine allgemeine Bonusaktion,
- kleinerer Erfahrungsbonus,
- vier Erfolgsgrade,
- Rüstung primär als Schadensminderung statt reine Treffervermeidung.

### 18.2 Pathfinder 2e

Ähnliche Orientierungspunkte:

- d20 + Werte gegen Zielwert,
- vier Erfolgsgrade,
- ±10 für kritische Ergebnisse,
- natürliche 20 und 1 verschieben den Erfolgsgrad,
- statische Widerstände.

SagaDrive verwendet bewusst weniger Bonusarten und eine einfachere Aktionsökonomie.

### 18.3 Das Schwarze Auge

DSA dient vor allem als Kontrast für detaillierte Fertigkeitsmodelle. SagaDrive verwendet keine dreifache Attributsprobe und keine vergleichbar kleinteilige allgemeine Kompetenzverwaltung.

### 18.4 Savage Worlds

Relevant ist die Idee eines universellen Kernsystems mit Weltanpassungen und Metaressourcen. SagaDrive verwendet jedoch seine eigene d20-Auflösung, Erfolgsgrade, Progression und Konfliktstruktur.

### 18.5 Begriffsentsprechungen

| SagaDrive | Allgemeine Entsprechung |
|---|---|
| Attribut | grundlegende Eigenschaft |
| Fertigkeit | erlernte Kompetenz |
| Spezialisierung | enges Fachgebiet |
| Archetyp | funktionale Charakterausrichtung |
| Hintergrund | Herkunft und soziale Einbindung |
| Wesenart | körperliche/strukturelle Speziesmerkmale |
| Essenz | Wirkprinzip besonderer Fähigkeiten |
| Drive | persönliche Metaressource |
| Momentum | gemeinsame Gruppenressource |
| Erfahrungsbonus | stufenabhängiger allgemeiner Kompetenzbonus bei Training |

---

## 19. Mathematische Prüfung und Spieltests

**Status: laufende Validierungsphase**

Die Regelarchitektur der Abschnitte 1 bis 18 ist beschlossen. Die dort enthaltenen Zahlen gelten bis zum Nachweis eines Problems als aktuelle Playtestwerte.

### 19.1 Bereits rechnerisch plausibilisierte Grundwerte

Für typische Gesamtboni wurden die Erfolgswahrscheinlichkeiten der Kernprobe geprüft.

Beispiele ohne Vorteil/Nachteil:

| Gesamtbonus | ZW 15 | ZW 20 | ZW 25 | ZW 30 |
|---:|---:|---:|---:|---:|
| +5 | 55 % | 30 % | 5 % | 5 % |
| +10 | 80 % | 55 % | 30 % | 5 % |
| +15 | 95 % | 80 % | 55 % | 30 % |

Eine Grundchance von 55 % wird durch Vorteil auf ungefähr 79,75 % erhöht und durch Nachteil auf ungefähr 30,25 % reduziert.

Daraus folgt für die Validierungsfassung:

- keine zusätzlichen spontanen situativen Zahlenboni,
- Vorteil/Nachteil bleibt das primäre situative Werkzeug,
- Spezialisierung +2 bleibt ein klar begrenzter, ausdrücklicher Bonus.

### 19.2 Bereits durch Designreview geprüft

Drei interne Reviewzyklen wurden vor Eintritt in die Validierungsphase durchgeführt.

#### Review 1 – Konsistenz

Geprüft und vermieden wurden unter anderem:

- zusätzliche Attribute,
- eigene Essenz-Fertigkeit,
- allgemeine Wesenart-Attributsboni,
- Klassenstufen,
- dynamische Schwierigkeitsanpassung,
- freie situative Zahlenmodifikatoren,
- versteckte Abhängigkeit von Drive oder Momentum.

#### Review 2 – Grundmathematik

Vorläufig plausibel:

- Zielwertkurve in 5er-Schritten,
- Verteidigung mit Erfahrungsbonus,
- Rüstung als Schadensminderung,
- bewusst langsames Gesundheitswachstum,
- reduzierte Begegnungsbudgets gegenüber aggressiveren Erstentwürfen.

#### Review 3 – Spielbarkeit und Einfachheit

Bewusst nicht Bestandteil des Core:

- allgemeine Bonusaktionen,
- universelles Mana oder Zauberslots,
- soziale Trefferpunkte,
- getrennte Recherche-, Herstellungs- und Ritualgrundsysteme,
- allgemeine Flanken- oder Höhenboni,
- Tabellen freier situativer Zahlenmodifikatoren,
- dynamische Stufenskalierung der Welt,
- Punkteerstattung durch Wesenartnachteile,
- weltabhängige Aufsplittung der 18 Kernfertigkeiten,
- getrennte Magie- und Technologie-Auflösung,
- negative Gesundheit,
- zusätzliche Belastbarkeitsfertigkeit,
- zahlreiche passive Fertigkeitswerte.

### 19.3 Verpflichtende Validierung

Vor endgültiger Freigabe müssen mindestens praktisch oder mathematisch geprüft werden:

- Erfolgswahrscheinlichkeiten aller typischen Attribut- und Fertigkeitskombinationen,
- Erfahrungsbonus über alle Stufenbereiche,
- Spezialisierungsbonus +2,
- Vorteil und Nachteil über relevante Zielwerte,
- Sicherheitswert 10,
- Widerstände,
- Kompetenzunterschiede zwischen Stufenbereichen,
- Kampfwerte und erwartete Kampfdauer,
- Begegnungsbudgets für unterschiedliche Gruppengrößen,
- Schergen-, Elite- und Bossregeln,
- Boss-Aktionsökonomie,
- Schadens- und Heilungskurven über mehrere Konflikte,
- Rüstung und Durchdringung,
- Sterben und Stabilisierung,
- Drive und Momentum,
- Spielbarkeit ohne Drive,
- Spielbarkeit ohne Momentum,
- Primär- und Sekundärarchetypen,
- sekundäre Essenzen,
- Kräfte der Ränge I bis V, insbesondere III bis V,
- Gemeinschaftsprojekte,
- soziale Konflikte,
- Verfolgungsjagden,
- analoge Spielbarkeit ohne digitale Berechnungen.

### 19.4 Vorläufige Gegner-Simulation

Eine vereinfachte Vorprüfung für Band I ohne Kräfte, Gelände, Zustände und Momentum ergab als groben Proxy für vier Spielerfiguren:

- 4 Standardgegner: ungefähr 5 Runden Median, sehr geringe Niederlagenquote,
- 5 Standardgegner: spürbar gefährlicher,
- 6 Standardgegner: bereits deutlich hohe Niederlagengefahr,
- 7 bis 8 Standardgegner: für eine normale Begegnung zu tödlich.

Diese vereinfachte Simulation war der Grund, das Extreme-Budget auf 3 × Spielerzahl zu begrenzen. Sie ersetzt keinen vollständigen Spieltest.

### 19.5 Änderungsregel während der Validierung

Ein Core-Wert wird nur geändert, wenn mindestens einer der folgenden Gründe dokumentiert werden kann:

1. mathematischer Grenzfall oder systematischer Wahrscheinlichkeitsfehler,
2. reproduzierbares Problem in Spieltests,
3. Regelwiderspruch zwischen zwei Core-Abschnitten,
4. unnötige Komplexität ohne spielerischen Mehrwert,
5. fehlende analoge Durchführbarkeit.

Änderungen werden mit vorherigem Wert, neuem Wert, Begründung und betroffenen Abschnitten im Änderungsverlauf festgehalten.

---

## 20. Abschlusskriterien

Die SagaDrive Core Rules gelten als final validiert, wenn:

- alle Regeln der Abschnitte 1 bis 18 ohne bekannte interne Lücke funktionieren,
- alle 18 Fertigkeiten praktisch eingesetzt wurden,
- Charaktererschaffung und Stufenaufstieg lückenlos funktionieren,
- Konflikt, Schaden, Heilung und Tod getestet wurden,
- Ausrüstung und besondere Kräfte in mehreren Weltarten funktionieren,
- Gegner und Herausforderungen konsistent erstellt werden können,
- Schergen, Standardgegner, Eliten und Bosse getestet wurden,
- Kräfte mindestens der Ränge I, III und V praktisch getestet wurden,
- optionale Module ihre Abhängigkeiten deklarieren,
- mathematische Grenzfälle geprüft wurden,
- mehrere vollständige Testspiele dokumentiert wurden,
- mindestens ein Test ohne Drive oder Momentum durchgeführt wurde,
- Begriffslexikon, Referenztabellen und Schnellreferenz vorhanden sind,
- die Regeln analog ohne SagaDrive-Anwendung spielbar sind.

---

## Änderungsverlauf

| Datum | Stand |
|---|---|
| 26.08.2026 | Regelentwurf der zuvor offenen Abschnitte 2 bis 18 nach drei Reviewzyklen vollständig als verbindliche Validierungsfassung übernommen. Abschnitt 19 ist jetzt der aktive Arbeitsblock. Zahlenwerte sind verbindliche Playtestwerte, aber noch nicht endgültig empirisch validiert. |
| 26.08.2026 | Athletik als umweltbezogene Bewegungs- und Kraftfertigkeit festgelegt; Kampfmanöver bleiben bei Nahkampf. Fortsetzungspunkt auf Akrobatik gesetzt. |
| 26.08.2026 | Erster konsolidierter Entwurf. Verbindliche Entscheidungen aus den Blöcken 1 bis 5.7 übernommen. Offene Regelbereiche und Fortsetzungspunkt ergänzt. |