# Composition Gate - feat-character-studio-avatar

- HEAD_SHA: 96dc08c0a49694b72895e0b099b8f86da34f401e
- BASE_SHA: 7f6f096dc5c6a0ff280d901cf262fa533814085f
- Date: 2026-08-25
- Verdict: CLEAR

## Event
Ein authentifizierter User klickt im BG-Tab genau einmal auf `Generieren`. Optional waehlt er vorher ein sichtbares Projekt als Kampagnen-Lore. Der Request darf fuer diese User-ID genau einen persistenten Quota-Slot konsumieren und bei gueltiger Autorisierung genau einen LLM-Provider-Aufruf erzeugen. Das Ergebnis bleibt ein lokaler Entwurf, bis der User es explizit uebernimmt; Character-Persistenz ist ein separater Save-Flow.

## Hop chain
`CharacterEditor` → `CharacterBackgroundComposer` → optionale Projektwahl aus `useProjects` (`projectId` + verknuepfte `worldId`, nur untrusted Kontext-Hinweis) → `characterLoreService.generateBackground` → gemeinsamer Supabase-Client → Edge Function `character-lore` → JWT-Verifikation und serverseitig abgeleitete `userId` → service-role-only RPC `consume_character_lore_rate_limit` → atomarer Postgres-Upsert auf genau eine Rate-Limit-Zeile pro User → Request-/UUID-Validierung → optionale serverseitige Projektmitgliedschaft-/GM-/World-Binding-Pruefung → versionierter Prompt `character-background-v1` → genau ein konfigurierter Provider-Aufruf → Draft JSON → lokaler KI-Entwurf → explizites `Uebernehmen` → separater normaler Character-Save.

Persistente Quota:
`supabase/migrations/003_character_lore_rate_limits.sql` → Tabelle `character_lore_rate_limits` mit `user_id` als Primary Key → `SECURITY DEFINER` RPC mit fixiertem `search_path` → EXECUTE nur fuer `service_role`; `PUBLIC`, `anon` und `authenticated` sind explizit gesperrt. Der Edge-Caller setzt `p_user_id` ausschliesslich aus dem bereits verifizierten JWT. Der atomare `INSERT ... ON CONFLICT DO UPDATE` serialisiert konkurrierende Updates fuer dieselbe User-Zeile; mehrere Edge-Instanzen teilen deshalb dasselbe Fenster statt jeweils einen eigenen In-Memory-Counter zu fuehren.

Projekt-/Welt-Lore:
Die Browserauswahl ist keine Autorisierung. `projectId`/`worldId` werden serverseitig erneut geprueft. Projektzugriff erfordert GM oder aktive Mitgliedschaft. Wenn Projekt und Welt gemeinsam gesendet werden, muss `worldId === project.world_id` gelten. Direkter Welt-Kontext ohne Projekt ist nur fuer den World-Creator erlaubt. Ohne Auswahl bleibt die Generierung setting-neutral.

Parallel/local hops ohne Provider-Fan-out:
- Avatar/VRM Preview → nur lokales Three.js/WebGL
- Ruleset-Switch → kontrollierter React-State
- Beispielrotation / Trait-Chips → lokaler React-State
- Project-Select → aendert nur den Generation-Context; kein Character-Save und kein Provider-Aufruf
- Browser-E2E-/Test-Gate-Tooling → QA-only

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Zehn gleichzeitige Edge-Instanzen fuer denselben User duerfen nicht zehn unabhaengige Minutenkontingente besitzen. Ein Klick darf hoechstens einen Provider-Aufruf erzeugen. | Alle Instanzen schreiben dieselbe Primary-Key-Zeile `user_id`. Der atomare Postgres-Upsert aktualisiert den gemeinsamen Counter. `request_count <= limit` entscheidet den einzelnen Request. Trait-Anzahl, Inventar, Projektmitglieder oder eine verknuepfte Welt multiplizieren den Provider-Hop nicht. | pass |
| Invalid/missing | Fehlende Auth, kaputte Quota-Infrastruktur, ausgeschoepftes Limit, ungueltige Payloads oder fremde Projekt-/Welt-IDs muessen vor einem Provider-Fan-out scheitern. | Ohne JWT: 401. Ohne Service-Role bzw. bei nicht erreichbarer/ungueltiger Rate-Limit-RPC: 503 fail-closed. Quota ausgeschoepft: 429. Ungueltige UUID/Payload: 400. Fremde Projekt-/Welt-Lore wird durch Membership/GM/Creator + World-Binding abgewiesen. Browser-Projektlistenfehler laesst den neutralen `Kein Projekt`-Pfad bestehen. | pass |
| Two consumers / crash | Zwei parallele Consumer duerfen das gleiche User-Limit nicht jeweils lokal verbrauchen. Ein Crash darf keine doppelten Provider- oder Character-Writes erzeugen. | Die DB-Zeile ist die gemeinsame Serialisierungsstelle. Ein Crash nach erfolgreichem Quota-Consume kann konservativ genau einen Slot verbrauchen, erzeugt aber keinen zweiten Slot, keinen persistierten Draft und keinen Character-Write. Retry ist ein neuer bewusster Request. Generation besitzt keine Queue/Outbox; Draft bleibt lokal bis zur expliziten Uebernahme. | pass |

