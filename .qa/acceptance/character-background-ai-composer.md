# Feature: Character Background AI Composer

## Intent
Der BG-Tab des CharacterEditors wird zu einem Character-Lore-Composer: Hintergrundgeschichte kann aus allen relevanten Charakterparametern generiert werden. Optional kann ein autorisierter Projekt-/Welt-Kontext verwendet werden. Parallel werden Persoenlichkeitsmerkmale, Ideale, Bindungen und Schwaechen als kombinierbare Bausteine editierbar. Teure Provider-Aufrufe werden pro authentifiziertem User persistent und instanzuebergreifend begrenzt.

## Preconditions
- Bestehender CharacterEditor, Regeln fuer SagaDrive Core und Dungeons & Dragons 5.5e, Gold/Cyan-Interaction-Hierarchie und Character-Service bleiben die Basis.
- Prompt-Templates werden versioniert im Repository gespeichert und serverseitig zusammengesetzt.
- Der LLM-Zugriff erfolgt nur serverseitig. Client-Code kennt keine API-Keys oder Service-Role-Keys.
- Provider-Schnittstelle ist OpenAI-kompatibel oder Ollama; konkrete Credentials/Modelle werden per Environment konfiguriert.
- D&D 5.5e bleibt ohne zugeordnete Welt settingneutral. Keine Forgotten-Realms-Annahme.
- SagaDrive Core nutzt die ausgewaehlten Genre-/Setting-Parameter als Lore-Rahmen.
- User hat die rueckwaertskompatible Migration von `ideals`, `bonds`, `flaws` von Einzeltext auf mehrere Textbausteine freigegeben.

## Architecture
- `CharacterBackgroundComposer` kapselt Story-Textarea, Generieren-CTA, rotierende Beispiele, optionalen Kampagnen-Lore-Kontext und Uebernehmen-Flow.
- Der Composer nutzt das bestehende Projects-Modul, um fuer den eingeloggten User sichtbare Projekte anzubieten; die Auswahl ist kein Autorisierungsbeweis.
- `CharacterTraitEditor` kapselt die gemeinsame Mehrfachauswahl-/Custom-Block-Interaktion fuer Persoenlichkeit, Ideale, Bindungen und Schwaechen.
- `characterLore`-Domaincode kapselt Context DTO, Beispielgenerator, Trait-Vorschlaege und Frontend-Service.
- `supabase/functions/character-lore` ist der einzige LLM-Trust-Boundary und baut den finalen Prompt aus validiertem Kontext plus serverseitig erneut autorisiertem Ruleset-/Lore-Kontext.
- `supabase/functions/_shared/character-lore-rate-limit.ts` kapselt den service-role-only Aufruf der persistenten Postgres-RPC.
- `supabase/migrations/003_character_lore_rate_limits.sql` stellt einen atomaren, instanzuebergreifenden User-Rate-Limiter bereit. Die Tabelle ist nicht fuer Browserrollen freigegeben.
- Provider-Details werden hinter einem serverseitigen Adapter verborgen, sodass der CharacterEditor unveraendert bleibt, wenn das Modell wechselt.

## Happy Path
- [x] Im Feld `Hintergrundgeschichte` steht oben rechts eine Primary-CTA `Generieren`. Ohne konfiguriertes LLM liefert sie einen klaren nicht-destruktiven Konfigurationshinweis; mit Provider-Konfiguration erzeugt sie eine neue Variante, ohne bestehenden Text ungefragt zu ueberschreiben.
- [x] Solange das Story-Feld leer ist, werden 10 charakterabhaengige Beispieltexte in Grau angezeigt und alle 5 Sekunden mit einer kurzen Ueberblendung gewechselt; `Beispiel uebernehmen` uebernimmt den aktuell sichtbaren Text in das Story-Feld.
- [x] Der Generation-Context beruecksichtigt alle nicht-leeren Character-Parameter: Name, Beschreibung, Regelset, Archetyp/Klasse, Rasse/Spezies, Setting, Essenzprofil, D&D-Hintergrund, Level, sechs Stats, Skills/Faehigkeiten, Inventar, Aussehen sowie die vier Trait-Gruppen. Notes werden bewusst nicht an das LLM gesendet.
- [x] Persoenlichkeitsmerkmale, Ideale, Bindungen und Schwaechen verwenden denselben Baustein-Editor: ausgewaehlte Werte erscheinen als entfernbare Chips, `+` oeffnet passende Vorschlaege und ein eigener Custom-Block kann hinzugefuegt werden.
- [x] Vorschlaege und Beispiele reagieren auf das aktive Regelset und relevante Charakterparameter; D&D 5.5e und SagaDrive Core erhalten getrennte semantische Pools.
- [ ] Im standalone CharacterEditor kann der User im BG-Tab optional ein sichtbares Projekt als `Kampagnen-Lore` waehlen. Dann werden `projectId` und die verknuepfte `worldId` in den Generation-Context aufgenommen; `Kein Projekt` bleibt setting-neutral.
- [ ] Ein Generieren-Klick konsumiert vor dem Provider-Aufruf genau einen atomaren persistenten Quota-Slot fuer die verifizierte User-ID. Das Kontingent gilt gemeinsam ueber mehrere Edge-Runtime-Instanzen.

