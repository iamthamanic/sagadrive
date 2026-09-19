# Feature: Avatar V2 16/22 — Custom Creature Rig- und Capability-Contract

<!-- #264 / Epic #248 — slug: avatar-v2-custom-creature-contract -->

## Intent
Macht nicht-humanoide oder stark abweichende Charaktere zu First-Class-Avataren, ohne den bestehenden Humanoid-Rig-Vertrag auf Anatomien wie Faruk-artige Schneggl zu erzwingen.

## Preconditions
- Humanoid Rig V1 (`rig-contract.ts`) bleibt lesbar und ungebrochen.
- Anatomy-Achse aus Composition V2: `humanoid` | `custom-creature` | `unknown`.
- Keine Provider-/Client-Claims setzen Capabilities (fail-closed, evidence-only).

## Happy Path
- [ ] Rig/Capability V2 modelliert Humanoid und Custom Creature getrennt, ohne Humanoid-Fixtures zu regressieren.
- [ ] Custom Creature braucht keine Standard-Humanoid-Bones für valide Animation/Anchors.
- [ ] Capability Resolver ist evidence-driven und source/provider-neutral.
- [ ] Human / Dwarf / Faruk-like Golden Fixtures liefern unterschiedliche Profile.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] Custom Skeleton ohne Hände darf head/back/other sichere Anchors nutzen.
- [ ] Kein Humanoid-Mapping → nicht automatisch nur `static`; Custom-Animation kann valide sein.
- [ ] Unknown Skeleton bleibt `limited` statt falsche Anchor-Zuweisung.

## Non-Goals
- Keine Creature-Anatomie-Taxonomie (slug/quadruped/avian …).
- Kein automatisches Rigging (#265).
- Keine Standard/Compact/Heavy Wearables für Custom Bodies.

## Security Coverage
| Item | Applicable? | How satisfied |
|------|-------------|---------------|
| F-03 Client trust | Yes | Capabilities nur aus Evidence; Provider-Claims ignoriert |
| B-01 AuthZ | N/A | Reiner Domain-Contract, kein Storage/API |
| B-04 Secrets | N/A | Keine Secrets |
| P-04 Fail-closed | Yes | Unknown → limited; keine erfundenen Anchors |

## Regression
- [ ] `resolveAvatarRigCapabilities` (V1) unverändert für volle Humanoid-Mappings
- [ ] Architecture boundary / typed-strict / test-gate

## Assumptions
- Nur Profile `humanoid` + `custom-creature` (KISS; keine spekulativen Families).

## Screenshots
| Step | Filename |
|------|----------|
| n/a | domain-only |

## Implementation Notes
- Domain: `src/domains/character/avatar/rig-capability-contract-v2.ts` — V2 resolver, Humanoid V1 adapter, Custom Creature profile, golden fixtures (human/dwarf/faruk-like), edge invariants.
- Barrel: `index.ts` exports V2 types + helpers.
- Fixtures: `fixtures/avatar-v2/golden/rig-profile-{human,dwarf,faruk-like}.json`
- Check: `scripts/avatar-v2-custom-creature-contract-check.mjs` wired into `test-gate.mjs`
- Design: `.qa/design/avatar-v2-modular-pipeline.md` §6 updated
- No UI / no infra / Rig V1 untouched

## Composition Gate
- HEAD_SHA: WORKTREE
- Verdict: CLEAR
- See `.qa/runs/composition-gate-avatar-v2-custom-creature-contract.md`
