
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
  
