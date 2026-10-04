# Acceptance: sagadrive-performance-face-v2 (#450)

## Intent

Ship a provider-neutral `SagaDrivePerformanceFaceV2` character capability contract,
deterministic validator + human-readable report, Standard/Premium negotiation, and
public authoring/import documentation — without breaking ARKit-only assets or
Modular Avatar GLB V1, and without implementing #451 Premium E2E proof.

## Preconditions

- #424 Face Setup E2E CLOSED
- #445–#449 CLOSED on main
- Design artifact present: `.qa/design/sagadrive-performance-face-v2.md`
- Feature slug: `sagadrive-performance-face-v2`

## Surface classification

| Surface | Class |
|---------|-------|
| Domain contract + validator + import docs | Infrastructure / SETUP tooling |
| Optional capability report UI (if added in implement) | Workstation / SETUP |

If implement adds user-facing report UI → AU/CE gates required then.
Intake does **not** require UI.

## Happy Path

1. Artist authors GLB/VRM with ARKit-compatible face (+ optional Premium extensions)
2. Validator produces Standard/Premium eligibility + missing list
3. Import succeeds even when Premium missing
4. Runtime compose: Input × LiveAct Caps V1 × PerformanceFace V2 → level
5. ARKit-only asset remains LiveAct Standard
6. Premium-capable asset reports Level 3 when required controls present
7. Gate + `npm run test-gate` green

## Edge Cases

- Foreign topology (non-Canonical) with correct semantics → Premium possible
- VRM LookAt-only gaze → Standard gaze path OK; Premium still needs extended morphs if required
- Manifest claims Premium but morphs missing → not Premium; warning
- Optional corrective missing → warning; Premium may still pass
- Required Premium control missing → Premium NOT AVAILABLE; Standard may PASS
- No face rig → Display / Animated only; import not blocked solely for missing Premium
- Filename contains “premium” → ignored for eligibility

## Acceptance Checklist

- [ ] Versioned `SagaDrivePerformanceFaceV2` contract in domain
- [ ] Required/optional controls table implemented as code constants (matches design)
- [ ] Correctives schema + apply/fallback semantics documented and tested
- [ ] Deterministic validator (machine report + DE human-readable summary)
- [ ] Public authoring/import spec for external artists
- [ ] Standard/Premium capability negotiation composed with LiveAct Caps V1 (no V1 break)
- [ ] Generic VRM/GLB degrades gracefully (no Premium-only import block)
- [ ] Compatible with `SagaDriveModularAvatarGlbV1`
- [ ] No filename/URL/preset capability hacks
- [ ] No Morph V1 / Face Anchors conflation
- [ ] No personal/biometric fields in contract
- [ ] #447 contour fidelity remains blocked until #451 (hooks ready)
- [ ] `npm run test-gate` green
- [ ] Behavioral gate `scripts/…performance-face-v2-check.mjs` (or equivalent) wired

## CE / AU

| Gate | Coverage |
|------|----------|
| CE-20 | Missing Premium → degrade to Standard; import continues |
| Other CE | N/A unless UI report surface is added |
| AU-* | N/A for intake; required if implement adds user-facing report UI |

## Security / Privacy

| Item | How |
|------|-----|
| No personal data in asset contract | Schema forbids owner/calib/landmarks |
| Local validation | Offline/runtime parse only; no cloud biometrics |
| Fail closed on claims | Manifest alone cannot grant Premium |

## Non-goals

- #451 Premium E2E on Canonical + external avatar
- Solver changes to #445–#449
- Appearance Morph V1 redesign
- Face Mapping / Anchors as Premium proof

## Implementation Notes

- Compose path: keep `SagaDriveLiveActCapabilitiesV1`; add PerformanceFace V2 beside it
- Alias resolution: explicit table (mirror `liveact-channel-target-aliases.ts`)
- Import seat: after modular/structure validation; report only; never Premium-block
- Authoritative Modular Avatar source: `src/domains/character/avatar/modular-glb-contract-v1.ts`
