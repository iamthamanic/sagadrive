# Composition Gate — world-profiles-modules

- HEAD_SHA: 55422560d38ee553efb9416b9b0a5c40216eb6e2
- BASE_SHA: 72fd3af61c2e133f91182f204ace22c4464dd143
- Date: 2026-08-27
- Verdict: CLEAR

## Event
Ein Benutzer erstellt oder bearbeitet ein owner-scoped Weltprofil und setzt dessen Weltmodul `species-development`, ohne dass diese Konfiguration bereits Charaktere oder Abenteuer verändert.

## Hop chain
`worldModuleRegistry.ts` definiert stabile Modul-/Setting-IDs und fail-safe Defaults → `WorldProfileEditorDialog` löst Registry-Einstellungen generisch auf und patcht nur den bekannten Modulwert → `useWorldProfiles` bindet die Operation an den aktuell authentifizierten Benutzer → `worldProfileService` validiert Name, normalisiert bekannte Module unter Erhalt unbekannter Modulkeys und schreibt `world_profiles` → Migration `008_world_profiles.sql` erzwingt owner-scoped RLS → erneutes Lesen normalisiert bekannte Werte deterministisch → Bibliothek zeigt die gespeicherte Welt und den effektiven Speziesentwicklungsmodus.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Zehn Benutzer können jeweils eigene Weltprofile mit unabhängigen Modulkonfigurationen besitzen; keine Welt darf in einen anderen Owner-Kontext fan-outen. | Jeder CRUD-Pfad filtert auf `owner_user_id`; die Datenbank erzwingt zusätzlich SELECT/INSERT/UPDATE/DELETE gegen `auth.uid()`. Es existiert kein Worker, Broadcast oder globaler World-Config-State. | pass |
| Invalid/missing | Leerer Name darf nicht gespeichert werden; fehlender oder unbekannter `species-development.mode` darf nicht versehentlich reguläre Progression aktivieren; unbekannte zukünftige Module dürfen beim Bearbeiten nicht verschwinden. | UI und Service blockieren leere Namen, die DB besitzt zusätzlich einen Trim-Check. Registry/Normalizer fallen bei ungültigem bekannten Modus auf `explicit` zurück. Der Normalizer kopiert unbekannte Modulkeys und unbekannte Settings weiter. | pass |
| Two consumers / crash | Wiederholtes Lesen oder zwei Clients dürfen Modulwerte nicht duplizieren/umdeuten; ein abgebrochener Client-Save darf keinen zweiten Side Effect erzeugen. | Weltprofile werden nur über explizite CRUD-Operationen gespeichert. Reads sind idempotent, Module sind keyed Records statt Append-Listen, und es gibt keine Queue/Outbox/Side-Effect-Kette. Der letzte erfolgreiche owner-scoped DB-Write ist der gespeicherte Zustand. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| identity: `world` vs. `WorldProfile` | flag | Library → persistence → bestehende World-Funktion | Im Repo existiert bereits eine projektgebundene `world`-Edge-Function und `world_graphs`; ein generisches neues `worlds`-Modell hätte zwei Bedeutungen unter demselben Namen erzeugt. | done: neue Library-/Regelentität heißt intern `WorldProfile` und persistiert in `world_profiles`; bestehende `projects.world_id`, `world_graphs` und `supabase/functions/world` bleiben unberührt. |
| reinterpret: fehlender Modulwert | flag | Persistenz → Registry → UI | Ein fehlender oder unbekannter Modus könnte sonst zwischen Clients unterschiedliche Bedeutung bekommen. | done: stabiler Registry-Default `explicit`; `progressive` wird nur bei explizit gültigem Wert aktiv. |

## Skip reason
n/a

## Notes
- Der Welt-Branch enthält den aktuellen Stand von `feat/species-traits-by-species` bis `72fd3af61c2e133f91182f204ace22c4464dd143`; die fünf nach Branch-Erstellung hinzugekommenen Spezies-QA/UI-Commits wurden ohne Konflikt nachgezogen.
- Dieses Ticket erzeugt bewusst keine Adventure↔World- oder Character↔World-Verknüpfung.
- Der Character Editor liest `world_profiles` noch nicht und behält daher exakt sein bestehendes Speziesverhalten.
- `Progressiv` ist in dieser Ausbaustufe eine Weltregel-Konfiguration, aber noch kein eigenständiger Punktegenerator. Konkrete Erwerbsquellen folgen separat.
