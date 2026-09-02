# SagaDrive (SagaDrive)

SagaDrive ist eine webbasierte Rollenspiel-Plattform für Spielleitungen und Spieler, um Kampagnen gemeinsam zu planen und zu spielen. Das Tool bündelt zentrale Bereiche wie Projekte/Kampagnen, Charakterverwaltung, Sessions, Rulesets und einen Marketplace in einer Oberfläche.

Dieses Repository enthält das React + Vite Frontend mit Supabase-Integration und modularer Feature-Struktur (Projects, Characters, Sessions, Rulesets, Marketplace).

Original Design-Basis:  
https://www.figma.com/design/XyboDSHba8TNFw0Bb5uUs4/SagaDrive

## Tech Stack

- React 18
- Vite 6
- TypeScript
- Tailwind CSS 4
- Radix UI + shadcn-basierte UI-Komponenten
- Supabase (Auth, DB, Edge Functions)

## Voraussetzungen

- Node.js 20+ (empfohlen: aktuelle LTS)
- npm 10+
- Deno LTS für lokale `npm run test-gate`-Prüfungen, sobald `supabase/functions/**/*.ts` im Branch-Diff geändert wurde

## Lokale Entwicklung

1. Abhängigkeiten installieren:

```bash
npm install
```

2. Dev-Server starten:

```bash
npm run dev
```

Der lokale Entwicklungsserver läuft auf:

- `http://localhost:3004`

Der Port ist im Projekt fest konfiguriert (`vite.config.ts`):

- `server.port = 3004`

## Build

Produktions-Build erstellen:

```bash
npm run build
```

Output-Verzeichnis:

- `build/`

## SagaDrive Core Character Editor

Der aktuelle **Neuer-Charakter-Flow** konzentriert sich bewusst ausschließlich auf **SagaDrive Core**. „Charakter erstellen“ öffnet zuerst einen Zwei-Karten-Chooser (eigener Charakter vs. Preset). Der Character Editor verwendet fünf Haupttabs:

- `Spezies`
- `Parameter` (Attribute / Kompetenzen inkl. Hintergrund-Framework / Archetyp / Essenz)
- `Look`
- `Inventar`
- `Einstellungen` mit Subtabs `Statistik` (Abenteuer-Bögen) und `Preset` (versionierte Sheet-Snapshots, Migrationen `012`/`013_character_presets`)

Die UI behandelt SagaDrive Core nicht als umbenannte D&D-Maske. Sie verwendet die Core-Begriffe **Spezies**, **Archetyp**, **Essenz**, **Ausdauer**, **Verstand** und **Wahrnehmung**, die Startattributverteilung `4,3,3,2,2,1`, alle 18 Core-Fertigkeiten sowie die definierten Fertigkeitsbudgets und -grenzen. Die fünf Primärarchetypen liefern ihre jeweilige Rang-I-Kernfähigkeit automatisch; freie Platzhalterfähigkeiten werden nicht erzeugt.

Spezies und ihre angeborenen Merkmale werden gemeinsam im Spezies-Tab konfiguriert. Jede Core-Spezies besitzt eine feste Merkmals-Allowlist und muss genau `3 / 3` Speziespunkte ausgeben. Konfigurierbare Merkmale verlangen ihre Details direkt an der Merkmalskarte. `Alien` dient als freier Spezies-Builder mit verpflichtendem Profilnamen und optionaler Körperbeschreibung; `Außergewöhnlicher Körperbau` bleibt bis zur Definition verbindlicher Varianten sichtbar, aber nicht auswählbar.

Regelbegriffe und abgeleitete Werte besitzen kontextuelle Hilfen. Im Kompetenzen-Subtab verbinden Attributkarten per Bracket-Linien die davon abhängigen abgeleiteten Werte (Filter, ausgegraute Restwerte, Wert-Flash). Attribute, Fertigkeitsbudgets, Verteidigung, Gesundheit, Widerstände, Erholung und Traglast werden aus den Core-Regeln abgeleitet statt frei eingegeben. Das Inventar verwendet **Lastpunkte** statt fester Slots; `Traglast = 5 + 2 × Stärke` und Überlastungsfolgen werden direkt in der UI angezeigt. Der Look-Tab ist ausdrücklich kosmetisch und verändert keine Regelwerte.

Die regelrelevanten Character-Creation-Daten werden getrennt gespeichert:

