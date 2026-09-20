# Avatar V2 — Asset Authoring Pipeline

**Status:** Binding for #254 / Epic #248  
**Slug:** `avatar-v2-asset-authoring-pipeline`  
**Contract:** `SagaDriveAssetAuthoringV1`

## Intent

Reproduzierbarer Workflow **Generate → Select → Normalize → Validate → Publish** für kanonische SagaDrive-Assets (Base Bodies, Species Templates, Wearables, Traits, Props). **Provider-neutral** — Meshy ist der aktuelle Adapter; Tripo (oder andere) ergänzen denselben Generation Contract **ohne** Domain-/UI-Neudesign.

## Workflow

1. **Generate** — Aufruf nur über `SagaDriveAvatar3dGenerationV1` / Adapter-Facade (keine hardcoded Meshy-Fachlogik in Domain).
2. **Select** — mehrere Kandidaten regelbasiert gegen Golden-Kriterien scoren (`selectAssetAuthoringCandidate`); kein Chat-/User-Gate im Runner.
3. **Normalize** — Pose/Scale/Units + Modular GLB extras (`SagaDriveModularAvatarGlbV1`) wo Kind es verlangt.
4. **Validate** — Pose, Modular-Contract, Rig/Morph/Material-Hints, Style-Tags (adult stylized, MToon, no-chibi).
5. **Publish** — Manifest mit Provider/Model/Prompt/References/Settings/Provenance/Version/Checksum; Remote-Output vor Publish erneut validieren.

## Visuelle Richtung (Golden)

Kanonisch: [`docs/character-visual-styleguide.md`](character-visual-styleguide.md)

- Adult stylized game look, SagaDrive MToon
- Richtung: **Palworld × Overwatch, soft-real** (leichte Real-Anatomie, kein Photoreal, kein Chibi)
- Golden refs: `assets/species-3d/human/golden/human-{male|female}-style-ref.png`
- Style-Tag: `palworld-overwatch-soft-real` (legacy alias still accepted: `palworld-korra-direction`)
- Ausgabequalität = technische + visuelle Kriterien in `DEFAULT_ASSET_AUTHORING_GOLDEN_CRITERIA`

## Manifest Pflichtfelder

| Feld | Zweck |
|------|--------|
| `providerId` / `modelId` | Reproduzierbarkeit |
| `prompt` / `references` | Input |
| `settings` | Generation settings bag |
| `provenance` | Lizenz + Attribution (Pflicht) |
| `assetVersion` / `outputChecksum` | Versionierung |
| `styleTags` | Style-Gate |

## Tripo / weitere Provider

Neuen Adapter unter `generation/**` + Infrastructure hinzufügen, `AVATAR_3D_GENERATION_PROVIDER_IDS` erweitern. Authoring-Domain und dieses Dokument bleiben unverändert.

## Security

- Provider-Secrets nur serverseitig
- Manifest speichert keine Secrets
- Keine freien Mesh-Download-URLs als Contract-SoT
- Provider unavailable blockiert **bestehende** Assets nicht; Retry ist explizit

## Code

- Domain: `src/domains/character/avatar/asset-authoring-contract-v1.ts`
- Checks: `scripts/avatar-v2-asset-authoring-check.mjs`
