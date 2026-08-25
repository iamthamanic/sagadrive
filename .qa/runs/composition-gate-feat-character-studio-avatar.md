# Composition Gate - feat-character-studio-avatar

- HEAD_SHA: 096ff0592af9957b24ddfd4d86e281b15ea3c44d
- BASE_SHA: 7f6f096dc5c6a0ff280d901cf262fa533814085f
- Date: 2026-08-25
- Verdict: CLEAR

## Event
1. Ein authentifizierter User klickt im BG-Tab genau einmal auf `Generieren`. Optional waehlt er vorher ein sichtbares Projekt als Kampagnen-Lore. Der Request darf fuer diese User-ID genau einen persistenten Quota-Slot konsumieren und bei gueltiger Autorisierung genau einen LLM-Provider-Aufruf erzeugen. Projekt-/Welt-Lore darf nur aus einem tatsaechlich autorisierten Projekt und einer zulaessigen Welt stammen. Das Ergebnis bleibt ein lokaler Entwurf, bis der User es explizit uebernimmt.
2. Ein User speichert genau einen Character. Das aktuell ausgewaehlte Character-Creation-Regelset muss zusammen mit seinen kanonischen Feldern genau in dieser Character-Row erhalten bleiben: `ruleset_key` immer, `dnd_background` nur fuer D&D 5.5e. Die freie `background_story` bleibt eine andere Tatsache und darf diese Metadaten nicht ersetzen.

## Hop chain
### Character-Lore-Generation
`CharacterEditor` → `CharacterBackgroundComposer` → optionale Projektwahl aus dem oeffentlichen `projects`-Modul (`projectId` + verknuepfte `worldId`, nur untrusted Kontext-Hinweis) → `characterLoreService.generateBackground` → gemeinsamer Supabase-Client → Edge Function `character-lore` → JWT-Verifikation und serverseitig abgeleitete `userId` → service-role-only RPC `consume_character_lore_rate_limit` → atomarer Postgres-Upsert auf genau eine Rate-Limit-Zeile pro User → Request-/UUID-Validierung → serverseitige Projekt-GM/aktive-Membership-Pruefung → unabhaengige World-Autorisierung → versionierter Prompt `character-background-v1` → genau ein konfigurierter Provider-Aufruf → Draft JSON → lokaler KI-Entwurf → explizites `Uebernehmen`.

### Character-Save
`CharacterEditor.ruleset` + regelsetabhaengige Inputs → `handleSaveCharacter` → `CreateCharacterDto.ruleset_key` + `dnd_background` → `characterService.createCharacter` → normalisiertes Character-Insert → `characters.ruleset_key` / `characters.dnd_background` aus Migration 005 → `mapToViewModel` → `CharacterVm.rulesetKey` / `dndBackground`.

Beim Update gilt dieselbe Identitaet: wenn `ruleset_key = sagadrive-core`, setzt der Service `dnd_background = NULL`; bei `dnd-5.5e` bleibt der gewaehlte D&D-Hintergrund erhalten. Alt-Rows ohne neuen Key werden im ViewModel als `sagadrive-core` interpretiert. `ruleset_id` bleibt davon getrennt als optionaler UUID-Verweis auf katalogisierte Ruleset-Datensaetze.

Persistente Quota:
`supabase/migrations/003_character_lore_rate_limits.sql` → Tabelle `character_lore_rate_limits` mit `user_id` als Primary Key → `SECURITY DEFINER` RPC mit fixiertem `search_path` → EXECUTE nur fuer `service_role`; `PUBLIC`, `anon` und `authenticated` sind explizit gesperrt. Der Edge-Caller setzt `p_user_id` ausschliesslich aus dem bereits verifizierten JWT. Der atomare `INSERT ... ON CONFLICT DO UPDATE` serialisiert konkurrierende Updates fuer dieselbe User-Zeile; mehrere Edge-Instanzen teilen deshalb dasselbe Fenster statt jeweils einen eigenen In-Memory-Counter zu fuehren.