## Edge Cases
- [x] Leere/teilweise Character-Parameter erzeugen weiterhin gueltige Beispiele und einen gueltigen Prompt ohne erfundene Pflichtwerte.
- [x] Wechsel des Regelsets aktualisiert Beispiel-/Trait-Kontext ohne alte regelsetfremde Vorschlaege zu erzwingen; bereits vom User ausgewaehlte Custom-Chips bleiben erhalten.
- [x] Bereits vorhandene Story wird bei `Generieren` nicht automatisch ersetzt; die neue Variante wird separat zur Uebernahme angeboten.
- [x] Doppelte Trait-Bausteine werden nicht mehrfach gespeichert; leere Custom-Eintraege und ueberlange Eingaben werden abgewiesen.
- [x] Auto-Rotation und Fade-Timer werden beim Unmount aufgeraeumt und verursachen keine State-Updates nach Unmount.
- [x] Typed-strict: alle geaenderten TypeScript-Dateien bleiben ohne `any`, `@ts-ignore`, `@ts-nocheck` oder vergleichbare Type-Escapes.
- [ ] Ist die Projektliste im Browser nicht verfuegbar, bleibt der Composer nutzbar und ohne Auswahl setting-neutral.
- [ ] Ist die persistente Rate-Limit-RPC nicht migriert, nicht erreichbar oder liefert ein ungueltiges Ergebnis, wird vor dem Provider-Aufruf fail-closed abgebrochen; ein ausgeschopftes Kontingent liefert `429`.

## Security & Data
- LLM-Secrets liegen ausschliesslich in Server-Environment-Variablen und werden nie an den Browser ausgegeben.
- `character-lore` verlangt eine authentifizierte Supabase-Session und leitet User-Identitaet ausschliesslich aus dem verifizierten Token ab.
- Request-Body wird serverseitig auf Typ, Laengen, deklarierte und tatsaechliche Gesamtgroesse sowie erlaubte Ruleset-Werte validiert; Prompt-Inhalte werden als untrusted character/world data markiert.
- Notes werden nicht an die Character-Lore-Generierung uebertragen.
- Keine Roh-Prompts, API-Keys oder komplette Character-Daten werden serverseitig geloggt.
- Optionaler Projekt-/World-Lore-Kontext wird nach erfolgreicher JWT-Verifikation ausschliesslich serverseitig mit dem Service-Role-Key gelesen. Der Key verlaesst die Edge Function nie. Danach prueft die Funktion explizit GM oder aktive Projektmitgliedschaft; bei `projectId + worldId` muss die Welt exakt `project.world_id` entsprechen. Direkter World-Kontext ohne Projekt ist nur fuer den World-Creator erlaubt.
- Die Projektwahl im Browser ist nur ein untrusted Kontext-Hinweis. Eine manipulierte `projectId`/`worldId` kann die serverseitige Autorisierung nicht umgehen.
- Die persistente Rate-Limit-RPC erhaelt `p_user_id` ausschliesslich aus dem verifizierten JWT-Caller und ist fuer `PUBLIC`, `anon` und `authenticated` gesperrt; nur `service_role` darf sie ausfuehren.
- Der Postgres-Upsert sperrt/aktualisiert pro User genau eine Zeile atomar; parallele Edge-Instanzen teilen damit dasselbe Quota-Fenster. Die Tabelle waechst hoechstens auf eine Zeile pro User.
- CORS ist fail-closed: kein Default-`*`. Erlaubt sind explizite Allowlist (`CHARACTER_AI_ALLOWED_ORIGIN`) oder localhost/127.0.0.1 fuer lokale Entwicklung.

## Data Migration
- `personality_traits` bleibt `TEXT[]`.
- `ideals`, `bonds`, `flaws` werden rueckwaertskompatibel von `TEXT` nach `TEXT[]` migriert; vorhandener nicht-leerer Text wird zu einem Array mit genau einem Element.
- DTOs, ViewModel und Character-Service verwenden danach fuer alle vier Trait-Gruppen `string[]`.
- `003_character_lore_rate_limits.sql` legt die Rate-Limit-Tabelle und die service-role-only RPC an. Die Migration ist vor dem produktiven Deploy der aktualisierten `character-lore` Function erforderlich.
- Rollback-Hinweis fuer Trait-Arrays: Arrays mit mehr als einem Element koennen bei Rueckmigration nur verlustbehaftet in einen Einzeltext zusammengefuehrt werden; deshalb ist die Vorwaertsmigration der kanonische Zustand.

