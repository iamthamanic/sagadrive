# Composition Gate - feat-character-studio-avatar

- HEAD_SHA: a0a0e9c7784770815b2e20fa530d1c26f23caf02
- BASE_SHA: 7f6f096dc5c6a0ff280d901cf262fa533814085f
- Date: 2026-08-25
- Verdict: CLEAR

## Event
Ein authentifizierter User klickt im BG-Tab genau einmal auf `Generieren`. Optional waehlt er vorher ein sichtbares Projekt als Kampagnen-Lore. Der Request darf fuer diese User-ID genau einen persistenten Quota-Slot konsumieren und bei gueltiger Autorisierung genau einen LLM-Provider-Aufruf erzeugen. Projekt-/Welt-Lore darf nur aus einem tatsaechlich autorisierten Projekt und einer zulaessigen Welt stammen. Das Ergebnis bleibt ein lokaler Entwurf, bis der User es explizit uebernimmt; Character-Persistenz ist ein separater Save-Flow.

## Hop chain
`CharacterEditor` → `CharacterBackgroundComposer` → optionale Projektwahl aus dem oeffentlichen `projects`-Modul (`projectId` + verknuepfte `worldId`, nur untrusted Kontext-Hinweis) → `characterLoreService.generateBackground` → gemeinsamer Supabase-Client → Edge Function `character-lore` → JWT-Verifikation und serverseitig abgeleitete `userId` → service-role-only RPC `consume_character_lore_rate_limit` → atomarer Postgres-Upsert auf genau eine Rate-Limit-Zeile pro User → Request-/UUID-Validierung → serverseitige Projekt-GM/aktive-Membership-Pruefung → unabhaengige World-Autorisierung (public oder private Welt im Besitz der referenzierenden Autoritaet) → versionierter Prompt `character-background-v1` → genau ein konfigurierter Provider-Aufruf → Draft JSON → lokaler KI-Entwurf → explizites `Uebernehmen` → separater normaler Character-Save.

Persistente Quota:
`supabase/migrations/003_character_lore_rate_limits.sql` → Tabelle `character_lore_rate_limits` mit `user_id` als Primary Key → `SECURITY DEFINER` RPC mit fixiertem `search_path` → EXECUTE nur fuer `service_role`; `PUBLIC`, `anon` und `authenticated` sind explizit gesperrt. Der Edge-Caller setzt `p_user_id` ausschliesslich aus dem bereits verifizierten JWT. Der atomare `INSERT ... ON CONFLICT DO UPDATE` serialisiert konkurrierende Updates fuer dieselbe User-Zeile; mehrere Edge-Instanzen teilen deshalb dasselbe Fenster statt jeweils einen eigenen In-Memory-Counter zu fuehren.

Projekt-/Welt-Lore und Membership-Trust-Boundary:
Die Browserauswahl ist keine Autorisierung. `projectId`/`worldId` werden serverseitig erneut geprueft. Projektzugriff erfordert GM oder eine `project_members`-Zeile mit `status = 'active'`. `supabase/migrations/004_project_membership_security.sql` entfernt Self-INSERT/Self-UPDATE-Policies und haertet auch Legacy-RLS nach: Characters, Sessions, Session-Player-State, NPC Memories, Combat States sowie Chat Read/Write verwenden eine aktive Membership statt blosser Row-Existenz. Inaktive/gekickte Rows bleiben Denial-Records. Wenn Projekt und Welt gemeinsam an `character-lore` gesendet werden, muss `worldId === project.world_id` gelten; bei privater Welt muss die Welt dem Projekt-GM gehoeren, waehrend oeffentliche Welten zulaessig sind. Direkter privater World-Kontext ohne Projekt ist nur fuer den World-Creator erlaubt. Ohne Auswahl bleibt die Generierung setting-neutral.

Projektcode-Identitaet:
`join_project_by_code` ist der einzige authentifizierte Self-Service-Hop zum Erzeugen einer aktiven Membership. Migration 004 prueft bestehende Codes vorab auf Kollisionen nach `UPPER(BTRIM(code))` und bricht bei Mehrdeutigkeit fail-closed ab. Danach erzwingt ein eindeutiger Expression-Index dieselbe case-insensitive Identitaet, die der Join-RPC fuer den Lookup benutzt. Ein Code wie `ABC123` und `abc123` kann deshalb nicht zwei verschiedene Projekte adressieren; `LIMIT 1`/arbiträre Auswahl ist entfernt.

