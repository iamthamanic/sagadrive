# Composition Gate — attribute-bonus-progression-stacked

- HEAD_SHA: d8fac069bb0025f0dbb27a16c70da883949be354
- BASE_SHA: 270093380b432f64828d4a804e3acc59dab0a48f
- Date: 2026-09-01
- Verdict: CLEAR

## Event
Ein Spieler verteilt die Stufe-1-Attributboni eines SagaDrive-Charakters, ergänzt bei Stufe 8 bzw. 16 die permanenten Steigerungsquellen und speichert einen konsistenten finalen Attributsatz samt rekonstruierbarer Herkunft.

## Hop chain
`characterCreation.ts` + Core-Regeln (15 Start-Bonuspunkte, +0…+4, Stufe 8/16 je +1, finales Cap +5) → `attributeProgression.ts` → `CharacterEditor` (`baseAttributes` + `attributeAdvancements`) → `CharacterAttributeBonusPanel` → `getSagaDriveFinalAttributeBonuses` → abgeleitete Werte / Archetyp / Inventar / Lore-Kontext → `attributes` + `sagadrive_profile.attributeProgression` im Save-Payload → `character.service.ts` Normalisierung → Supabase-Character.

Der Hintergrund-Slice aus dem Stack-Base bleibt unverändert: Framework → 4er-Pool → 2 Trainings → Spezialisierung → `sagadrive_profile`. Attribut-Bonuspunkte konvertieren weder Hintergrund- noch Fertigkeitspunkte und erzeugen keinen Queue-, Worker-, Webhook- oder sonstigen mehrfach ausführbaren Side Effect.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Mehrere Charaktere verteilen ihre Boni unabhängig; jeder Save betrifft genau den eigenen Charakter. | Startboni, Meilensteinquellen und Fertigkeitspunkte liegen im lokalen State der jeweiligen Editorinstanz. Regelkataloge sind read-only; der einzelne `createCharacter`-Payload betrifft nur diese Figur. Keine globale Mutation oder Fan-out-Kette. | pass |
| Invalid/missing | Ungültiges Startbudget, fehlende fällige Meilensteine, unbekannte Source-Keys oder Werte über dem Cap dürfen nicht als anderer gültiger Build gespeichert werden. | `isValidSagaDriveAttributeProgression` blockiert ungültige Builds vor Save. Die UI verhindert Overspend und Cap-Überschreitungen. `normalizeAttributeProgression` verwirft ungültige Source-Metadaten; Legacy-Profile ohne neue Metadaten bleiben über die separat gespeicherten finalen `attributes` lesbar. | pass |
| Two consumers / crash | Alle Verbraucher müssen denselben finalen Attributsatz verwenden; ein fehlgeschlagener Save darf keine teilweise Progression hinterlassen. | `getSagaDriveFinalAttributeBonuses` erzeugt einen finalen Attributsatz für Derived Stats, Archetyp, Inventar, Lore und Save. `attributeProgression` speichert die Herkunft desselben Werts. Es gibt keinen zweiten asynchronen Consumer; ein fehlgeschlagener Insert setzt keine Saved-ID und erzeugt keinen weiteren Side Effect. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| none | — | — | — | — |

## Skip reason
n/a