- `attributes` – SagaDrive-Attribute
- `skills` – berechnete Fertigkeitsstände
- `sagadrive_profile` – Essenz, Speziesmerkmale samt strukturierten Merkmalsdetails und optionalem Alien-Speziesprofil, mechanischer Hintergrund, Archetyp-Punkt, Drive/Momentum
- `background_story` – freie bzw. generierte Lore
- `notes` – freie Spielnotizen

Alte Attributdaten mit `constitution`, `intelligence` und `wisdom` werden beim Lesen weiterhin auf `Ausdauer`, `Verstand` und `Wahrnehmung` normalisiert. D&D-Metadaten bleiben im Datenvertrag aus Kompatibilitätsgründen erhalten, sind aber **nicht Teil des aktuell ausgebauten Neuer-Charakter-Flows**.

## Character-Lore-KI

Der CharacterEditor besitzt eine Hintergrundgeschichten-Pipeline. Die UI erzeugt einen typisierten Character-Context; die Supabase Edge Function `character-lore` baut daraus serverseitig den versionierten Prompt und ruft den konfigurierten Provider auf. API-Keys werden nie an den Browser ausgeliefert.

Im Hintergrund-Tab kann optional ein für den eingeloggten User sichtbares Projekt als **Kampagnen-Lore** gewählt werden. Der Browser sendet dabei `projectId` und, falls vorhanden, die verknüpfte `worldId`. Diese IDs sind nur untrusted Kontext-Hinweise: Die Edge Function verifiziert Projektmitgliedschaft bzw. GM-Rechte und die Projekt-Welt-Zuordnung erneut serverseitig, bevor Lore gelesen wird. Ohne Auswahl bleibt die Generierung setting-neutral.

Projektmitgliedschaft ist dabei selbst Teil der Sicherheitsgrenze. `supabase/migrations/004_project_membership_security.sql` entfernt browserseitige Schreibrechte auf `project_id`, `user_id`, `role` und `status`. Self-Service-Beitritt läuft ausschließlich über die `SECURITY DEFINER`-RPC `join_project_by_code`; die eigene Charakterzuordnung über `set_my_project_character`. Gekickte Mitgliedschaften können sich nicht selbst reaktivieren oder löschen. Die Migration härtet auch Legacy-Ressourcen-Policies auf aktive Mitgliedschaften und erzwingt eine case-insensitiv eindeutige Projektcode-Identität.

Unterstützte Provider:

- `ollama`
- `openai-compatible`

Relevante Server-Variablen:

```bash
CHARACTER_AI_PROVIDER=ollama
# CHARACTER_AI_MODEL=llama3.2
# CHARACTER_AI_BASE_URL=http://ollama:11434
# CHARACTER_AI_API_KEY=
CHARACTER_AI_RATE_LIMIT_PER_MINUTE=6
# CORS fail-closed: localhost only when unset; set exact origin(s) for production
CHARACTER_AI_ALLOWED_ORIGIN=http://localhost:3004
```

Für Ollama können `OLLAMA_MODEL` und `OLLAMA_HOST` als Fallback verwendet werden. Bei `openai-compatible` sind `CHARACTER_AI_BASE_URL`, `CHARACTER_AI_API_KEY` und ein Modell erforderlich. `CHARACTER_AI_ALLOWED_ORIGIN` defaultet **nicht** auf `*`.

`CHARACTER_AI_RATE_LIMIT_PER_MINUTE` wird nicht pro Edge-Process im Speicher gezählt. Die Migration `supabase/migrations/003_character_lore_rate_limits.sql` legt einen persistenten, atomaren Postgres-Limiter an. Jede authentifizierte User-ID teilt dadurch dasselbe Minutenkontingent über alle Edge-Runtime-Instanzen hinweg. Die RPC ist nur für `service_role` ausführbar. Ist der persistente Limiter nicht verfügbar oder nicht migriert, schlägt `character-lore` vor dem Provider-Aufruf fail-closed mit `503` fehl.

Der Prompt liegt versioniert unter `supabase/functions/_shared/character-lore-prompt.ts`. SagaDrive Core verwendet den gewählten Character-Kontext als Lore-Rahmen. Freie Charakter-Notizen werden bewusst nicht an die Generierung übertragen.

`ruleset_key` bleibt unabhängig vom optionalen `ruleset_id` als stabiler Editor-Key gespeichert. `dnd_background` bleibt für bestehende D&D-Daten erhalten; `background_story` und `sagadrive_profile` sind davon getrennt.

