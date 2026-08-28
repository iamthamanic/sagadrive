# Composition Gate — library-entity-browser-adventures

- HEAD_SHA: 9b4d937a81d8dbea1acc3b0fe1b1fd614b43e50b
- BASE_SHA: 373de37e7ccdc994c433634aa04d9bdefb50e085
- Date: 2026-08-28
- Verdict: CLEAR

## Event
(1) Owner öffnet Bibliothek → Tab Abenteuer: Liste/Karussell rendert echte Projekte über `useProjects` statt hardcoded Mock-Cards; View-Mode wird über eigenen Storage-Key persistiert. (2) Karten-Meta zeigt Status (DE-Label), Mitgliederzahl und Projektcode. (3) „Öffnen/Leiten" navigiert GM → `gamemaster`, Spieler → `join` (bestehende App-Views, kein neuer Editor). Zusätzlich: Local-Admin-Sessions laden Projekte überhaupt erst — `projectService` scheiterte still an `supabase.auth.getUser()` (gleicher Drift wie character.service vor #48).

## Hop chain
**Browse:** `Library` → `EntityBrowser` (ui, unverändert) → `EntityBrowserCard` (ui, unverändert) → `useProjects` → `projectService.getUserProjects` (service, geändert: local-admin owner resolution via `getAuthenticatedUserId`) → `projects`/`project_members`/`sessions` (RLS GM-/Membership-scoped, unverändert) → Abenteuer-Tab.

**Auth resolution:** `src/lib/localAdmin.ts` (bestehend aus #48) ↔ `projectService.getAuthenticatedUserId` (new private helper, fallback auf `local-admin` id in lokaler Session). `createProject`/`getUserProjects`/`leaveProject` nutzen den Helper; reguläre Supabase-Sessions nutzen unverändert `auth.getUser()`. Kein neuer Write-Pfad; Inserts bleiben RLS-gebunden.

**Navigation:** Card-Aktionen emittieren nur valide `AppView`s (`gamemaster`, `join`, `character-editor`) — keine `project-join`/`player-view`-Strings (Dashboard-Bug dokumentiert in Acceptance, nicht reproduziert).

No queue/worker/outbox hop. Keine Schema-/Migrationsänderung.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Mehrere parallele Leser (Dashboard + Library nutzen denselben `useProjects`-Service-Pfad) dürfen sich nicht in die Quere kommen; read-only. | Rein lesend; Dedupe im Service via `allProjectIds`-Set garantiert ein `ProjectVm` pro Projekt unabhängig von GM-/Member-Dopplung. Kein Claim/Fanout. | pass |
| Invalid/missing | Ungültige Project-Rows, fehlende Member/Sessions, leere Liste, unbekannter Status → kein Crash, kein Broken State. | `isProjectDto`/`isRecord` verwerfen ungültige Rows (fails closed); `|| []`-Fallbacks; `PROJECT_STATUS_LABELS` exhaustiv über Union-Typ; Empty-States inkl. Suche. Local-admin-Fallback wirft Fehler statt stiller Leerliste. | pass |
| Two consumers / crash | Doppel-Render der Tabs (Radix) und Unmount während In-Flight-Fetch dürfen keine Duplikate/Crashs erzeugen. | Browse rendert nur aus Hook-State; identisches, stabil laufendes Muster wie Dashboard. GM-Check liest kanonisches `project.gmUserId === user.id` (ein Source of Truth, kein Roll/GM-Feld-Konflikt). | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| auth bypass drift: `projectService` (auth.getUser) vs. local-admin session | flag | ui → service | Lokaler Admin ohne JWT scheiterte still nur im Project-Pfad; Character-Pfad wurde in #48 gefixt, Project-Pfad übersehen. | done: `getAuthenticatedUserId`-Helper in `projectService` (identisches Muster wie #48). |

## Skip reason
n/a

## Notes
- Issue #49 (Epic #47): Abenteuer-Tab umgestellt; Welten (#50) folgen auf dieselbe Shell.
- Der Service-Fallback gilt ausschließlich für die dokumentierte local-admin Session (`AGENTS.md`: local-only stack).
- E2E: `e2e/library-adventure-browse.spec.ts` (2 Tests) mockt `/rest/v1/projects*`, `/rest/v1/project_members*`, `/rest/v1/sessions*` und deckt List-State mit Meta-Chips sowie Empty-State mit CTA ab.
- Dashboard-CTAs navigieren an ungültige Views (`project-join`/`player-view`) — Out of Scope laut Issue, als Follow-up dokumentiert.