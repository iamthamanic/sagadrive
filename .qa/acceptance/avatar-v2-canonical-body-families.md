# Feature: Avatar V2 Canonical Body Families

<!-- #255 -->

## Intent
Drei versionierte Base Bodies standard/compact/heavy mit shared Rig/Morph/MToon; kein baked clothing.

## Happy Path
- [x] sd_body_standard|compact|heavy_v1 Manifeste + Allowlist
- [x] Legacy sagadrive-base-humanoid → standard
- [x] Publish gate: morph/region/material/underwear
- [x] Golden visual ref JSON pro Family
- [x] Catalog unterstützt Family-Parameter

## Composition Gate
- HEAD_SHA: PLACEHOLDER
- BASE_SHA: 8cd24dc59c6a053f570c92a0b0b4e7915c00d33f
- Verdict: CLEAR
- Proof: .qa/runs/composition-gate-avatar-v2-canonical-body-families.md
