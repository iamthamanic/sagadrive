# Composition Gate — background-frameworks

- HEAD_SHA: 647712d5859cf440170699b03c3850f01b3cb716
- BASE_SHA: 4fde896761678bedba45b7f555a09835fb392953
- Date: 2026-08-31
- Verdict: CLEAR

## Event
Eine Character-Editor-Nutzung wählt genau ein Hintergrund Framework; dessen Core-Pool und Empfehlungen werden in denselben Character-State übernommen, aus dem Training, Spezialisierung und der persistierte konkrete Hintergrund entstehen.

## Hop chain
`src/modules/rulesets/backgroundTemplates.ts` (Framework-Katalog) → `BackgroundCarousel.tsx` (Auswahl/Label) → `CharacterBackgroundPanel.tsx` (Pool-Nodes, Training, Spezialisierung) → bestehende CharacterEditor-Callbacks/State → bestehender Character-Save mit konkretem `background` und `backgroundTemplateId`.

Es gibt keinen neuen Backend-, Queue-, Worker-, Webhook- oder Fan-out-Hop. Die Framework-ID liefert nur die geführte Vorlage; konkrete Pool-Skills, Trainings, Spezialisierung und Welt-Verankerung bleiben die gespeicherten Charakterentscheidungen.

## Simulations
| Case | Intended | Composed | Result |
|---|---|---|---|
| N-actors | 1 Framework-Auswahl verändert genau den aktuell bearbeiteten Charakter; 10 Nutzer/Charaktere erzeugen 10 voneinander getrennte lokale Auswahlzustände. | Keine gemeinsame Side-Effect- oder Fan-out-Strecke; jeder Editor übernimmt nur das ausgewählte Framework in seinen eigenen State. | pass |
| Invalid/missing | Ungültige neue Framework-Definitionen dürfen nicht starten; bestehende sechs Legacy-Schlüssel müssen weiter aufgelöst werden; unbekannte/fehlende Auswahl darf keine andere gültige Vorlage stillschweigend wählen. | Katalogvalidierung prüft Skills, Empfehlungen, Spezialisierungen, Beispiele und doppelte Namen; die sechs Legacy-IDs bleiben erhalten; `getSagaDriveBackgroundTemplate` gibt bei unbekannter ID `undefined` statt eines fremden Fallback-Frameworks zurück. | pass |
| Two consumers / crash | Zweites Rendern, zweiter Browser oder Abbruch zwischen Auswahl und Speichern darf keine Duplikate oder fremde Charakterdaten erzeugen. | Auswahl ist lokaler React-State; Persistenz erfolgt erst über den bestehenden Character-Save. Es existiert kein Consumer/Worker und kein asynchroner Claim, der doppelte oder verlorene Side-Effects erzeugen könnte. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|---|---|---|---|---|
| none | note | n/a | Die automatische Gate-Heuristik markiert den Diff wegen `domain:rulesets` + `domain:characters`; die manuelle Hop-Prüfung zeigt jedoch nur einen synchronen Katalog→UI→State-Pfad ohne neue Side-Effects. | n/a |

## Skip reason
n/a — der Diff überschreitet zwei Domain-Zonen, daher wurde die Komposition vollständig geprüft statt übersprungen.
