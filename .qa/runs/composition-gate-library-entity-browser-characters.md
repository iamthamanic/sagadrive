# Composition Gate — library-entity-browser-characters

- HEAD_SHA: e30eef2218fc14eb91bfeee51555d8a2ac63ab30
- BASE_SHA: 87e81842bfaa3441bd80ac6788aa71962c28f762
- Date: 2026-08-28
- Verdict: CLEAR

## Event
(1) Owner öffnet Bibliothek → Tab Charaktere: Liste/Karussell rendert Charaktere inkl. Portrait über neue `EntityBrowser`-Shell; View-Mode wird persistiert. (2) Create/Edit/Delete laufen wie bisher über `onNavigate('character-editor')` bzw. `deleteCharacter`. Zusätzlich: Local-Admin-Sessions (lokal-only Bypass ohne Supabase-JWT) können Charaktere überhaupt laden — vorher scheiterte `getUserCharacters` still an `supabase.auth.getUser()`.

## Hop chain
**Browse:** `Library` → `EntityBrowser` (ui, new) → `EntityBrowserCard` (ui, new) → `useCharacters` → `characterService.getUserCharacters` (service, geändert: local-admin owner resolution) → `characters` (RLS owner-scoped, unverändert) → Charaktere-Tab.

**Auth resolution:** `auth-context` local-admin bypass (`sagadrive-local-admin-session`) ↔ `src/lib/localAdmin.ts` (new, geteilte Konstanten) ↔ `characterService.getAuthenticatedUserId` (fallback auf `local-admin` id). Keine neuen Write-Pfade; DELETE/UPDATE bleiben `owner_user_id`-gebunden.

No queue/worker/outbox hop. Keine Schema-/Migrationsänderung.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Browse ist read-only owner-scoped; kein Cross-User-Fanout. | `getUserCharacters` filtert weiter auf `owner_user_id` aus `getAuthenticatedUserId()`; local-admin id ist konstant. | pass |
| Invalid/missing | Fehlendes Portrait / leere Liste / Storage-Fehler erzeugen keinen Crash und keine broken `<img>`. | `EntityBrowserCard` fällt auf Initials/Icon zurück (`onError`-State); Empty-States inkl. Suche; localStorage-Fehler → safe Default. | pass |
| Two consumers / crash | Doppel-Render der Tabs (Radix) und parallele Editier-Session dürfen keine Duplikate oder verlorenen Deletes erzeugen. | Browse rendert nur; Delete läuft über bestehenden Hook-Pfad mit Confirm; Carousel-Reset bei Item-Wechsel ist idempotent (`scrollTo(0)`). | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| auth bypass drift: `useWorldProfiles` (context user.id) vs `characterService` (`supabase.auth.getUser()`) | flag | ui → service | Lokaler Admin ohne JWT scheiterte still nur im Charakter-Pfad; Welten-Pfad nutzte bereits context id. | done: `src/lib/localAdmin.ts` als gemeinsame Quelle; Service-Fallback auf `local-admin` id in lokaler Session. |

## Skip reason
n/a

## Notes
- Issue #48 (Epic #47): Nur Charaktere-Tab umgestellt; Abenteuer (#49) und Welten (#50) folgen auf dieselbe Shell.
- Der Service-Fallback gilt ausschließlich für die dokumentierte local-admin Session (`AGENTS.md`: local-only stack); reguläre Supabase-Sessions nutzen unverändert `auth.getUser()`.
- E2E: `e2e/library-character-browse.spec.ts` (2 Tests) mockt `/rest/v1/characters*` und deckt Listen-/Karussell-Mode, Persistenz und Search-Empty-State ab.