Character-Portraits werden über denselben konfigurierten Supabase-Client direkt in den privaten Storage-Bucket `character-portraits` geladen. Dadurch funktioniert `Portrait erzeugen` sowohl gegen Hosted Supabase als auch im dokumentierten Self-Host-Stack mit `VITE_SUPABASE_URL`. Migration `006_character_portrait_storage.sql` legt den privaten Bucket mit 5-MB-/MIME-Limits an und erlaubt authentifizierten Nutzern ausschließlich Zugriff auf Objekte unter ihrem eigenen User-ID-Pfad. Der CharacterEditor speichert weiterhin eine signierte Portrait-URL.

## Avatar-Asset-Katalog

Die 3D-Vorschau löst die gewählte SagaDrive-Spezies über stabile Avatar-Manifeste auf. Remote-Fallbacks werden nur mit dokumentierter Provenienz und Lizenz ausgeliefert und auf einen konkreten Upstream-Commit gepinnt; veränderliche `main`-URLs sind nicht Teil des freigegebenen Katalogs. Spezies ohne nachweisbar passendes Spezialasset verwenden ausdrücklich gekennzeichnete neutrale Fallbacks statt ungeprüfter Modelle. Self-Host-Installationen können dieselben Manifest-IDs über `VITE_AVATAR_ASSET_BASE_URL` mit eigenen Dateien bedienen.

Die vollständige Zuordnung, Lizenzprüfung und Aufnahmeregeln stehen in `docs/avatar assets.md`.

Für den aktuellen Character-/Lore-Stand sind bei bestehenden Datenbanken diese Migrationen in Reihenfolge erforderlich:

```text
002_character_trait_arrays.sql
003_character_lore_rate_limits.sql
004_project_membership_security.sql
005_character_ruleset_metadata.sql
006_character_portrait_storage.sql
007_sagadrive_character_profile.sql
008_world_profiles.sql
009_character_adventure_arcs.sql
010_characters_v3_columns.sql
011_seed_local_admin.sql
012_character_presets.sql
013_character_presets_rls_hardening.sql
014_character_abilities_emotion_profiles.sql
```

`002` stellt die vier Trait-Gruppen auf Arrays um, `003` aktiviert die persistente Character-Lore-Quota, `004` macht Projektmitgliedschaft zu einem server-/GM-kontrollierten Autorisierungsnachweis, `005` ergänzt die stabile Regelset-/D&D-Hintergrund-Persistenz, `006` richtet den privaten owner-scoped Portrait-Storage ein, `007` ergänzt `sagadrive_profile` sowie persistente Character-Notizen, `008` legt owner-scoped Weltprofile an, `009` speichert Abenteuer-Bögen inkl. Entwicklungsgeschichte, `010`–`013` bringen V3-Spalten/Presets nach und `014` ergänzt `abilities`/`emotion_profiles` für Character-Save. Bei Schema V3 zuerst die kanonischen RLS-Policies aus `src/supabase/schema_v3_rls.sql` anwenden und danach die Migrationen in der genannten Reihenfolge.

## Quality Gates

GitHub Actions führt auf Pushes sowie auf Pull Requests gegen `main` die technischen und semantischen Gates aus:

```bash
npm run test-gate
npm run composition-gate
```

Zusätzlich läuft nach einem erfolgreichen Test Gate ein Chromium-Playwright-Job mit:

```bash
npm run test:e2e
```

Die Browser-Evidence und Playwright-Berichte werden im CI-Lauf als Artifact `character-editor-browser-evidence` hochgeladen.

## Recent changes