Parallel/local hops ohne Provider-Fan-out:
- Avatar/VRM Preview → nur lokales Three.js/WebGL
- Ruleset-Switch → kontrollierter React-State
- Beispielrotation / Trait-Chips → lokaler React-State
- Project-Select → aendert nur den Generation-Context; kein Character-Save und kein Provider-Aufruf
- Membership join/character selection → constrained RPCs; kein Character-Lore-Provider-Hop
- Browser-E2E-/Test-Gate-Tooling → QA-only

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Zehn gleichzeitige Edge-Instanzen fuer denselben User duerfen nicht zehn unabhaengige Minutenkontingente besitzen. Ein Klick darf hoechstens einen Provider-Aufruf erzeugen. | Alle Instanzen schreiben dieselbe Primary-Key-Zeile `user_id`. Der atomare Postgres-Upsert aktualisiert den gemeinsamen Counter. `request_count <= limit` entscheidet den einzelnen Request. Trait-Anzahl, Inventar, Projektmitglieder oder eine verknuepfte Welt multiplizieren den Provider-Hop nicht. | pass |
| Invalid/missing | Fehlende Auth, kaputte Quota-Infrastruktur, ausgeschoepftes Limit, ungueltige Payloads, fremde Projekt-/Welt-IDs, inaktive Memberships oder mehrdeutige Projektcodes muessen vor einem falschen Side-Effect scheitern. | Ohne JWT: 401. Ohne Service-Role bzw. bei nicht erreichbarer/ungueltiger Rate-Limit-RPC: 503 fail-closed. Quota ausgeschoepft: 429. Ungueltige UUID/Payload: 400. Inaktive/gekickte Memberships grantieren weder Legacy-Ressourcen noch Lore-Zugriff. Private Projektwelt muss dem GM gehoeren; direkte private Welt dem Caller. Case-insensitive Code-Kollisionen stoppen Migration 004 statt einen zufaelligen Join zu erzeugen. | pass |
| Two consumers / crash | Zwei parallele Consumer duerfen das gleiche User-Limit nicht jeweils lokal verbrauchen. Ein Crash darf keine doppelten Provider- oder Character-Writes erzeugen. | Die DB-Zeile ist die gemeinsame Serialisierungsstelle. Ein Crash nach erfolgreichem Quota-Consume kann konservativ genau einen Slot verbrauchen, erzeugt aber keinen zweiten Slot, keinen persistierten Draft und keinen Character-Write. Retry ist ein neuer bewusster Request. Generation besitzt keine Queue/Outbox; Draft bleibt lokal bis zur expliziten Uebernahme. | pass |
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
| `quota-loss-on-crash:` | note | DB quota → provider | Crash direkt nach Quota-Consume kann einen Slot ohne fertigen Draft verbrauchen. | Bewusst konservativ/fail-safe: kein doppelter Provider-Call, kein Kosten-Bypass, keine Persistenz. Fuer ein Minutenlimit ist der temporaere Slotverlust akzeptabel. |

## Architecture review
Die persistente DB-Quota ersetzt keinen eigenstaendigen Cache/Queue-Service und nutzt die bereits kanonische Postgres-Trust-Boundary. Das ist fuer diesen kleinen, per-User atomaren Counter weniger Betriebsaufwand als Redis plus eigene Konsistenz-/Failover-Semantik. Autorisierungsidentitaet wird nicht aus Browserdaten abgeleitet: User-ID kommt aus dem JWT, Membership-Zugriff aus server-/GM-kontrollierten Rows, World-Zugriff wird separat geprueft und Projektcodes haben genau eine normalisierte Identitaet. Die Modulgrenze bleibt eng: Character UI konsumiert das oeffentliche Projects-Modul, Membership-Services kapseln constrained RPCs, die Edge Function besitzt AuthZ/Secrets und der Rate-Limit-Helper versteckt den RPC-Transport.

## Verification evidence
- Test Gate Run `32887771927` auf Code-HEAD `a0a0e9c7784770815b2e20fa530d1c26f23caf02`: PASS
- Project membership security contract: PASS; prueft server-/GM-kontrollierte Membership-Writes, Legacy-Policy-Ersetzung, case-insensitive Join-Code-Uniqueness und unabhaengige World-Lore-Autorisierung
- Deno World-Lore-Authorization-Tests: private direct creator, public world und private project-GM ownership abgedeckt
- Secrets diff scan und Production dependency audit bleiben Teil des erfolgreichen Test Gate
- Browser E2E wird fuer den nachfolgenden QA-Head erneut als verpflichtender CI-Job ausgefuehrt

No open composition blocker changes cardinality, destination, tenant, identity, authorization or persistence semantics for the requested scope.

## Skip reason
n/a
