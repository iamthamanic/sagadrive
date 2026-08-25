# Feature: Character Background AI Composer

## Intent
Der BG-Tab des CharacterEditors wird zu einem Character-Lore-Composer: Hintergrundgeschichte kann aus allen relevanten Charakterparametern vorbereitet generiert werden, bevor ein konkretes LLM konfiguriert ist. Parallel werden Persoenlichkeitsmerkmale, Ideale, Bindungen und Schwaechen als kombinierbare Bausteine editierbar.

## Preconditions
- Bestehender CharacterEditor, Regeln fuer SagaDrive Core und Dungeons & Dragons 5.5e, Gold/Cyan-Interaction-Hierarchie und Character-Service bleiben die Basis.
- Prompt-Templates werden versioniert im Repository gespeichert und serverseitig zusammengesetzt.
- Der LLM-Zugriff erfolgt nur serverseitig. Client-Code kennt keine API-Keys.
- Provider-Schnittstelle ist OpenAI-kompatibel oder Ollama; konkrete Credentials/Modelle werden spaeter per Environment konfiguriert.
- D&D 5.5e bleibt ohne zugeordnete Welt settingneutral. Keine Forgotten-Realms-Annahme.
- SagaDrive Core nutzt die ausgewaehlten Genre-/Setting-Parameter als Lore-Rahmen.
- User hat die rueckwaertskompatible Migration von `ideals`, `bonds`, `flaws` von Einzeltext auf mehrere Textbausteine freigegeben.

## Architecture
- `CharacterBackgroundComposer` kapselt Story-Textarea, Generieren-CTA, rotierende Beispiele und Uebernehmen-Flow.
- `CharacterTraitEditor` kapselt die gemeinsame Mehrfachauswahl-/Custom-Block-Interaktion fuer Persoenlichkeit, Ideale, Bindungen und Schwaechen.
- `characterLore`-Domaincode kapselt Context DTO, Beispielgenerator, Trait-Vorschlaege und Frontend-Service.
- `supabase/functions/character-lore` ist der einzige LLM-Trust-Boundary und baut den finalen Prompt aus validiertem Kontext plus serverseitigem Ruleset-/Lore-Kontext.
- Provider-Details werden hinter einem serverseitigen Adapter verborgen, sodass der CharacterEditor unveraendert bleibt, wenn das Modell wechselt.

## Happy Path
- [ ] Im Feld `Hintergrundgeschichte` steht oben rechts eine Primary-CTA `Generieren`. Ohne konfiguriertes LLM liefert sie einen klaren nicht-destruktiven Konfigurationshinweis; mit Provider-Konfiguration erzeugt sie eine neue Variante, ohne bestehenden Text ungefragt zu ueberschreiben.
- [ ] Solange das Story-Feld leer ist, werden 10 charakterabhaengige Beispieltexte in Grau angezeigt und alle 5 Sekunden mit einer kurzen Ueberblendung gewechselt; `Beispiel uebernehmen` uebernimmt den aktuell sichtbaren Text in das Story-Feld.
- [ ] Der Generation-Context beruecksichtigt alle nicht-leeren Character-Parameter: Name, Beschreibung, Regelset, Archetyp/Klasse, Rasse/Spezies, Setting, Essenzprofil, D&D-Hintergrund, Level, sechs Stats, Skills/Faehigkeiten, Inventar, Aussehen sowie die vier Trait-Gruppen. Notes werden bewusst nicht an das LLM gesendet.
- [ ] Persoenlichkeitsmerkmale, Ideale, Bindungen und Schwaechen verwenden denselben Baustein-Editor: ausgewaehlte Werte erscheinen als entfernbare Chips, `+` oeffnet passende Vorschlaege und ein eigener Custom-Block kann hinzugefuegt werden.
- [ ] Vorschlaege und Beispiele reagieren auf das aktive Regelset und relevante Charakterparameter; D&D 5.5e und SagaDrive Core erhalten getrennte semantische Pools.

