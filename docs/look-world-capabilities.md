# Look World Capabilities — reserved domains (#346)

Feature slug: `look-world-capability-stubs`

## Intent

Future World-Look domains (**Environment, Sky, Water, Vegetation, Terrain, Props, VFX**) are explicit, documented, machine-readable **reserved** capabilities on the same LookProfile contract. Later renderers must **extend** this contract — they must not invent parallel style systems.

## Machine-readable source of truth

| Artifact | Role |
|----------|------|
| `LOOK_RESERVED_CAPABILITIES` in `src/domains/look/types.ts` | Canonical id list (7 domains) |
| `LOOK_CAPABILITY_METADATA` in `src/domains/look/capability-metadata.ts` | Availability (`supported` \| `reserved`), DE labels, unavailable copy |
| `lookCapabilityUnavailableLabel` / `listLookCapabilityMetadata` | Look Editor UI must consume these — **no second hardcoded list** |

## Reserved domains (unsupported today)

| Id | Label (DE) | Availability |
|----|------------|--------------|
| `environment` | Umgebung | reserved → „Noch nicht verfügbar“ |
| `sky` | Himmel | reserved |
| `water` | Wasser | reserved |
| `vegetation` | Vegetation | reserved |
| `terrain` | Terrain | reserved |
| `props` | Props | reserved |
| `vfx` | VFX | reserved |

Functional (supported) capabilities remain: `character`, `lighting`, `postFx`.

## Forward compatibility

- **Unknown** capability strings in persisted payloads: parsers drop them from typed arrays (`parseLookCapability` → `null`); classifiers expose `{ kind: 'unknown' }` for UI.
- **Reserved** capabilities may appear on a profile (declaration only). They must **not** drive shader/config UI that writes fake parameters.
- Adding a new capability later: extend `LOOK_*_CAPABILITIES` + `LOOK_CAPABILITY_METADATA` together; old profiles without the new id remain valid.

## Architecture rule

World domain renderers (environment/sky/water/…) **extend LookProfileVersion.capabilities** and resolution — they do **not** introduce a separate “world style” identity or catalog.

## Contract check

`node scripts/look-world-capability-stubs-check.mjs` (wired into `npm run test-gate`).

## Non-goals

No shaders, provider pickers, or no-op sliders for reserved domains.
