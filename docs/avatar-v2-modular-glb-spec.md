# SagaDrive Modular Avatar GLB v1 — Upload-Spezifikation

**Contract:** `SagaDriveModularAvatarGlbV1`  
**Domain:** `src/domains/character/avatar/modular-glb-contract-v1.ts`  
**Design:** `.qa/design/avatar-v2-modular-pipeline.md`  
**Ticket:** #250  

Diese Spezifikation ist **provider-neutral** (kein Meshy-/Tripo-Bezug). Sie beschreibt, wie Base Body, Wearables, Traits und Props in einem glTF/GLB/VRM strukturiert und mit `extras.sagadrive` annotiert werden.

---

## Idealstruktur (empfohlen)

| Node / Mesh-Gruppe | Rolle (`role`) | Slot (Beispiel) |
|--------------------|----------------|-----------------|
| `Body_Base` | `body` | `body_base` |
| Haare / Ohren / Accessoire | `trait` | `hair` / `ears` / `accessory` |
| Kleidung / Rüstung | `wearable` | `torso` / `legs` / … |
| Waffe / Held-Prop | `prop` | `prop_main` / `prop_off` |

- **Gemeinsames Skeleton:** Wearables/Traits sollten dasselbe Humanoid-Skeleton wie `Body_Base` nutzen (siehe `rig-contract.ts`).
- **Baked / monolithisch** ist erlaubt: fehlende `extras.sagadrive` → Status `limited` (Heuristik später), nicht automatisch `invalid`.
- **Teilweise modular** ist erlaubt: Contract erzwingt keine Full Modularity.

## `extras.sagadrive` Schema

Am glTF-Node (oder Asset-Root) als:

```json
{
  "sagadrive": {
    "contractVersion": "SagaDriveModularAvatarGlbV1",
    "role": "body",
    "slot": "body_base",
    "bodyFamily": "standard",
    "attachmentAnchor": "rightHand",
    "hideRegions": ["torso"],
    "displayName": "Body Base"
  }
}
```

| Feld | Pflicht | Werte |
|------|---------|--------|
| `contractVersion` | ja | exakt `SagaDriveModularAvatarGlbV1` |
| `role` | ja | `body` \| `wearable` \| `trait` \| `prop` |
| `slot` | nein | siehe Domain `MODULAR_AVATAR_GLB_SLOTS` |
| `bodyFamily` | nein | `standard` \| `compact` \| `heavy` \| `custom` |
| `attachmentAnchor` | nein | Humanoid-Anker aus Rig-Contract |
| `hideRegions` | nein | wie Equipment-Hide-Regions |
| `displayName` | nein | nur UI-Hinweis, nie Validierungs-Autorität |

## Validierungsregeln (fail-closed)

- Unbekannte `contractVersion` → Status **`needs-review`** (kein stilles Upgrade).
- Ungültige `role` / `slot` / `bodyFamily` / Anker / Hide-Region → Node **ungültig** (`invalid`).
- Fremde Keys in `extras` werden ignoriert; ungültige SagaDrive-Felder werden **nicht** „best effort“ umgedeutet.
- Node-**Namen** (`Body_Base`) sind nur Fallback für Menschen/Heuristik — Maschinenwahrheit ist `extras.sagadrive`.

## Fixtures

- Valid: `fixtures/avatar-v2/modular-glb-v1.valid.json`
- Invalid / mismatch: `fixtures/avatar-v2/modular-glb-v1.invalid-*.json`

Geprüft durch `scripts/avatar-v2-modular-glb-contract-check.mjs`.