Projekt-/Welt-Lore und Membership-Trust-Boundary:
Die Browserauswahl ist keine Autorisierung. `projectId`/`worldId` werden serverseitig erneut geprueft. Projektzugriff erfordert GM oder eine `project_members`-Zeile mit `status = 'active'`. `supabase/migrations/004_project_membership_security.sql` entfernt Self-INSERT/Self-UPDATE-Policies und haertet auch Legacy-RLS nach: Characters, Sessions, Session-Player-State, NPC Memories, Combat States sowie Chat Read/Write verwenden eine aktive Membership statt blosser Row-Existenz. Inaktive/gekickte Rows bleiben Denial-Records. Wenn Projekt und Welt gemeinsam an `character-lore` gesendet werden, muss `worldId === project.world_id` gelten; bei privater Welt muss die Welt dem Projekt-GM gehoeren, waehrend oeffentliche Welten zulaessig sind. Direkter privater World-Kontext ohne Projekt ist nur fuer den World-Creator erlaubt. Ohne Auswahl bleibt die Generierung setting-neutral.

Projektcode-Identitaet:
`join_project_by_code` ist der einzige authentifizierte Self-Service-Hop zum Erzeugen einer aktiven Membership. Migration 004 prueft bestehende Codes vorab auf Kollisionen nach `UPPER(BTRIM(code))` und bricht bei Mehrdeutigkeit fail-closed ab. Danach erzwingt ein eindeutiger Expression-Index dieselbe case-insensitive Identitaet, die der Join-RPC fuer den Lookup benutzt. Ein Code wie `ABC123` und `abc123` kann deshalb nicht zwei verschiedene Projekte adressieren; `LIMIT 1`/arbitraere Auswahl ist entfernt.

