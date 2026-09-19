# Avatar V2 — Custom Creature „Original behalten“ (#266)

Parent: Epic #248 · Depends: #265 · Slug: `avatar-v2-custom-creature-flow`

## Product rule

Faruk-artige / freie Körperformen sind first-class `custom-creature`. Das Original-Mesh
bleibt der produktive Pfad. Humanoid-Conversion ist optional und als Interpretation
gekennzeichnet — nie stillschweigend erzwungen.

## Vertical slice

1. Import → Analyze erkennt `ready-custom` / `custom-creature`.
2. UI empfiehlt **Original behalten** und erklärt: keine Auto-Family-Kleidung,
   Auto-Rig optional (#265), Capabilities nur nach Analyzer.
3. Keep-Seed → Editor: `bodyFamily=custom`, `allowHumanoidMorph=false`,
   Morph-Evidence leer (fail-closed).
4. Optional: „Auf SagaDrive-Körper übertragen“ mit Warnung
   **humanoide Interpretation**.

## Domain

- `custom-creature-flow-v1.ts` — Guidance + Editor-Seed + Faruk fixture slice
- Reuse: `import-original-flow-v1`, `custom-rig-benchmark-v1`, `editor-surface-resolver-v1`

## UI

- `AvatarCustomCreatureGuidance` in `AvatarImportPanel`
- Conversion warn already in `AvatarBodyConversionPanel`
- Keep-Toast in `CharacterEditor` for custom anatomy

## Out of scope

- Custom garment auto-fit
- Creature animation library
- Enduser provider switch