- **2026-09-02** — Skill Progression v2 Character Editor UX: 7/2/1 Startquellen, stackbare Hintergrundpunkte, Formelpanel (global/applied EB), Level-3–19-Slots; Migration `014` (`abilities`/`emotion_profiles`); Bibliothek lädt Charaktere zum Bearbeiten (`feat/skill-progression-v2-character-editor-ux`, #91)
- **2026-09-02** — Character Presets hardening: migration `013` (source ownership + origin=user RLS), snapshot re-validate on read/bootstrap, `normalizeSafeUrl` for portrait URLs (`feat/character-presets`)
- **2026-09-02** — Character Presets MVP: Create-Chooser (eigen/preset), versionierte Presets unter Einstellungen → Preset, Migration `012_character_presets` (`feat/character-presets`)
- **2026-09-01** — Startup- & Bibliothek-Performance: Route-Lazy-Loading (Three.js/VRM aus Initial-Chunk), schnellerer Auth-Fail-open, DevTrack nur in Dev, farbiges Favicon, Summary-DTOs + Batch-Queries für Bibliothek/Dashboard, Tab-lazy Fetch + 30s Cache (`feat/startup-library-performance`)
- **2026-08-31** — Hintergrund: Template-Karussell inkl. Custom-Slide, Bracket-Connector zu Pool-Skill-Nodes, Training/Spezialisierung am Node (`feat/background-skill-nodes`)
- **2026-08-31** — Kompetenzen: Attributkarten verbinden per Bracket-Linien die abhängigen abgeleiteten Werte; Filter + ausgegraute Restwerte, Wert-Flash, Manöverwiderstand-Hinweise im Dropdown (`feat/attribute-derived-connector`)
- **2026-08-28** — Avatar-Asset-Katalog: commit-gepinnte CC0-Provenienz, explizite neutrale Fallbacks und lizenzgeprüftes Ork-VRM (`issue/3-avatar-race-asset-catalog`, siehe `docs/avatar assets.md`)
- **2026-08-27** — Bibliothek-Tab Welten (owner-scoped Weltprofile, Modul Speziesentwicklung); Character Editor: Notizen unter Hintergrund, Tab Statistik mit Abenteuer-Bögen (`feat/world-profiles-and-statistics`, siehe `docs/world profiles.md`)
- **2026-08-27** — Speziesmerkmale: speziesgebundene Allowlists, exakt 3/3 Punkte, Merkmalsdetails direkt an den Cards, Alien-Profil-Builder, `Erweitertes Klettern`/`Erweitertes Schwimmen`; Talente-Subtab entfernt (`feat/species-traits-by-species`)
- **2026-08-27** — Character Editor Chrome: Tab „Spezies“, Name/Geschlecht/Stufe in Preview, Regelset neben Vorschau, Archetyp-Kernfähigkeit einklappbar, flachere Archetyp-Karten (`feat/alien-species-sketch`)
- **2026-08-27** — Spezies-Karussell: Wappen pro Spezies (Shimmer/Puls bei Auswahl), Colorway-Header, überarbeitete Skizzen und Skalierung Zwerg/Halbling (`feat/character-editor-ui-polish`)

Lokal kann dieselbe Browser-Regression ausgeführt werden:

```bash
npx playwright install chromium
npm run test:e2e
```

`test-gate` führt die technischen Checks aus: diff-spezifischer Typed-Strict-Lint, Typecheck, Produktions-Build, `deno check` für geänderte Supabase-Edge-Function-TypeScript-Dateien, Deno-Tests, den Project-Membership-Security-Contract, den Character-Editor-Regression-Contract, die Avatar-Runtime-/Asset-Katalog-Regressionen und den Secrets-Diff-Scan. GitHub Actions stellt dafür Deno LTS über `denoland/setup-deno@v2` bereit. `npm audit --omit=dev` wird zusätzlich sichtbar protokolliert.

`composition-gate` prüft die Bedeutung über Modul-/Service-/Backend-Hops. Reine Docs-/Tooling-Diffs und sichere Single-Hop-Diffs werden dokumentiert übersprungen. Bei Multi-Hop-, Persistenz-, Worker-, Queue-, Webhook- oder Side-Effect-relevanten Änderungen muss ein aktueller Proof unter `.qa/runs/composition-gate-<slug>.md` mit `CLEAR` oder begründetem `SKIPPED` vorliegen.

## Wichtige Projektstruktur

- `src/` – Haupt-Frontend-Code
- `src/components/` – UI- und Feature-Komponenten
- `src/modules/` – Domänenmodule (projects, characters, sessions, rulesets, worlds, marketplace)
- `src/lib/` – gemeinsame Clients/Provider (u. a. Supabase, Auth)
- `src/supabase/` – SQL-Skripte, Migrations und Deploy-Hilfen
- `supabase/functions/` – Supabase Edge Functions
- `supabase/config/` – lokale Supabase-Konfiguration

## Relevante Doku im Repo

- `INTEGRATION.md`
- `README_SELFHOST.md`
- `FEATURE_COMPARISON.md`
- `src/ARCHITECTURE.md`
- `src/SUPABASE_SETUP.md`
- `src/AUTH_SETUP.md`
- `docs/avatar assets.md`
- `docs/world profiles.md`
- `src/modules/marketplace/README.md`
- `src/supabase/DEPLOY_V3.md`

## Hinweise

- Beim Start mit `npm run dev` öffnet Vite automatisch den Browser (`server.open = true`).
- Falls Port `3004` lokal belegt ist, den belegenden Prozess beenden oder den Port in `vite.config.ts` anpassen.
