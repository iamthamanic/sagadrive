# Composition Gate — background-training-selection

- HEAD_SHA: dfa29cbcae1700dcd1bf2ded9e68d41457831e92
- BASE_SHA: dea1502ddef740ace9646a48a98838fbebcd131f
- Date: 2026-09-01
- Verdict: CLEAR

## Event
Ein Spieler wählt ein Hintergrund Framework, entscheidet sich für genau zwei der vier Pool-Fertigkeiten und kann diese Auswahl später über `Auswahl ändern` bearbeiten, ohne dass Framework-Vorgaben die Trainings automatisch setzen.

## Hop chain
`backgroundTemplates.ts` (vier setting-neutrale Pool-Skills, kein `recommendedTraining`-Feld) → `getSagaDriveBackgroundTemplate` (liefert das unveränderte Framework-Modell) → `CharacterEditor` (setzt `backgroundTraining` beim Framework-Wechsel direkt auf `['', '']`) → `CharacterBackgroundPanel` (4 Pool-Nodes während Auswahl/Bearbeitung, 2 trainierte Nodes nach Abschluss) → bestehendes `sagadrive_profile`-Save-Payload mit konkreten Pool-/Training-/Spezialisierungswerten → Reload/Editor-UI.

Die Framework-Icons bleiben reine Präsentation über stabile Framework-IDs. Dieser Slice fügt keinen Queue-, Worker-, Webhook-, Netzwerk- oder sonstigen Side-Effect-Hop hinzu.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Mehrere Charaktere/Editor-Instanzen wählen ihre zwei Trainings unabhängig; es gibt keinen globalen oder Framework-weiten Auto-Write. | Trainings liegen im jeweiligen CharacterEditor-State und werden als konkrete Charakterwerte gespeichert. Die Framework-Daten liefern ausschließlich den Vierer-Pool; der Parent setzt den neutralen Startzustand lokal. | pass |
| Invalid/missing | Fehlendes Framework, unvollständiger Custom-Pool oder weniger als zwei Trainings darf nicht still als gültiger Build erscheinen. | Ohne vollständigen Pool bleibt der Graph gesperrt; 0/2 und 1/2 bleiben offen. Framework-Wechsel setzt Training und Spezialisierung direkt im Editor zurück; ein unbekanntes Framework fällt in den bestehenden neutralen Reset-Pfad. | pass |
| Two consumers / crash | Es gibt keinen asynchronen Consumer, der dieselbe Auswahl doppelt anwenden kann. Ein Reload soll nur gespeicherte konkrete Werte rekonstruieren. | Der 4-vs-2-Ansichtsmodus ist nur lokaler UI-State. Persistiert werden weiterhin die konkreten Trainings; ein Abbruch vor Save erzeugt keinen externen Side Effect. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| none | — | — | — | — |

## Skip reason
n/a