## Edge Cases
- [ ] Leere/teilweise Character-Parameter erzeugen weiterhin gueltige Beispiele und einen gueltigen Prompt ohne erfundene Pflichtwerte.
- [ ] Wechsel des Regelsets aktualisiert Beispiel-/Trait-Kontext ohne alte regelsetfremde Vorschlaege zu erzwingen; bereits vom User ausgewaehlte Custom-Chips bleiben erhalten.
- [ ] Bereits vorhandene Story wird bei `Generieren` nicht automatisch ersetzt; die neue Variante wird separat zur Uebernahme angeboten.
- [ ] Doppelte Trait-Bausteine werden nicht mehrfach gespeichert; leere Custom-Eintraege und ueberlange Eingaben werden abgewiesen.
- [ ] Auto-Rotation und Fade-Timer werden beim Unmount aufgeraeumt und verursachen keine State-Updates nach Unmount.
- [ ] Typed-strict: alle geaenderten TypeScript-Dateien bleiben ohne `any`, `@ts-ignore`, `@ts-nocheck` oder vergleichbare Type-Escapes.

## Security & Data
- LLM-Secrets liegen ausschliesslich in Server-Environment-Variablen und werden nie an den Browser ausgegeben.
- `character-lore` verlangt eine authentifizierte Supabase-Session und leitet User-Identitaet ausschliesslich aus dem verifizierten Token ab.
- Request-Body wird serverseitig auf Typ, Laengen, deklarierte und tatsaechliche Gesamtgroesse sowie erlaubte Ruleset-Werte validiert; Prompt-Inhalte werden als untrusted character/world data markiert.
- Notes werden nicht an die Character-Lore-Generierung uebertragen.
- Keine Roh-Prompts, API-Keys oder komplette Character-Daten werden serverseitig geloggt.
- Optionaler Projekt-/World-Lore-Kontext wird nach erfolgreicher JWT-Verifikation ausschliesslich serverseitig mit dem Service-Role-Key gelesen. Der Key verlaesst die Edge Function nie. Danach prueft die Funktion explizit GM oder aktive Projektmitgliedschaft; bei `projectId + worldId` muss die Welt exakt `project.world_id` entsprechen. Direkter World-Kontext ohne Projekt ist nur fuer den World-Creator erlaubt.
- Der Endpoint begrenzt teure Generierungsaufrufe pro authentifiziertem User in-memory als erste Schutzschicht; spaeter kann dieselbe Schnittstelle an einen persistenten Rate-Limiter angebunden werden.

## Data Migration
- `personality_traits` bleibt `TEXT[]`.
- `ideals`, `bonds`, `flaws` werden rueckwaertskompatibel von `TEXT` nach `TEXT[]` migriert; vorhandener nicht-leerer Text wird zu einem Array mit genau einem Element.
- DTOs, ViewModel und Character-Service verwenden danach fuer alle vier Trait-Gruppen `string[]`.
- Rollback-Hinweis: Arrays mit mehr als einem Element koennen bei Rueckmigration nur verlustbehaftet in einen Einzeltext zusammengefuehrt werden; deshalb ist die Vorwaertsmigration der kanonische Zustand.

## Provider Configuration
- `CHARACTER_AI_PROVIDER`: `openai-compatible` oder `ollama`.
- `CHARACTER_AI_MODEL`: Modellname, fuer echte Generierung erforderlich.
- `CHARACTER_AI_BASE_URL`: Provider-Base-URL; Ollama kann auf `OLLAMA_HOST` zurueckfallen.
- `CHARACTER_AI_API_KEY`: fuer OpenAI-kompatible Provider erforderlich, fuer Ollama optional.
- Bestehende `OLLAMA_HOST` / `OLLAMA_MODEL` koennen als rueckwaertskompatible Fallbacks verwendet werden.

## Regression
- [ ] Info, Look, Stats, Skills, Inventar, Portrait und Save-Flow bleiben funktional.
- [ ] Gold bleibt Primary CTA/Selected, Cyan bleibt Focus/Secondary Hover.
- [ ] Keine neue Frontend-UI-Library und keine neue npm-Dependency.

## Composition Gate
- Code HEAD: `6500adcafd570fe63c97e4534d2f1286f61150bc`
- Feature BASE: `9f0ea4f858e48e73929175d36c36eeec25765a76`
- Verdict: `CLEAR`
- Proof: `.qa/runs/composition-gate-character-background-ai-composer.md`
- Invariant: Ein expliziter Generieren-Klick fuehrt zu genau einem Provider-Aufruf und nur zu einem lokalen Entwurf; persistiert wird erst durch die separate explizite Uebernahme plus normalen Character-Save. Trait-Anzahl erzeugt keinen Fan-out.

