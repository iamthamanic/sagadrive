# Acceptance — Character portrait auto-snapshot + bucket

## Goal

After Meshy generation or GLB/VRM import, automatically create a portrait snapshot (head + upper torso) and store it via the same path as „Portrait hochladen“. Manual „Portrait erzeugen“ uses the same framed capture → `uploadPortrait`.

## Preconditions

- Migration `006_character_portrait_storage.sql` applied (bucket `character-portraits` + RLS).
- Self-host: `bash scripts/apply-migrations.sh 006_character_portrait_storage.sql` if bucket missing.
- Authenticated user; Storage policies allow `{uid}/*` paths.

## Checks

- [ ] `storage.buckets` contains `character-portraits` (private, 5 MB, image MIME).
- [ ] „Portrait hochladen“ succeeds (no Bucket not found).
- [ ] „Portrait erzeugen“ captures head + upper torso (not full-body wide shot) and uploads.
- [ ] After Meshy success, when 3D preview becomes ready, portrait auto-uploads (toast: Portrait automatisch erzeugt).
- [ ] After custom import success, same auto-portrait behavior.
- [ ] Live orbit camera is restored after capture (preview framing unchanged for the user).
- [ ] Portrait preview thumbnail updates in the editor.

## Out of scope

- Persisting portrait to DB without Save (still draft `portraitUrl` until character save — same as upload).
- Meshy Auto-Rig pipeline.
