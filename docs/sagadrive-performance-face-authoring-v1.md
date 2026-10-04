# SagaDrive Performance Face — Authoring Spec v1

**Spec id:** `sagadrive-performance-face-authoring-v1`  
**Contract:** `SagaDrivePerformanceFaceV2`  
**Validator:** `performance-face-validator-v1`

This document is for external artists and technical directors. It describes how to
author GLB/VRM face assets for LiveAct Standard and LiveAct Premium. It does
**not** require SagaDrive Canonical Human vertex indices or internal tooling.

## 1. Formats

| Format | Face controls | Notes |
|--------|---------------|-------|
| **GLB / glTF** | Morph target names | Prefer exact semantic ids below |
| **VRM 1.0** | Expression names (+ LookAt for gaze) | Same semantic ids via expressions |

Both formats use the same **canonical control ids**. Topology may differ; semantics must match.

## 2. Coordinate / orientation

Use your usual avatar-facing convention. LiveAct head/gaze are applied by the
runtime; Performance Face morphs are weight-driven (`0..1`) and do not redefine
world axes. Keep L/R anatomical (character’s left/right).

## 3. LiveAct Standard (required floor)

Standard LiveAct requires an ARKit-compatible face set meeting SagaDrive Face
Asset **`core-v1`** (or higher), plus head support and a gaze path
(bones / LookAt / eye-look morphs).

Core examples (non-exhaustive — see LiveAct Face Asset docs):

- `eyeBlinkLeft` / `eyeBlinkRight`
- `jawOpen`
- `mouthSmileLeft` / `mouthSmileRight`
- `mouthFrownLeft` / `mouthFrownRight`
- `mouthPucker`, `mouthShrugUpper`, `mouthShrugLower`

Aliases: exact id, PascalCase, and a small explicit VRM blink alias table.
**No fuzzy filename matching.**

Assets with only these controls → **LiveAct Standard** (capability level 2).
They are never broken by Premium features.

## 4. LiveAct Premium — required extension ids

Premium (capability level 3) requires **all** of the following morph/expression
targets in addition to the Standard floor:

| Control id | Group | Neutral |
|------------|-------|---------|
| `nasolabialFoldLeft` | Nose / nasolabial | `0` = no fold |
| `nasolabialFoldRight` | Nose / nasolabial | `0` |
| `cheekVolumeLeft` | Cheeks | `0` = no added volume |
| `cheekVolumeRight` | Cheeks | `0` |
| `lipContourUpperLeft` | Lips | `0` |
| `lipContourUpperRight` | Lips | `0` |
| `lipContourLowerLeft` | Lips | `0` |
| `lipContourLowerRight` | Lips | `0` |

### Optional Premium

| Control id | Notes |
|------------|-------|
| `lidTightenLeft` / `lidTightenRight` | Missing → warning; Premium may still pass |

## 5. Ranges and neutral

- Default range: **`0..1`**
- **`0`** = rest / no deformation for the control
- Values outside `0..1` are clamped by the runtime

## 6. Anatomical L/R

`*Left` / `*Right` mean the **character’s** anatomical left/right (not screen space).
Mirror cameras are a LiveAct input concern, not an authoring rename.

## 7. Correctives

A **corrective** is a character-side morph that activates from a declared combination
of driver controls (Performance Face and/or ARKit ids).

Declaration (optional manifest `SagaDrivePerformanceFaceManifestV1`):

```json
{
  "contractVersion": "SagaDrivePerformanceFaceManifestV1",
  "correctives": [
    {
      "id": "smileCheekLeftCorrective",
      "drivers": ["mouthSmileLeft", "cheekVolumeLeft"],
      "weightRule": "min",
      "required": false
    }
  ]
}
```

| Field | Meaning |
|-------|---------|
| `drivers` | Ordered control ids |
| `weightRule` | `min` or `multiply` |
| `required` | If `true` and morph missing → Premium NOT AVAILABLE |

Apply order: **drivers first, then correctives**.  
Missing optional corrective → warning; Premium may still pass.  
Manifest claims alone never grant Premium — morph evidence is required.

## 8. Validation workflow

1. Export GLB/VRM with named morphs/expressions.
2. Run SagaDrive Performance Face validation (bind-time + offline gate).
3. Read the report:

```text
LiveAct Standard: PASS | NOT AVAILABLE
LiveAct Premium: PASS | NOT AVAILABLE
Missing:
- …
Fallback:
ARKit52-compatible face remains available.
```

## 9. Graceful degrade

| Situation | Result |
|-----------|--------|
| ARKit-only mesh | Standard; Premium NOT AVAILABLE; import allowed |
| Premium required control missing | Standard; import allowed |
| Filename contains “premium” | Ignored for eligibility |
| No humanoid | Display / lower; import still follows structure rules |

**Missing Premium never blocks import.**

## 10. What this is not

- Not Avatar Morph V1 (appearance sliders)
- Not Face Anchors (mesh triangle locations)
- Not Personal Calibration (actor motion ranges)
- Not Modular Avatar node roles/slots
