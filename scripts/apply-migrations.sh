#!/usr/bin/env bash
# Apply SagaDrive SQL migrations to the self-host Postgres container (sagadrive-db).
# Documented path: README_SELFHOST + README.md migration order. Not cloud.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTAINER="${SAGADRIVE_DB_CONTAINER:-sagadrive-db}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-postgres}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '$CONTAINER' is not running. Start it with: docker compose up -d supabase-db" >&2
  exit 1
fi

migrations=(
  001_initial.sql
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
  015_inventory_item_definitions.sql
  016_character_inventory_v2.sql
)

only="${1:-}"

apply_one() {
  local file="$1"
  local path="$ROOT/supabase/migrations/$file"
  if [[ ! -f "$path" ]]; then
    echo "Missing migration: $path" >&2
    exit 1
  fi
  echo "→ applying $file"
  # Prefer in-container /migrations mount; fall back to stdin.
  if docker exec "$CONTAINER" test -f "/migrations/$file"; then
    docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -f "/migrations/$file"
  else
    docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" <"$path"
  fi
}

if [[ -n "$only" ]]; then
  apply_one "$only"
else
  for file in "${migrations[@]}"; do
    apply_one "$file"
  done
fi

echo "✓ migrations applied on $CONTAINER"
