# Composition Gate — character-portrait-auto-snapshot

- HEAD_SHA: WORKTREE (uncommitted since 185a047 / PR #245)
- Date: 2026-09-19
- Verdict: CLEAR

## Event
3D character materializes (Meshy success or GLB import) → one portrait PNG is uploaded to owner-scoped `character-portraits` → editor `portraitUrl` updates.

## Hop chain
Producer (`AvatarMeshyPanel.onSuccess` / `AvatarImportPanel.onImported`)
→ `pendingAutoPortraitRef=true` + `importedModelUrl`
→ `AvatarCanvas` loadModel → status `ready`
→ `onRuntimeReady` → `captureAndUploadPortrait`
→ `CharacterStudioRuntime.capturePortraitDataUrl` (fitPortraitCamera → same WebGL renderer)
→ `characterService.uploadPortrait` (auth uid path, MIME/size gate)
→ Storage `character-portraits/{uid}/{uuid}.png` + signed URL
→ `setPortraitUrl` → sheet thumbnail / save payload

Manual „Portrait erzeugen“ joins at `captureAndUploadPortrait` (same upload hop).

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | 1 success → 1 upload for that owner | pending flag clears once; upload path uses `getAuthenticatedUserId()` folder | pass |
| invalid / missing | no canvas / not ready → toast, no orphan upload | `isReady` / null blob → toast error; bucket missing → Storage error toast | pass |
| 2 consumers / crash | no double auto-upload on remount without new pending | pending cleared before async upload; remount without pending does not re-fire auto | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| — | — | — | — | — |

## Skip reason
n/a