## Flags
| Tag | Severity | Hops | Finding | Resolution |
|-----|----------|------|---------|------------|
| `rate-limit:` | resolved | Edge → DB → provider | Der vorherige In-Memory-Map-Counter war instanzlokal und konnte bei horizontaler Skalierung vervielfacht werden. | Migration 003 + service-role-only atomare Postgres-RPC; Deno-Tests pruefen RPC Contract, Exhaustion und fail-closed Fehlerpfade. |
| `dead-path:` | resolved | Editor → project/world lore | Der standalone Editor hat vorher keine `projectId`/`worldId` geliefert. | BG-Tab bietet nun optional `Kampagnen-Lore`; Auswahl sendet Projekt plus verknuepfte Welt, serverseitige AuthZ bleibt kanonisch. |
| `quota-loss-on-crash:` | note | DB quota → provider | Crash direkt nach Quota-Consume kann einen Slot ohne fertigen Draft verbrauchen. | Bewusst konservativ/fail-safe: kein doppelter Provider-Call, kein Kosten-Bypass, keine Persistenz. Fuer ein Minutenlimit ist der temporaere Slotverlust akzeptabel. |

## Architecture review
Die persistente DB-Quota ersetzt keinen eigenstaendigen Cache/Queue-Service und nutzt die bereits kanonische Postgres-Trust-Boundary. Das ist fuer diesen kleinen, per-User atomaren Counter weniger Betriebsaufwand als Redis plus eigene Konsistenz-/Failover-Semantik. Die relevante System-Design-Eigenschaft ist Atomicity: konkurrierende Counter-Updates muessen als unteilbare DB-Operation behandelt werden (System Design Reference, S. 111). Die Modulgrenze bleibt eng: UI kennt nur Projekt-IDs, die Edge Function besitzt AuthZ/Secrets, der Rate-Limit-Helper versteckt den RPC-Transport. Der Composer importiert `useProjects` direkt statt das defekte Legacy-Barrel in die Character-Domain zu ziehen.

## Verification evidence
- Test Gate auf `96dc08c0a49694b72895e0b099b8f86da34f401e`: PASS
- Typed-strict lint: PASS (31 geaenderte TypeScript-Dateien)
- Typecheck: PASS
- Vite production build: PASS
- Deno check: PASS (6 geaenderte Edge-Function-TypeScript-Dateien)
- Deno tests: 8/8 PASS, davon 4 neue persistente Rate-Limit-Contract-/Fail-Closed-Tests
- Secrets diff scan: PASS
- Production dependency audit (`npm audit --omit=dev`): critical=0, high=0, moderate=0, low=0
- Browser E2E auf demselben SHA: 3/3 PASS in Chromium; Character-Editor-Test deckt sichtbare neutrale `Kampagnen-Lore`-Auswahl und den nicht-destruktiven Generate-Status ab
- Browser evidence artifact: `character-editor-browser-evidence`, Artifact ID `9576116633`

No open composition blocker changes cardinality, destination, tenant, identity, or persistence semantics for the requested scope.

## Skip reason
n/a
