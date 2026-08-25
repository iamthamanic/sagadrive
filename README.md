
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

## Character-Lore-KI

Der CharacterEditor besitzt eine vorbereitete Hintergrundgeschichten-Pipeline. Die UI erzeugt einen typisierten Character-Context; die Supabase Edge Function `character-lore` baut daraus serverseitig den versionierten Prompt und ruft den konfigurierten Provider auf. API-Keys werden nie an den Browser ausgeliefert.

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
# CHARACTER_AI_ALLOWED_ORIGIN=http://localhost:3004
```

Für Ollama können `OLLAMA_MODEL` und `OLLAMA_HOST` als Fallback verwendet werden. Bei `openai-compatible` sind `CHARACTER_AI_BASE_URL`, `CHARACTER_AI_API_KEY` und ein Modell erforderlich.

Der Prompt liegt versioniert unter `supabase/functions/_shared/character-lore-prompt.ts`. D&D 5.5e bleibt ohne autorisierten Welt-Kontext setting-neutral. SagaDrive Core verwendet die gewählten Character- und Setting-Parameter als Lore-Rahmen. Notizen aus dem Notes-Tab werden bewusst nicht an die Generierung übertragen.

Die Migration `supabase/migrations/002_character_trait_arrays.sql` stellt `ideals`, `bonds` und `flaws` auf mehrere Textbausteine um und bewahrt vorhandene Einzelwerte als Ein-Element-Arrays.

## Quality Gates

GitHub Actions führt auf Pushes sowie auf Pull Requests gegen `main` zwei getrennte Gates aus:

```bash
npm run test-gate
npm run composition-gate
```

`test-gate` führt die technischen Checks aus: diff-spezifischer Typed-Strict-Lint, Typecheck, Produktions-Build, `deno check` für geänderte Supabase-Edge-Function-TypeScript-Dateien und Secrets-Diff-Scan. GitHub Actions stellt dafür Deno LTS über `denoland/setup-deno@v2` bereit. `npm audit` wird zusätzlich sichtbar protokolliert; bestehende Dependency-Findings sind derzeit informational und werden separat behoben.

`composition-gate` prüft die Bedeutung über Modul-/Service-/Backend-Hops. Reine Docs-/Tooling-Diffs und sichere Single-Hop-Diffs werden dokumentiert übersprungen. Bei Multi-Hop-, Persistenz-, Worker-, Queue-, Webhook- oder Side-Effect-relevanten Änderungen muss ein aktueller Proof unter `.qa/runs/composition-gate-<slug>.md` mit `CLEAR` oder begründetem `SKIPPED` vorliegen.

## Wichtige Projektstruktur

- `src/` – Haupt-Frontend-Code
- `src/components/` – UI- und Feature-Komponenten
- `src/modules/` – Domänenmodule (projects, characters, sessions, rulesets, marketplace)
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
- `src/modules/marketplace/README.md`
- `src/supabase/DEPLOY_V3.md`

## Hinweise

- Beim Start mit `npm run dev` öffnet Vite automatisch den Browser (`server.open = true`).
- Falls Port `3004` lokal belegt ist, den belegenden Prozess beenden oder den Port in `vite.config.ts` anpassen.
  