## Provider Configuration
- `CHARACTER_AI_PROVIDER`: `openai-compatible` oder `ollama`.
- `CHARACTER_AI_MODEL`: Modellname, fuer echte Generierung erforderlich.
- `CHARACTER_AI_BASE_URL`: Provider-Base-URL; Ollama kann auf `OLLAMA_HOST` zurueckfallen.
- `CHARACTER_AI_API_KEY`: fuer OpenAI-kompatible Provider erforderlich, fuer Ollama optional.
- `CHARACTER_AI_RATE_LIMIT_PER_MINUTE`: persistentes User-Kontingent pro 60 Sekunden, Default 6, serverseitig auf maximal 60 begrenzt.
- Bestehende `OLLAMA_HOST` / `OLLAMA_MODEL` koennen als rueckwaertskompatible Fallbacks verwendet werden.

## Regression
- [x] Info, Look, Stats, Skills, Inventar, Portrait und Save-Flow bleiben funktional.
- [x] Cyan bleibt Primary CTA/Selected; Gold bleibt Hover/Premium-Akzent.
- [x] Keine neue Frontend-UI-Library; Playwright nur als Dev-/QA-Dependency.
- [ ] Der PR-Head besteht Chromium-Playwright inklusive sichtbarer `Kampagnen-Lore`-Auswahl und nicht-destruktivem Generate-Status.

## Composition Gate
- Code HEAD: `PENDING_FINAL_IMPLEMENTATION_SHA`
- Feature BASE: `7f6f096dc5c6a0ff280d901cf262fa533814085f`
- Verdict: `PENDING`
- Proof: `.qa/runs/composition-gate-feat-character-studio-avatar.md`
- Invariant: Ein expliziter Generieren-Klick konsumiert genau einen persistenten Quota-Slot fuer den verifizierten User und fuehrt bei erlaubtem Request zu genau einem Provider-Aufruf und nur zu einem lokalen Entwurf. Projekt-/Welt-Lore wird nur nach erneuter Server-Autorisierung gelesen; Trait-Anzahl und Runtime-Instanzzahl erzeugen keinen Provider-Fan-out.

## Screenshots
- `.qa/evidence/feat-character-studio-avatar/02-info-sagadrive-core.png`
- `.qa/evidence/feat-character-studio-avatar/03-info-dnd-5-5e.png`
- `.qa/evidence/feat-character-studio-avatar/04-bg-project-context.png`
- `.qa/evidence/feat-character-studio-avatar/05-bg-generate-status.png`
- CI Playwright Artifact: `character-editor-browser-evidence`

## Implementation Notes
- `src/modules/characters/lore/` enthaelt den typisierten Character-Lore-Context, exakt zehn dynamische lokale Beispiele, regelsetabhaengige Trait-Vorschlaege und den Frontend-Service.
- `CharacterBackgroundComposer` zeigt `Generieren`, rotiert Beispiele alle fuenf Sekunden mit einem 180-ms-Fade, haelt KI-Ergebnisse als separate Variante und bietet einen optionalen `Kampagnen-Lore`-Projektkontext. Die Projektwahl setzt `projectId` und die verknuepfte `worldId` nur fuer den Generate-Request; sie veraendert den Character-Save nicht.
- `CharacterTraitEditor` wird fuer Persoenlichkeit, Ideale, Bindungen und Schwaechen wiederverwendet; Vorschlaege und Custom-Bloecke werden case-insensitiv dedupliziert, auf 160 Zeichen begrenzt und auf maximal 12 Bloecke je Gruppe beschraenkt.
- Der CharacterEditor baut den Generation-Context aus Regelset, Klasse/Archetyp, Rasse/Spezies, Setting, Essenzprofil, D&D-Hintergrund, Level, Stats, Skills, Inventar, Aussehen und Trait-Gruppen. Notes sind nicht Teil des Contexts.
- `supabase/functions/character-lore` authentifiziert serverseitig, konsumiert danach ueber `consume_character_lore_rate_limit` einen persistenten Quota-Slot, validiert Request-Grenzen und ruft genau einen konfigurierten Provider ueber den gemeinsamen Adapter auf. Faehrt die Quota-Infrastruktur nicht sicher, wird kein Provider aufgerufen.
- Die Rate-Limit-RPC verwendet einen atomaren `INSERT ... ON CONFLICT DO UPDATE` pro User und begrenzt den Counter auf `limit + 1`; parallele Edge-Instanzen koennen dadurch das gemeinsame Limit nicht jeweils separat verbrauchen.
- Projekt-/World-Lore wird trotz UI-Auswahl serverseitig mit Service-Role nur nach JWT-, Membership- und World-Binding-Pruefung gelesen.
- `supabase/migrations/002_character_trait_arrays.sql` migriert Trait-Arrays; `003_character_lore_rate_limits.sql` ist der neue notwendige Deploy-Schritt fuer die persistente Quota.
- `.env.example`, README und `src/supabase/DEPLOY_V3.md` dokumentieren den neuen Deploy-Contract.
- Finaler Test-Gate-, Composition-Gate- und Browser-E2E-Nachweis wird nach dem Implementierungs-Commit auf dessen SHA aktualisiert.
