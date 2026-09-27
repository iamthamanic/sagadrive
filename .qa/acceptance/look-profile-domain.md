# Feature: Define the LookProfile domain, capabilities and resolution rules

<!-- seeded by ecc-runner from issue #339 on 2026-09-27 — refined by @implement -->

## Intent
Führe einen UI- und Renderer-unabhängigen LookProfile-Vertrag für SagaDrive ein. Er beschreibt visuelle Looks, Versionen, Quellen, Referenzen, Capabilities, Scopes, Ausführungsmodi und die Regeln, welcher Look für Welt und Player-Charakter tatsächlich gilt.

## Preconditions
- Domain layer may not import React or Supabase (`AGENTS.md` #94).
- No persistence or ToonLab adapter in this slice.

## Happy Path
- [ ] `LookProfile`, `LookProfileVersion`, `LookSource`, `LookReference`, `LookScope`, `LookCapability` und `LookExecutionMode` sind als pure TypeScript-Domain-Verträge vorhanden.
- [ ] World-Auflösung ist deterministisch: Session Override → Saga Default → System Default; Player Character: erlaubter Personal Override → Session → Saga → System Default.
- [ ] LookSource reserviert mindestens `manual`, `preset`, `reference-analysis`, `imported`; ExecutionMode mindestens `realtime`, `rendered`.
- [ ] Capabilities enthalten funktional `character`, `lighting`, `postFx` sowie reserviert `environment`, `sky`, `water`, `vegetation`, `terrain`, `props`, `vfx`.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [ ] Saga ohne Default-Look fällt auf System Default zurück.
- [ ] Session ohne Override erbt Saga.
- [ ] Gespeicherter Player-Override wird ignoriert, wenn der GM Overrides deaktiviert.
- [ ] Unbekannte/unsupported Capability darf die Auflösung nicht crashen.
- [ ] LookReference `style` und `content` dürfen nicht semantisch vertauscht werden (id-collision across kinds rejected).

## Security Coverage
- F-03 / B-01 / B-04 / B-07 / B-08 / B-09 / P-04: out of scope — no UI, no API, no persistence, no secrets in this domain-only slice.
- Domain does not treat profile ids as authorization secrets (same posture as public resource ids).

## Regression
- [ ] Existing domain barrels and test-gate continue to pass.

## Assumptions
- Design documented in `.qa/design/look-system.md`.

## Screenshots
| Step | Filename |
|------|----------|
| — | n/a (domain-only) |

## Implementation Notes
- Added `src/domains/look/**` (types, parse, resolve, invariants, barrel).
- Gate: `scripts/look-profile-domain-check.mjs` wired into `scripts/test-gate.mjs`.
- Resolution + fail-closed parse covered by runtime esbuild checks.

## Composition Gate
- Verdict: SKIPPED (domain-only; no producer→consumer hop)
- Proof: \`.qa/runs/composition-gate-look-profile-domain.md\`
