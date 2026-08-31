# Composition Gate Proof — connector-standstill + probe-check-rename + auth-seed

- HEAD_SHA: 486b0ee7022491cf8e69ecdb9be0f6dbb4e0da6c
- BASE_SHA: aa82b0ba767b7b0152dd26491c42b7aaad7ca741
- Date: 2026-08-31
- Verdict: CLEAR

## Event

Zwei getrennte Hop-Ketten:

1. **UI-only (Connector/Rename):** ArchetypeCarousel-Scroll-Phase (Embla-Events) → CharacterArchetypePanel-State → ArchetypeConnector-Messung/-Remount. Rein lokale Render-Phasen, keine Persistenz, kein Netzwerkcall, kein Consumer jenseits des Renderings.
2. **Auth-Seed (persistence):** Migration 011 schreibt einmalig in `auth.users`/`auth.identities` und normalisiert app-eigene Zeilen auf die fixe Seed-UUID. Producer ist die Migration selbst, Consumer sind RLS-Policies (`auth.uid()`) und die Service-Owner-Queries. Die App fällt offline-Only auf dieselbe UUID zurück (LOCAL_ADMIN_USER_ID), sodass keine zweite Identität existiert.

## Hop chain

UI-Kette: Embla `select`/`scroll` → `onChangeScrollPhase` → Panel-State → `scrollPhase`-Prop → Standstill-Watcher (rAF, 3 stabile Frames) → `onStandstill` → Panel-State → Connector-Fade. Ende — keine Persistenz, kein Worker.

Auth-Kette: Migration 011 → `auth.users` (Seed-UUID `00000000-0000-4000-8000-000000000001`) → GoTrue JWT (`sub` = Seed-UUID, verifiziert per curl) → RLS `owner_user_id = auth.uid()` (REST-Chain verifiziert, `[]` statt PGRST-Error) → Offline-Fallback teilt dieselbe UUID (eine Quelle der Wahrheit).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Dev-Server (User) und Playwright (CI/lokal) teilen die Seed-UUID; parallele Logins derselben Identität sind GoTrue-Standard (Refresh-Token pro Session) | Migration idempotent (`on conflict`/Existenz-Check); Re-Run erzeugt keine Doppelrows — verifiziert durch zweifachen apply | pass |
| Invalid/missing | Fallback-UUID `'local-admin'` (kein UUID-Format) muss nie mehr Postgres erreichen; fehlender Seed-User → klarer Login-Fehler statt Fake-Session | `LOCAL_ADMIN_USER_ID` = valide Gen-4-UUID identisch zur Migration; Offline-Fallback wirft bei ungültigem Auth-Kontext normale Service-Errors (getestet: `invalid input syntax for type uuid` nicht mehr reproduzierbar) | pass |
| Two consumers / crash | character.service und project.service nutzen denselben `getAuthenticatedUserId`-Fallback; Welten-Hook nutzt `user.id` direkt | Beide Konsumpfade lesen dieselbe konstante UUID aus `localAdmin.ts` (Single Source of Truth); Crash im Auto-Re-Login fällt auf denselben Offline-User statt korrupter Queries; E2E-Suite 8/8 grün gegen den echten Stack | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| none | — | — | — | — |