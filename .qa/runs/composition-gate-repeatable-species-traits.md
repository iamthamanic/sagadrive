# Composition Gate — repeatable-species-traits

- HEAD_SHA: 25aa99d650c7ddbc478934e0b6bcb8372f4e8fef
- BASE_SHA: 65e2483d4b99dd84eb529064afc0cf8bddf23b9a
- Date: 2026-08-27
- Verdict: CLEAR

## Event
Eine Figur wählt eine oder mehrere Speziesmerkmal-Instanzen mit festen Core-Unteroptionen, speichert den Charakter und erhält beim erneuten Laden dieselben Instanzen ohne automatische zusätzliche Merkmale durch die Charakterstufe.

## Hop chain
`speciesTraitOptions.ts` definiert stabile Trait-spezifische Options-Keys und Beschreibungen → `SpeciesTraitsPanel` / `SpeciesTraitOptionItem` erzeugen getrennte Merkmalsinstanzen, erklären Optionen am Dropdown-Eintrag und verhindern identische Unteroptionen desselben Traits bei festem 3-Punkte-Budget → `CharacterEditor` validiert Allowlist, Verfügbarkeit, Budget und eindeutige Unteroptionen und schreibt `speciesTraitInstances` mit `source: species-creation` sowie `acquiredAtLevel: 1` → `characterService.createCharacter` normalisiert die Instanzen und persistiert sie im bestehenden `characters.sagadrive_profile` JSONB → `mapToViewModel` normalisiert beim Lesen sowohl das neue Instanzformat als auch Legacy-`speciesTraits`/`speciesTraitDetails` → der Character Editor kann die kanonischen Instanzen wiederverwenden, ohne ihre Identität umzudeuten.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Zehn unabhängig erstellte Charaktere speichern jeweils nur ihre eigenen gewählten Speziesinstanzen; eine Auswahl erzeugt genau eine Instanz in genau diesem Charakterprofil. | Zustand liegt lokal im jeweiligen Editor; der explizite Character-Save schreibt genau ein owner-scoped Charakterprofil. Es gibt keinen Fan-out, Worker oder globalen Trait-Zustand. | pass |
| Invalid/missing | Leere Pflichtoptionen, doppelte Unteroptionen, unzulässige Traits oder ein Budget ungleich 3 dürfen keinen vollständigen Charakter erzeugen. | UI blockiert doppelte Unteroptionen bereits im zweiten Dropdown; `CharacterEditor` validiert zusätzlich Trait-Allowlist, Verfügbarkeit, kanonische Option und exaktes 3-Punkte-Budget vor dem Save. | pass |
| Two consumers / crash | Wiederholtes Rendern, erneutes Laden oder ein zweiter Leser darf keine Traits duplizieren oder verlieren; Legacy-Daten müssen deterministisch gelesen werden. | Persistenz erfolgt nur beim expliziten Save. Die Read-Normalisierung ist idempotent, dedupliziert nicht wiederholbare Traits bzw. identische `(trait, option)`-Paare und erhält nicht zuordenbaren Legacy-Freitext als `legacyDetail`, statt ihn still zu verwerfen. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | Keine offenen Flags nach Persistenz- und Options-Tooltip-Prüfung. | done |

## Skip reason
n/a

## Notes
- Das Charakterlevel verändert `SAGA_DRIVE_SPECIES_TRAIT_BUDGET` nicht; Start-Speziesinstanzen werden unabhängig von der gewählten Zielstufe mit Erwerbsstufe 1 gespeichert.
- Per-Option-Tooltips (`SpeciesTraitOptionItem`) ändern nur die Erklärungs-UI; die gespeicherten Options-Keys und die Hop-Kardinalität bleiben unverändert.
- `Geschärfter Sinn`, `Enge Resistenz`, `Umweltanpassung`, `Erweiterte Sicht` und `Extremumwelt` sind wiederholbar; dieselbe Unteroption desselben Merkmals bleibt eindeutig.
