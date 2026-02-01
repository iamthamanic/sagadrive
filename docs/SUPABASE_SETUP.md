# Supabase-Projekt im Repo sichern & wieder aufsetzen

Dieses Dokument beschreibt, wie das Supabase-Projekt aus dem Repo wiederhergestellt wird und was separat gesichert werden muss.

## PROJECT_REF

- **Projekt-Referenz:** `dnhotyjazjnhneqbqocq`
- **Dashboard:** https://supabase.com/dashboard/project/dnhotyjazjnhneqbqocq
- **API-URL:** `https://dnhotyjazjnhneqbqocq.supabase.co`

## Voraussetzungen

- **Supabase CLI:** `supabase --version` (Install: `brew install supabase/tap/supabase`)
- **Docker:** läuft (`docker info`)
- **Login:** `supabase login` (Token im Browser, falls interaktiv nötig)

## Projekt linken

```bash
export PROJECT_REF="dnhotyjazjnhneqbqocq"
supabase link --project-ref "$PROJECT_REF"
```

Bei DB-Passwort-Abfrage: Passwort aus Supabase Dashboard (Settings → Database) oder Umgebungsvariable `SUPABASE_DB_PASSWORD` nutzen.

## Backup erstellen

Nach erfolgreichem Link und laufendem Docker:

```bash
# Schema + Data (timestamped)
supabase db dump -f supabase/backups/schema_and_data_$(date +%Y%m%d_%H%M%S).sql

# Kopie als versionierter Snapshot (dieser wird ins Repo eingecheckt)
cp supabase/backups/schema_and_data_*.sql supabase/backups/schema_and_data_LATEST.sql
```

Optional – Full Dump (größer, für komplette Wiederherstellung):

```bash
supabase db dump -f supabase/backups/full_dump_$(date +%Y%m%d_%H%M%S).sql
```

## Wiederherstellung (neues Projekt)

1. Neues Supabase-Projekt im Dashboard anlegen.
2. `supabase link --project-ref <NEUER_PROJECT_REF>`
3. Migrationen anwenden: `supabase db push` (oder SQL aus `supabase/migrations/` im SQL Editor ausführen).
4. Optional: Daten aus Backup: `psql <connection_string> -f supabase/backups/schema_and_data_LATEST.sql` (oder Restore über Dashboard).
5. Edge Function deployen: `supabase functions deploy make-server-9f6fb44c`
6. In der App `projectId` / ENV auf den neuen PROJECT_REF setzen.

## Im Repo vs. separat sichern

| Was | Im Repo | Separat sichern |
|-----|---------|------------------|
| DB-Schema (Migrationen) | ✅ `supabase/migrations/*.sql` | – |
| Edge Functions Source | ✅ `supabase/functions/make-server-9f6fb44c/` | – |
| Backup Snapshot (LATEST) | ✅ `supabase/backups/schema_and_data_LATEST.sql` | Weitere Backups (timestamped) |
| PROJECT_REF | ✅ `docs/SUPABASE_SETUP.md`, `src/utils/supabase/info.tsx` | – |
| DB-Passwort | – | ✅ Dashboard / Passwort-Manager |
| Service Role Key | – | ✅ Dashboard / ENV, nie ins Repo |
| Anon/Public Key | ✅ aktuell in `src/utils/supabase/info.tsx` | Für Produktion: ENV empfohlen |

## Alte Supabase-Dateien im Repo

Die ursprünglichen Dateien liegen weiterhin unter `src/supabase/` (Migrationen, Schema-Skripte, Functions). Die **kanonische** Quelle für Wiederaufsetzen ist:

- **Migrationen:** `supabase/migrations/` (mit Timestamp-Prefix)
- **Functions:** `supabase/functions/make-server-9f6fb44c/`

Diese Struktur ist Vercel-/Supabase-CLI-kompatibel und erlaubt, das Supabase-Projekt bei Bedarf zu löschen und aus dem Repo neu aufzusetzen.
