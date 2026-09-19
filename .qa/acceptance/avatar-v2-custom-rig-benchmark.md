# Feature: Avatar V2 17/22 — Custom-Creature-Rigging Benchmark

<!-- #265 / Epic #248 — slug: avatar-v2-custom-rig-benchmark -->

## Intent
Ermittelt reproduzierbar, welcher Rigging-Ansatz für Humanoide und stark abweichende Custom Creatures tragfähig ist — ohne den Produktflow von README-Versprechen abhängig zu machen.

## Preconditions
- #264 Rig/Capability V2 Contract on main
- Existing `AvatarRiggingProvider` (Meshy + SkinTokens) contract

## Happy Path
- [ ] Golden Matrix bewertet Meshy, SkinTokens, UniRig (prior art) und Import-Existing-Rig
- [ ] Default/Fallback pro Humanoid vs Custom Creature im Design festgeschrieben
- [ ] Provider-Success setzt nie Capabilities ohne Analyzer-Revalidation
- [ ] Custom Auto-Rig darf bei unzureichender Qualität optional bleiben
- [ ] Touched files: zero type escape hatches

## Edge Cases
- Custom Auto-Rig unzureichend → vorhandenes Import-Rig oder limited Artifact
- Provider unavailable blockiert Native/Import mit vorhandenem Rig nicht
- Schlechte Skinweights → needs-review/limited, nicht Erfolg

## Scope
### In
- Domain benchmark matrix + decision + design update
- Deterministic check; SkinTokens unavailable path documented
### Out
- Enduser provider switch UI
- Live GPU worker calls in CI
- New character UI beyond status/fallback rules

## Security Coverage
- Logical asset keys only; no free URLs
- No secrets in matrix artifacts
- Provider outputs always re-analyzed (capabilities pending)

## Composition Gate
- HEAD_SHA: 7ff100fd8ad3f0c10dd576a0a5fdc692db18c320
- Verdict: CLEAR

## Implementation Notes
- Domain: `custom-rig-benchmark-v1.ts` — matrix + humanoid/custom strategies
- Design: `.qa/design/avatar-v2-custom-rig-benchmark.md` + pipeline §6
- Fixtures: gumo-like + alien golden profiles
- Check: `avatar-v2-custom-rig-benchmark-check.mjs`

