# Acceptance — avatar-inspect-camera-frames

## Intent
In the Character Editor 3D preview, let users inspect body regions (face, shoes, etc.) instead of only orbiting around the torso center. Provide an Inspect mode (pan + closer zoom) and quick framing presets, plus reset to the default full-body view.

## Preconditions
- Avatar canvas ready with a loaded VRM/GLB.
- Existing OrbitControls in CharacterStudioRuntime.

## Happy Path
- [ ] Default mode: pan off, current distance/polar limits (no regression).
- [ ] „Untersuchen“ enables pan, closer minDistance, freer polar angles; hint text explains drag/pan.
- [ ] Presets Ganzkörper / Portrait / Gesicht / Füße move orbit target + camera to that region (bones when available, else AABB bands).
- [ ] „Zurücksetzen“ restores default camera + exits inspect constraints to normal fit.
- [ ] Portrait capture still temporarily uses fitPortraitCamera and restores prior camera.

## Edge Cases
- [ ] Controls disabled / no-ops when runtime not ready.
- [ ] Non-VRM GLB without head/foot bones still frames via height bands.
- [ ] Switching inspect off without reset keeps current look but restores stricter limits.

## Security Coverage
- F-01: UI controls only; no new network/HTML sinks.
- Out of scope: B-xx API / storage.

## Out of scope
- Double-click raycast body-part pick.
- Changing default editor layout beyond compact control row under the canvas.

## Implementation Notes
- `CharacterStudioRuntime`: `setInspectMode`, `applyCameraFrame`, `resetCamera`, `fitRegionCamera`, humanoid foot bones.
- `AvatarCameraViewControls` under canvas in `AvatarCanvas` (Ganzkörper / Portrait / Gesicht / Füße + Untersuchen + Zurücksetzen).
- Close frames auto-enable inspect; model reload resets to default orbit.
