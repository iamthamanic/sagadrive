# Composition Gate — world-look-preview

- Issue: #350
- Feature slug: world-look-preview
- HEAD_SHA: 8740861f2bc3c5e79a1f6b100a9654916c5cb3b4
- BASE_SHA: 619ef971bfe15f1f7f5acf56182eaef40b9107a3
- Verdict: CLEAR

## Event
GM temporarily previews a Look in Saga World context, then optionally applies it as saga default or resets preview; may deep-link to Library Look Editor with return path.

## Hop chain
WorldLookPreviewPanel (local previewLookId) → optional projectService.updateProjectLookSettings on Anwenden → projects.default_look_profile_id (existing #348 path + trigger). Look bearbeiten → setLookEditorReturnPath → pathForLookEdit → App look-edit onBack takeLookEditorReturnPath → Saga world section.

## Simulations
- N-actors: non-GM can preview locally; Apply disabled.
- Invalid/missing: archived preview on Apply rejected; archived saved default → system sentinel + notice.
- Two consumers / crash: Preview state is local React state only until Apply; no Look blob fan-out; reserved domains render as unavailable without throw.

## Flags
none
