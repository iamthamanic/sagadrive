# Composition Gate Proof — local stack repair & characters schema levelling (#0-fix)

- HEAD_SHA: cc1eb99445266d933604f7615b7b98b73c02ec8a (Vorgänger-Commit des Proof-Pushes; seitdem nur `.qa/runs`-Änderungen)
- BASE_SHA: cc1eb99445266d933604f7615b7b98b73c02ec8a
- Reviewed range (inhaltlich): b4b49aac074d0d482f5662ffca933bdcf3610297..cc1eb99445266d933604f7615b7b98b73c02ec8a
- Date: 2026-08-29
- Verdict: CLEAR

## Event
Ein lokaler Spieler (oder Admin) meldet sich im self-hosted SagaDrive-Stack an (Shortcut `admin`/`1234`, gemappt auf den GoTrue-User `admin@sagadrive.local`) und öffnet die Bibliothek. Die Charakter-Abfrage läuft mit echtem JWT als `authenticated` gegen die via Kong proxyte PostgREST-Instanz; die lokale DB wurde per idempotenter Migration 010 auf das V3-Charakter-Schema gehievt (20 neue Spalten inkl. `character_type`, `worlds`-Tabelle). Mehrere lokale Admins/Sessions können denselben Stack nutzen, ohne in fremde Owner-Kontexte zu gelangen.

## Hop chain
`auth-context.tsx` mappt den Shortcut auf `signInWithPassword(LOCAL_ADMIN_EMAIL)` → GoTrue stellt Session+JWT (stabile UUID `29570e1d-…`) → `supabase-js` sendet `apikey` + `Authorization` über Kong (`rest-v1`-Service, key-auth gegen `${SUPABASE_ANON_KEY}`) → PostgREST verifiziert das HS256-JWT gegen `PGRST_JWT_SECRET` (identisch in auth/rest/storage nach Recreate) → RLS-Policies werten `auth.uid()` als `authenticated` aus (Migration 004: EXECUTE nur für `authenticated`) → `character.service`/`project.service` lösen die Session **vor** dem Local-Admin-Fallback auf (`getUser()` zuerst), sodass `owner_user_id` immer die echte UUID ist → Migration 010 stellt die fehlenden V3-Spalten (idempotent, ADD COLUMN IF NOT EXISTS) bereit → Browser-Bibliothek lädt ohne Fehlerbanner.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Mehrere lokale Nutzer (admin + reguläre GoTrue-User) können parallel eigene Charaktere/Projekte besitzen; kein Owner-Übergreifif. | Requests tragen das jeweilige Session-JWT; RLS filtert auf `auth.uid()` gegen `owner_user_id`/`gm_user_id`. Der Local-Admin-Fallback greift nur, wenn keine Session existiert, und bleibt auf UI-Zustand beschränkt; kein Cross-Owner-Fan-out möglich, da Filterwert = echte UUID aus dem JWT. | pass |
| Invalid/missing | Fehlender/abgelaufener/unsafe JWT, Platzhalter-Keys oder fehlende Schema-Spalten dürfen nicht still als leere Datenmenge durchgehen. | Kong key-auth lehnt fremde Keys ab (401); PostgREST verifiziert Signatur gegen gemeinsames Secret; RLS-Funktionen sind `anon` entzogen (fail-closed). Migration 010 ist idempotent (IF NOT EXISTS) und migriert keine Daten destruktiv; fehlende `character_type`-Spalte war ein Hartfehler, der jetzt gelöst ist. | pass |
| Two consumers / crash | Zwei parallele Clients (Browser-Tab + E2E) teilen eine Session; Stack-Neustart darf Sessions nichtinvalidieren. | JWT-Secret ist persistent in `.env`, Sessions überleben Container-Recreate (gleiche Signatur); `supabase-js` persistiert die Session in localStorage und refreshet automatisch. Kein In-Memory-Only-State auf Serverseite. | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| identity: `local-admin`-String vs echte UUID | flag | auth-context → services → RLS | `'local-admin'` ist keine UUID und lief als Filterwert gegen `owner_user_id` (UUID-Spalte) ins Leere bzw. wurde als `anon` (ohne JWT) gesendet. | done: Shortcut-Login erzeugt echte GoTrue-Session (UUID), Services nutzen session-first; String-Konstante nur noch als Offline-Fallback. |
| reinterpret: Auth-Reihenfolge | flag | services → RLS | Bypass hatte Vorrang vor Session, echte JWTs wären nie gesendet worden. | done: `getUser()` wird zuerst aufgerufen; Bypass nur bei fehlender Session. |

## Skip reason
n/a

## Notes
- `.env` ist gitignored; Keys wurden lokal generiert (HS256, 10y exp, `role: anon`/`service_role`).
- Migration 010 wurde gegen die laufende lokale DB angewandt und idempotent verifiziert (43 Spalten in `characters`, `worlds`-RLS aktiv).
- Browser-Verifikation: alle drei Bibliothek-Tabs ohne Fehlerbanner; Dashboard sauber.
- Der `build/`-Ordner enthält Dev-Server-Artefakte und wurde bewusst aus dem Commit gehalten (reverted).