Parallel/local hops ohne Provider-Fan-out:
- Avatar/VRM Preview → nur lokales Three.js/WebGL. Nach einem asynchronen Model-Load wird der zuletzt bekannte Avatar-/Manifest-State erneut angewendet, damit Look-Aenderungen waehrend des Downloads nicht auf einen alten Snapshot zurueckspringen.
- Ruleset-Switch → kontrollierter React-State; nur der explizite Character-Save persistiert.
- Beispielrotation / Trait-Chips → lokaler React-State.
- Project-Select → aendert nur den Generation-Context; kein Character-Save und kein Provider-Aufruf.
- Membership join/character selection → constrained RPCs; kein Character-Lore-Provider-Hop.
- `archived` ist ein gueltiger Legacy-Projektstatus im Runtime-Parser und aendert keine Membership-Autorisierungssemantik.
- Browser-E2E-/Test-Gate-Tooling → QA-only.

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Zehn gleichzeitige Edge-Instanzen fuer denselben User duerfen nicht zehn unabhaengige Minutenkontingente besitzen. Ein Generieren-Klick darf hoechstens einen Provider-Aufruf erzeugen. Ein Character-Save darf genau eine Character-Row mit genau einem Ruleset-Key schreiben. | Alle Edge-Instanzen schreiben dieselbe Primary-Key-Zeile `user_id`; der atomare Postgres-Upsert aktualisiert den gemeinsamen Counter. Der Character-Save ist ein einzelner `characters`-Insert/Update ohne Fan-out; `ruleset_key` und `dnd_background` sind Spalten derselben Row. | pass |
| Invalid/missing | Fehlende Auth, kaputte Quota-Infrastruktur, ausgeschoepftes Limit, ungueltige Payloads, fremde Projekt-/Welt-IDs, inaktive Memberships oder mehrdeutige Projektcodes muessen vor einem falschen Side-Effect scheitern. Alte Characters ohne neuen Ruleset-Key duerfen nicht unlesbar werden. | Ohne JWT: 401. Ohne Service-Role bzw. bei nicht erreichbarer/ungueltiger Rate-Limit-RPC: 503 fail-closed. Quota ausgeschoepft: 429. Ungueltige UUID/Payload: 400. Inaktive/gekickte Memberships grantieren weder Legacy-Ressourcen noch Lore-Zugriff. Case-insensitive Code-Kollisionen stoppen Migration 004. Migration 005 defaultet Alt-Rows auf `sagadrive-core`; Service-Leseweg faellt ebenfalls darauf zurueck. | pass |
| Two consumers / crash | Zwei parallele Consumer duerfen das gleiche User-Limit nicht jeweils lokal verbrauchen. Ein Crash darf keine doppelten Provider- oder Character-Writes erzeugen. | Die DB-Quota-Zeile ist die gemeinsame Serialisierungsstelle. Ein Crash nach Quota-Consume kann konservativ einen Slot verbrauchen, erzeugt aber keinen zweiten Provider-Hop. Character-Save besitzt keine Queue/Outbox; ein normaler Request schreibt eine Row. Wiederholung ist ein neuer expliziter Save und kein versteckter Consumer-Retry. | pass |
| Ruleset switch | SagaDrive Core und D&D 5.5e duerfen keine regelsetfremden Metadaten ineinander tragen. | Editor leert inkompatible lokale Auswahlwerte. Save sendet immer `ruleset_key`; D&D sendet `dnd_background`, SagaDrive sendet `NULL`. Service-Update erzwingt dieselbe Bereinigung; Migration 005 entfernt vorhandene D&D-Hintergruende aus Nicht-D&D-Rows. | pass |
| Async avatar load | Look-Aenderungen waehrend eines laufenden VRM-Downloads duerfen nach Load-Ende nicht auf den Start-Snapshot zurueckfallen. | `applyAppearance` aktualisiert `currentAvatar/currentManifest` auch ohne geladenes Root. Nach `loadAsync` wird deshalb der aktuelle Runtime-State (`this.currentAvatar/currentManifest`) auf das neue Root angewendet, nicht der alte Funktionsparameter. | pass |
| Membership escalation | Ein User darf durch direkte Tabellenwrites, eine inactive/kicked Legacy-Row oder Delete+Rejoin keine aktive Autorisierung erhalten. | Membership-Identity/Role/Status/Project sind server-/GM-kontrolliert. Self-Service-Join und Character-Zuordnung laufen ueber constrained RPCs. Migration 004 ersetzt alle Legacy-Ressourcen-Policies, die vorher nur auf Row-Existenz geprueft haben, durch `status = active`-Semantik. | pass |
| Join-code collision | Zwei Projekte duerfen nicht dieselbe Join-Identitaet nur mit anderer Gross-/Kleinschreibung besitzen. | Migration 004 preflightet normalisierte Bestandswerte, erzwingt danach einen Unique-Index auf `UPPER(BTRIM(code))`, und der Join-RPC verwendet exakt dieselbe Normalisierung ohne `LIMIT 1`. | pass |