## Screenshots
Browser-Verifikation erforderlich fuer BG leer mit Beispiel, Trait-Popover, uebernommenes Beispiel und vorhandene Story mit separater Generation-Variante.

## Implementation Notes
- `src/modules/characters/lore/` enthaelt den typisierten Character-Lore-Context, exakt zehn dynamische lokale Beispiele, regelsetabhaengige Trait-Vorschlaege und den Frontend-Service. Die Beispiele wurden auch fuer den vollstaendig leeren Initialzustand sprachlich geprueft.
- `CharacterBackgroundComposer` zeigt `Generieren`, rotiert Beispiele alle fuenf Sekunden mit einem 180-ms-Fade und haelt KI-Ergebnisse als separate Variante mit explizitem `Uebernehmen`/`Verwerfen`. Der Beispiel-Overlaytext ist pointer-events-frei und blockiert das Textarea nicht. Bei `prefers-reduced-motion` wird die Fade-Transition deaktiviert, der 5-Sekunden-Inhaltswechsel bleibt erhalten.
- `CharacterTraitEditor` wird fuer Persoenlichkeit, Ideale, Bindungen und Schwaechen wiederverwendet; Vorschlaege und Custom-Bloecke werden case-insensitiv dedupliziert, auf 160 Zeichen begrenzt und auf maximal 12 Bloecke je Gruppe beschraenkt. Dieses Limit entspricht dem serverseitig validierten Generation-Context.
- Der CharacterEditor baut den Generation-Context aus Regelset, Klasse/Archetyp, Rasse/Spezies, Setting, Essenzprofil, D&D-Hintergrund, Level, Stats, Skills, Inventar, Aussehen und Trait-Gruppen. Notes sind nicht Teil des Contexts.
- `supabase/functions/character-lore` authentifiziert serverseitig, begrenzt sowohl deklarierte als auch tatsaechlich eingelesene Request-Groesse auf 128 KB, validiert Request-Grenzen und ruft genau einen konfigurierten Provider ueber den gemeinsamen Adapter auf. Der Prompt ist als `character-background-v1` versioniert und behandelt Character-/Lore-Daten als untrusted Prompt-Input.
- Ein Security-Review fand zwei relevante Projekt-/World-Lore-Risiken und beide wurden vor Abschluss behoben: normale aktive Projektmitglieder waeren wegen der bestehenden GM-only-Project-RLS nicht an Lore gekommen, und ein Projekt ohne eigene Welt durfte zwischenzeitlich theoretisch mit einer fremden direkten `worldId` kombiniert werden. Die finale Edge Function verifiziert zuerst den Caller-JWT, nutzt danach den Service-Role-Key nur serverseitig fuer Lookups und erzwingt explizite GM-/aktive-Member-/World-Binding-Regeln.
- `supabase/migrations/002_character_trait_arrays.sql` ist gegen aeltere SagaDrive-Schemata abgesichert und migriert bestehende Einzelwerte verlustfrei in Ein-Element-Arrays. Der Character-Service normalisiert waehrend der Uebergangsphase auch Legacy-Scalarwerte beim Lesen. `src/supabase/DEPLOY_V3.md` fuehrt die Migration jetzt explizit als Deploy-Schritt auf.
- `.env.example` und README dokumentieren Ollama und OpenAI-kompatible Provider, ohne Secrets in den Client zu bringen.
- Test Gate fuer Code HEAD `6500adcafd570fe63c97e4534d2f1286f61150bc`: PASS. Diff-Typed-Strict-Lint: 26 TypeScript-Dateien PASS; Typecheck PASS; Vite Production Build PASS; Deno LTS `deno check` fuer vier geaenderte Edge-Function-TypeScript-Dateien PASS; Deno Prompt-Contract-Tests 4/4 PASS; Secrets-Diff-Scan PASS. Production-Dependency-Audit bleibt informational mit zwei High-Findings.
- Die Prompt-Tests decken vollstaendigen Character-Context, settingneutrales D&D 5.5e, autorisierten World-Lore-Kontext und die nicht-destruktive Alternativgenerierung bei vorhandenem Hintergrund ab.
- Browser-/Screenshot-Verifikation bleibt offen; UI-Checkboxen werden erst nach `@verify-ui` markiert.
