# Acceptance — liveact-face-anchors-character-persist

<!-- Face Mapping Speichern → appearance.avatar.face_anchors + overlay uses saved anchors -->

## Intent
Manuelles Face Mapping (Speichern) persistiert als `SagaDriveFaceAnchorsV1` auf dem Charakter-Avatar (`appearance.avatar.face_anchors`) und steuert nach Reload das Character-Face-Overlay — nicht nur die laufende Sitzung.

## Preconditions
- Character Editor mit geladenem 3D-Modell
- Face Setup → Face Mapping geöffnet; mindestens ein gültiger Marker gesetzt

## Happy Path
- [ ] Face Mapping **Speichern** bindet Manifest session-lokal **und** schreibt `face_anchors` in den Avatar-Editor-State (`sagaDriveDirty`)
- [ ] Charakter **Speichern** persistiert `appearance.avatar.face_anchors` über den bestehenden Character-Save
- [ ] Edit-Reload hydriert `face_anchors`; Runtime bindet Override **vor** Sidecar-Fetch (Override gewinnt)
- [ ] Nach Speichern: `characterFaceMappingAvailable` true; Character-Face-Overlay kann die gesetzten Anker zeigen
- [ ] typed-strict + liveact-face-anchors-character-persist-check grün

## Edge Cases
- [ ] Ungültiges Manifest wird nicht committed (parse/validate)
- [ ] Modellwechsel (Import / Meshy / Species-Template) löscht `face_anchors` (Topology-Mismatch)
- [ ] Ohne `face_anchors`: Sidecar `face-anchors.json` bleibt Fallback
- [ ] Expand-Modal Speichern aktualisiert Hook-State + Main-Runtime-Bind

## Scope
In: DTO field, editor hydrate/commit, runtime override precedence, Speichern callback, overlay availability refresh, deterministic check.
Out: Server-upload von face-anchors.json neben GLB, Authoring-Sidecar, Retarget-Drive aus Manual-Ankern, Auto-Mapping (#421).

## Security Coverage
- P-xx / character JSONB: nur Mesh-Bindings (nodeIdentity + triangle barycentrics), keine Webcam-/Biometrie-Landmarks
- Legacy readers: unknown field ignored

## Implementation Notes
- Field: `CharacterAvatarDto.face_anchors?: SagaDriveFaceAnchorsManifestV1`
- Speichern → `commitFaceAnchors` + `bindFaceAnchorsManifestSession`; Charakter-Speichern unverändert über `currentAvatar`