## Flags
| Tag | Severity | Hops | Finding | Resolution |
|-----|----------|------|---------|------------|
| `rate-limit:` | resolved | Edge → DB → provider | Der vorherige In-Memory-Map-Counter war instanzlokal und konnte bei horizontaler Skalierung vervielfacht werden. | Migration 003 + service-role-only atomare Postgres-RPC; Deno-Tests pruefen RPC Contract, Exhaustion und fail-closed Fehlerpfade. |
| `dead-path:` | resolved | Editor → project/world lore | Der standalone Editor hat vorher keine `projectId`/`worldId` geliefert. | BG-Tab bietet optional `Kampagnen-Lore`; Auswahl sendet Projekt plus verknuepfte Welt, serverseitige AuthZ bleibt kanonisch. |
| `authz-grant:` | resolved | Browser → project_members → resources/lore | Self-writable oder bloss vorhandene Membership-Rows konnten als Autorisierungsgrant interpretiert werden; Legacy-RLS pruefte teilweise keinen aktiven Status. | Migration 004 macht geschuetzte Membership-Felder server-/GM-kontrolliert und ersetzt Legacy-Ressourcen-Policies durch aktive Membership-Semantik. Static Test-Gate-Contract deckt alle betroffenen Policy-Namen ab. |
| `world-reference:` | resolved | project → world → lore provider | Ein autorisiertes eigenes Projekt konnte eine fremde private Welt referenzieren. | `character-lore` autorisiert die Welt unabhaengig: public ist erlaubt; private Projektwelt muss dem Projekt-GM gehoeren, direkte private Welt dem Caller. Deno-Tests decken direct/private/public/project-GM Faelle ab. |
| `identity:` | resolved | join code → project → membership | Case-sensitive DB-Uniqueness plus case-insensitiver Lookup konnte `ABC123` und `abc123` zu einer mehrdeutigen Join-Identitaet machen. | Migration 004 preflightet Bestandskollisionen und erzwingt case-insensitive Unique-Identitaet; RPC benutzt denselben Fold und keine beliebige `LIMIT 1`-Auswahl. |
| `reinterpret:` | resolved | editor ruleset → service → characters row | UI verlangte D&D-Hintergrund, aber Save verlor Ruleset und Hintergrund; spaeter konnte derselbe Character nicht eindeutig rekonstruiert werden. | Migration 005 + DTO/ViewModel/Service/Editor persistieren `ruleset_key` und `dnd_background` als eigene Fakten; `background_story` bleibt getrennt. |
| `stale-state:` | resolved | async VRM load → appearance | `loadModel` konnte nach Download den alten Avatar-Parameter erneut anwenden und zwischenzeitliche Look-Aenderungen ueberschreiben. | Runtime wendet nach Load den neuesten gespeicherten Avatar-/Manifest-State an; Test-Gate-Regression-Contract sperrt das Verhalten ab. |
| `label-lie:` | resolved | legacy project row → runtime parser | Legacy-DB erlaubt `archived`, Runtime-Typ/Validator verwarf den Status und konnte Projekte still aus Listen entfernen. | `ProjectDto`, `ProjectVm` und Runtime-Validator akzeptieren `archived`; AuthZ bleibt weiterhin ueber Membership-/GM-Regeln getrennt. |
| `quota-loss-on-crash:` | note | DB quota → provider | Crash direkt nach Quota-Consume kann einen Slot ohne fertigen Draft verbrauchen. | Bewusst konservativ/fail-safe: kein doppelter Provider-Call, kein Kosten-Bypass, keine Persistenz. Fuer ein Minutenlimit ist der temporaere Slotverlust akzeptabel. |

## Architecture review
Die persistente DB-Quota ersetzt keinen eigenstaendigen Cache/Queue-Service und nutzt die bereits kanonische Postgres-Trust-Boundary. Autorisierungsidentitaet wird nicht aus Browserdaten abgeleitet. Character-Creation-Regelset und katalogisiertes `ruleset_id` bleiben absichtlich getrennte Begriffe: der stabile `ruleset_key` beschreibt die Editor-/Gameplay-Feldsemantik, waehrend `ruleset_id` optional einen konkreten Ruleset-Datensatz referenziert. Dadurch wird keine zufaellige UUID als Produktlogik missbraucht. Die neuen Character-Metadaten liegen in derselben Persistenzgrenze wie der Character selbst und erzeugen keinen zweiten Write-/Side-Effect-Hop.

## Verification evidence
- Quality Gates Run `32890304057` auf Code-/Doku-HEAD `096ff0592af9957b24ddfd4d86e281b15ea3c44d`: Test Gate PASS.
- Character editor regression contract: PASS; prueft Ruleset-/D&D-Hintergrund-Persistenz, neuesten Avatar-State nach asynchronem Load und Legacy-`archived`-Projektstatus.
- Project membership security contract: PASS; prueft server-/GM-kontrollierte Membership-Writes, Legacy-Policy-Ersetzung, case-insensitive Join-Code-Uniqueness und unabhaengige World-Lore-Autorisierung.
- Deno World-Lore-Authorization-Tests: private direct creator, public world und private project-GM ownership abgedeckt.
- Secrets diff scan und Production dependency audit sind Teil des erfolgreichen Test Gate.
- Browser E2E bleibt als verpflichtender CI-Job auf dem nachfolgenden QA-Head aktiv; UI-Verhalten der Ruleset-Feldsets wurde bereits durch die bestehende Playwright-Suite abgedeckt.

No open composition blocker changes cardinality, destination, tenant, identity, authorization or persistence semantics for the requested scope.

## Skip reason
n/a
