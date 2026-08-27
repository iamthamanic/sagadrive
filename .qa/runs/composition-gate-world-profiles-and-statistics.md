# Composition Gate — world-profiles-and-statistics

- HEAD_SHA: af976d999d7c598dba71d988ceba1a9a47dafdb6
- BASE_SHA: a409fbeb36a5bee0c76e055d7b15ffee1d90505f
- Date: 2026-08-27
- Verdict: CLEAR

## Event
(1) Ein Owner erstellt/bearbeitet ein Weltprofil inkl. Modul `species-development` in der Bibliothek. (2) Ein gespeicherter Charakter öffnet Statistik: Memberships syncen zu `character_adventure_arcs`, Developments werden angehängt; Notizen bleiben am Character-Save unter Hintergrund.

## Hop chain
**Welten:** `worldModuleRegistry` → `WorldProfileEditorDialog` → `useWorldProfiles` → `worldProfileService` → `world_profiles` (migration `008`, owner RLS) → Library-Tab Welten.

**Statistik/Notizen:** `project_members.character_id` → `characterAdventureArcService.listArcsForCharacter` (upsert fehlender Arcs) → `CharacterStatisticsPanel` → `appendDevelopment` (JSONB) → Reload. Parallel: `CharacterNotesSection` → `CharacterEditor.handleSaveCharacter` → `characters.notes`.

No queue/worker/outbox hop.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Weltprofile und Character-Arcs bleiben owner-scoped; kein Fan-out zwischen Benutzern. | `world_profiles.owner_user_id` und Arc-RLS über Character-Owner; Writes nur über authentifizierte Owner-Pfade. | pass |
| Invalid/missing | Leerer Weltname / leerer Development-Titel / unsaved character erzeugen keinen Crash-Write. | UI+Service blockieren leere Namen; Statistik zeigt Save-first ohne Service-Call; `appendDevelopment` rejected ungültige Payloads. | pass |
| Two consumers / crash | Doppeltes Arc-Load und erneutes Welt-Lesen dürfen keine Duplikate/Umdeutungen erzeugen. | UNIQUE(character_id, project_id) + Ignore `23505`; Module/Developments sind keyed/array-replace; Reads idempotent. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| identity: `world` vs `WorldProfile` | flag | Library → persistence | Legacy `world` edge function / `world_graphs` exist already. | done: neue Entität `WorldProfile` / Tabelle `world_profiles`. |
| — | — | Statistik | — | done: separate table `character_adventure_arcs`, migration `009`. |

## Skip reason
n/a

## Notes
- Combined PR: Weltprofile (008) + Character-Statistik/Notizen (009) auf Basis von `main` nach #42.
- Character Editor liest Weltprofile in v1 noch nicht; Weitere-Auswahl-Hint erklärt nur das Modul textuell.
- v1 schreibt Arc-Developments nur über das Statistik-Formular.
- Security harden (review): INSERT requires active membership; `character_id`/`project_id` immutable via trigger.
