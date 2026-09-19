# Feature: saga-routing-public-id-foundation

<!-- #276 — Public IDs, Saga/Session URLs, Screen-vs-Modal standard -->

## Intent
SagaDrive erhält einen verbindlichen Standard für öffentliche Resource-IDs, URLs und die Entscheidung zwischen eigenständigem Screen und Modal. Sagas und Sessions werden als erste vollständige Hierarchie auf diesen Standard migriert. Live-Sessions besitzen eigenständige Gamemaster-, Player- und Display-Screens unter derselben Session-Resource. Characters, Items und NPC/Creatures erhalten stabile Public IDs zusätzlich zu ihren internen Primary Keys.

## Preconditions
- History-API-Routing foundation (#133) vorhanden (`routes.ts`, `useAppLocation`).
- `public.projects` / `public.sessions` / `public.characters` / item- & npc-definition tables existieren.
- Kein React Router; Layered Architecture #94 bleibt verbindlich.

## Happy Path
- [ ] Zentraler Public-ID-Contract (`src/domains/resource-id`) validiert/generiert `PREFIX-XXXXX` (5 Zeichen, Alphabet ohne O/0/I/1, ≥1 Buchstabe + ≥1 Zahl); Migration ergänzt `public_id` für projects/sessions/characters/inventory_item_definitions/npc_creature_definitions inkl. Backfill + UNIQUE; `projects.code` und interne PKs unverändert.
- [ ] Saga-/Session-Routing löst stabile Deep Links (`/sagas/:sagaPublicId/**`, prepare|live|recap, live/gamemaster|player|player/:characterPublicId|display); neutrale Session-/Live-Routen normalisieren anhand Status und Rolle; `/live/player` löst den Session-Character auf die kanonische Character-Route.
- [ ] `sessions.session_number` ist `(project_id, session_number)` UNIQUE und wird concurrency-safe (DB-Funktion/Advisory Lock) vergeben; keine Neu-Nummerierung historischer Sessions.
- [ ] Autorisierung ist URL-unabhängig: reine Domain-Regeln + Tests decken ID-Validierung, Cross-Saga-Abweisung, Rollenrouting, Reload-Pfade; Player erhalten keine GM-Rechte nur durch URL.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] Ungültige Präfixe/Zeichen → Validierung fail / not-found Route
- [ ] Public-ID-Kollision → serverseitiger Retry
- [ ] Session-ID aus anderer Saga → not-found / forbidden (Lookup scoped)
- [ ] Parallele Session-Creates → keine Doppel-`session_number`
- [ ] Player öffnet `/live/gamemaster` → forbidden / normalize (keine GM-Daten)
- [ ] `/live/player` ohne Character → resolve + redirect; fremder Character → forbidden
- [ ] Compatibility `/gamemaster` und `/adventure-editor` bleiben erreichbar, sind aber nicht zweite SoT

## Regression
- [ ] Bestehende Item-/NPC-Routen und Dashboard/Library Views laden weiterhin
- [ ] `architecture-boundary-check` und `item-routing-foundation-check` bleiben grün

## Assumptions
- User-facing Begriff „Saga“ mappt auf Tabelle `projects` (keine Rename).
- `domains/session` legacy code-join API bleibt unberührt; Saga-Sessions nutzen `domains/project` Session-Typen.

## Security Coverage
| Item | Applicable | How satisfied |
|------|------------|---------------|
| F-01 untrusted route params | Yes | Public IDs validated in domain; route segments treated as untrusted |
| F-03 secrets in client | N/A | Public IDs are not secrets; no new secret storage |
| B-01 auth on lookups | Yes | Lookups remain behind existing auth/RLS; public_id is identifier only |
| B-04 IDOR | Yes | Cross-saga session resolve rejected; live role rules independent of URL |
| B-07/B-08 permission via URL | Yes | `/live/gamemaster` does not grant GM; role from membership |
| P-04 client-controlled identity | Yes | Character public id in URL is routing context only; membership checked |

## Screenshots
| Step | Filename |
|------|----------|
| 1 | n/a (foundation / routing — deterministic script evidence) |

## Implementation Notes
## Implementation Notes
- Domain `src/domains/resource-id/**`: Public ID contract, screen-vs-modal, live/session phase rules.
- Routing: Saga/Session/Character public routes in `routes.ts` + `useAppLocation` helpers.
- Migration `039_public_resource_ids_and_session_numbers.sql`: public_id columns, backfill, UNIQUE, session_number UNIQUE, `create_project_session` RPC.
- Infra: project/character lookup by public_id; project summaries expose publicId.
- App shells: SagaResourceScreen + SessionResourceScreen; `/gamemaster` + `/adventure-editor` compatibility retained.
- Docs: `docs/navigation-public-ids.md` + AGENTS.md section; gate `saga-routing-public-id-foundation-check.mjs`.
- Evidence: `node scripts/saga-routing-public-id-foundation-check.mjs` → OK.


## Composition Gate
- Verdict: CLEAR (WORKTREE)
- Proof: `.qa/runs/composition-gate-saga-routing-public-id-foundation.md`
