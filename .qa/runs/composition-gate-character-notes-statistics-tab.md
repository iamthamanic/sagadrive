# Composition Gate — character-notes-statistics-tab

- HEAD_SHA: a36ad70b79153575b5d2f52482fec77c57876183
- BASE_SHA: a409fbeb36a5bee0c76e055d7b15ffee1d90505f
- Date: 2026-08-27
- Verdict: CLEAR

## Event
Ein gespeicherter Charakter öffnet den Statistik-Tab: Memberships werden in `character_adventure_arcs` gesynct, Entwicklungs-Einträge werden an einen Bogen angehängt und nach Reload wieder gelesen. Notizen bleiben Teil des Character-Saves unter Hintergrund.

## Hop chain
`project_members.character_id` (aktive Memberships) → `characterAdventureArcService.listArcsForCharacter` upsertet fehlende Arcs (`active`, `started_at = joined_at`) und lädt bestehende Bögen inkl. Projektname/Session-Count → `CharacterStatisticsPanel` rendert Timeline → `appendDevelopment` liest Arc, appendet JSONB-`developments`, schreibt zurück → Reload über denselben List-Pfad. Parallel: `CharacterNotesSection` → `CharacterEditor.handleSaveCharacter` → `characterService.createCharacter` persistiert `characters.notes` (unverändertes Feld).

No queue/worker/outbox hop.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Jeder Charakter erhält nur Bögen für seine eigenen Memberships; ein Development landet in genau einem Arc desselben Owners. | Sync filtert `character_id`; Insert/Update laufen unter Owner-RLS auf `character_adventure_arcs`. Kein Fan-out. | pass |
| Invalid/missing | Leerer Titel / ungültiges Kind / unsaved character erzeugen keinen Schreibfehler-Crash. | Panel zeigt Save-first ohne Service-Call; `appendDevelopment` rejected leeren Titel und ungültiges Kind vor Update. | pass |
| Two consumers / crash | Doppeltes Load (unique race) und erneutes Lesen dürfen Arcs nicht verdoppeln oder Developments verlieren. | UNIQUE(character_id, project_id) + Ignore auf `23505`; Developments werden als vollständige Array-Replace geschrieben; Read-Normalisierung ist idempotent. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | Keine offenen Flags nach Sync-/RLS-/Notes-Prüfung. | done |

## Skip reason
n/a

## Notes
- Migration `009_character_adventure_arcs.sql` (Nummer bewusst nach World-Profile-`008` auf dem anderen Branch).
- v1 schreibt Developments nur über das Statistik-Formular; Auto-Log aus Level-up ist out of scope.
- Unsaved Charakter: Statistik bleibt clientseitig ohne DB-Call.
