# Debug Report — `character-portrait-bucket-not-found`

**Date:** 2026-09-18  
**Project:** sagadrive  
**Shell:** web  
**Repro grade:** full (storage evidence + code path)

---

## Summary

Portrait upload/generate fails because the private Storage bucket `character-portraits` is missing from the local self-host DB, even though migration `006_character_portrait_storage.sql` defines it.  
**Confidence:** high

---

## Bug description

| | |
|--|--|
| **Expected** | „Portrait erzeugen“ and „Portrait hochladen“ store an image in `character-portraits` and set `portraitUrl`. |
| **Actual** | Both paths toast/fail with bucket-not-found (`Failed to upload portrait: … Bucket not found`). |
| **Steps** | 1. Open Character Editor with a loaded 3D preview. 2. Click „Portrait erzeugen“ or „Portrait hochladen“. 3. Observe error. |

---

## Reproduction

- **Command / URL:** local Vite (`npm run dev`, port from `.qa/project.yaml`) + self-host Supabase (`sagadrive-db`)
- **Playwright spec:** none (storage-level repro)
- **Result:** reproduced via DB query + code path
- **Hard path:** no

```text
docker exec sagadrive-db psql -U postgres -d postgres \
  -c "select id, name from storage.buckets order by name;"

# Before fix:
# character-avatars | item-models | item-thumbnails
# (no character-portraits)

# Client path:
# CharacterEditor.uploadPortrait → characterService.uploadPortrait
# → supabase.storage.from('character-portraits').upload(...)
```

---

## Evidence

### Storage

- Bucket list before fix: `character-avatars`, `item-models`, `item-thumbnails` only.
- Migration file present: `supabase/migrations/006_character_portrait_storage.sql` (INSERT + RLS policies).
- `scripts/apply-migrations.sh` lists `006` — migration was never applied (or lost) on this DB volume; later avatar/item bucket migrations (`017`/`018`/`024`) were present.

### Code

- `CHARACTER_PORTRAIT_BUCKET = 'character-portraits'` in `supabase-character.repository.ts`
- Both UI buttons share `uploadPortrait()` → same Storage call

### Console / Network

- Expected Storage API failure: bucket id unknown → message containing `Bucket not found` (surfaced in toast via `Failed to upload portrait: …`)

---

## Knowledge search

1. Repo: `006_character_portrait_storage.sql`, README portrait section, `uploadPortrait` repository path  
2. Local DB: `storage.buckets` missing `character-portraits` while sibling buckets exist  

---

## Root cause

Local Postgres Storage had no `character-portraits` bucket. Client upload correctly targets that bucket name; Supabase Storage rejects the request before RLS/MIME checks. Manual generate and file upload share one upload path, so both fail identically. Framing/auto-snapshot gaps are separate product gaps, not the bucket error.

**Confidence:** high  
**Repro grade:** full  
**Minimal fix:** apply `006_character_portrait_storage.sql` (done on `sagadrive-db`); keep migration in apply script. Then implement head+torso snapshot framing + auto-capture after Meshy/import (product ask).  
**Regression guard:** assert bucket exists after migrate; UI smoke: upload + generate both succeed without bucket error.

---

## Follow-up (same turn — user asked to fix after debug)

- [x] Apply `006` on local DB  
- [x] Frame portrait camera (head + upper torso)  
- [x] Auto portrait after Meshy success / GLB import  
- [x] Manual „Portrait erzeugen“ uses same framed capture → `uploadPortrait`
