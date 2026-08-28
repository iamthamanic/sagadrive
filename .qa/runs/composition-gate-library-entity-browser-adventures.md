# Composition Gate Proof — library-entity-browser-adventures

- **Ticket:** Issue #49 (`feat(library): Abenteuer-Tab an useProjects + EntityBrowser`)
- **Branch:** `feat/library-entity-browser-adventures` @ `dd3fa6c`
- **Basis:** `main` (inkl. #48/PR #58, der EntityBrowser-Shell)
- **Datum:** 2026-08-28

## Producer → Consumer Pfad

| Hop | Producer | Consumer | Invariante |
|-----|----------|----------|------------|
| 1 | Supabase `projects`/`project_members`/`sessions` (RLS, GM-/Membership-scoped) | `projectService.getUserProjects()` | Service validiert Rows via `isProjectDto`/`isRecord` (fails closed, ungültige Rows werden verworfen, nicht gerendert) |
| 2 | `projectService.getUserProjects()` | `useProjects` hook | `ProjectVm`-Kontrakt; Fehler → Hook-Error-State (UI zeigt destructive banner + Empty State bleibt handhabbar) |
| 3 | `useProjects` | `Library.tsx` Abenteuer-Tab | Filter via `normalizedSearch` (name/description/code), Empty-State-Verzweigung über `filteredProjects.length === 0` |
| 4 | `Library` Card-Aktion | `App.handleNavigate` | Nur valide `AppView`s: `gamemaster` (GM) bzw. `join` (Spieler/CTA) — `project-join`/`player-view` werden **nicht** emittiert (Dashboard-Bug dokumentiert, nicht reproduziert) |

## Kardinalität
- Ein `ProjectVm` pro Projekt (Dedupe via `allProjectIds`-Set im Service — GM+Member-Dopplung wird zu **einer** Karte). Kein Side-Effect pro Render.

## Simulation 1: N Actors
- Zwei parallele Leser (`useProjects` im Dashboard + Library) teilen denselben Service-Pfad; rein lesend, kein Claim/Konkurrenzproblem.

## Simulation 2: Invalid/missing
- Ungültige Project-Rows → `isProjectDto` verwirft (fails closed). Fehlende Member/Sessions → `|| []` Fallback im Service. `description ?? ''` bei Suche. `PROJECT_STATUS_LABELS[status]` ist exhaustiv über den Union-Typ — unbekannter Status typisiert ausgeschlossen.
- Local-Admin: `getAuthenticatedUserId()` fällt auf dokumentierte lokale Identität zurück (`src/lib/localAdmin.ts`), sonst Fehler statt stiller Leerliste.

## Simulation 3: Two consumers / crash
- Library unmount während In-Flight-Fetch: Hook-State-Update nach Unmount ist React-sicher (kein Crash-Muster in diesem Repo; identisches Muster läuft stabil im Dashboard seit jeher).
- GM-Check liest `project.gmUserId === user.id` — ein Source of Truth (kein Doppel-Feld `role`/`gmUserId`-Konflikt; `members`-Roll-Check bewusst nicht mehr verwendet, da `gmUserId` die kanonische Quelle ist).

## Scope-Hop-Bewertung
- Service-Änderung (`project.service.ts`) ist der Local-Admin-Bypass-Hop: identisches, bereits in PR #58 akzeptiertes Muster; ändert keine RLS/Server-Logik, kein Authz-Umfeld. Verdict **CLEAR**.
- E2E-Beweis: `e2e/library-adventure-browse.spec.ts` (2 passed) — komponierter Pfad REST→Service→Hook→UI→Navigation.

**Verdict: CLEAR**