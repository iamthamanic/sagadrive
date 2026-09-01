# Composition Gate — attribute-bonus-progression

- HEAD_SHA: a518bcee96e9aae602245822d6ce9c97c95f4deb
- BASE_SHA: dea1502ddef740ace9646a48a98838fbebcd131f
- Date: 2026-09-01
- Verdict: CLEAR

## Event
Ein Spieler erstellt einen SagaDrive-Charakter, verteilt die dauerhafte Stufe-1-Attributbasis, wendet bei höherer Zielstufe die fälligen Attributssteigerungen an und speichert sowohl die finalen Attributboni als auch deren Herkunft zusammen mit den bereits vorhandenen Hintergrund- und Fertigkeitsquellen.

## Hop chain
`characterCreation.ts` + `docs/sagadrive core rules.md` (15 Start-Bonuspunkte, Startcap +4, Meilensteine Stufe 8/16, finales Cap +5) → `attributeProgression.ts` (Budget-/Milestone-/Cap-Validierung) → `CharacterEditor` (`baseAttributes` + `attributeAdvancements` als getrennte Sources) → `CharacterAttributeBonusPanel` (d20-Formel, +0…+4, Preset, Stufe-8-/Stufe-16-Auswahl) → `getSagaDriveFinalAttributeBonuses` (ein finaler Attributsatz) → abgeleitete Werte / Archetyp-Verbraucher / Inventar / Lore-Kontext → Save-Payload mit finalem `attributes` plus `sagadrive_profile.attributeProgression` → `character.service.ts` normalisiert die neue Source-Struktur und lässt Legacy-Profile ohne sie weiterhin lesbar → Supabase `characters`-Datensatz.

Der im PR-Bereich enthaltene vorherige Hintergrund-Slice bleibt unverändert in seiner bereits bewiesenen Kette `Framework → 4er-Pool → 2 Trainings → Spezialisierung → sagadrive_profile`; die neue Attributstruktur konvertiert weder Hintergrund- noch Fertigkeitspunkte und erzeugt keinen Queue-, Worker-, Webhook- oder sonstigen mehrfach ausführbaren Side Effect.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Zehn gleichzeitig erstellte Charaktere besitzen jeweils eigene 15-Punkte-Basis, eigene Meilensteinquellen und eigene 10 Fertigkeitspunkte; eine Verteilung darf keinen anderen Charakter oder Framework-Katalog verändern. | Sämtliche Verteilungen liegen im lokalen `CharacterEditor`-State und werden genau im jeweiligen `createCharacter`-Payload gespeichert. Regelkataloge sind read-only; es gibt keinen globalen Mutation-Hop und keine Fan-out-Side-Effects. | pass |
| Invalid/missing | Weniger/mehr als 15 Startpunkte, Startwert >+4, fehlende fällige Meilensteinwahl, unbekannter persistierter Attribut-Key oder finaler Wert >+5 dürfen nicht still in einen anderen gültigen Build umgedeutet werden. | `isValidSagaDriveAttributeProgression` blockiert Save bei falschem Budget, fehlenden Meilensteinen und Cap-Verletzung; die UI verhindert Overspend/Cap-Optionen. `normalizeAttributeProgression` verwirft ungültige Source-Metadaten statt Ziele umzudeuten. Final gespeicherte `attributes` bleiben separat lesbar. | pass |
| Two consumers / crash | Abgeleitete Werte und Persistenz müssen denselben finalen Attributsatz sehen; ein abgebrochener Save darf keine doppelte oder teilweise externe Progression erzeugen. | `getSagaDriveFinalAttributeBonuses` erzeugt einmal pro Render-State die finalen Attribute, die an Derived-Stats, Archetyp, Inventar, Lore und Save weitergereicht werden. `attributeProgression` speichert nur die Zerlegung desselben Werts. Es gibt keinen asynchronen Consumer/Outbox; schlägt der einzelne Insert fehl, wird kein `savedCharacterId` gesetzt und es existiert kein zweiter Side-Effect-Hop. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| none | — | — | — | — |

## Skip reason
n/a
