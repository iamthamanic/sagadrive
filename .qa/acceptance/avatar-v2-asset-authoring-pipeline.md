# Feature: Avatar V2 Asset Authoring Pipeline

<!-- issue #254 -->

## Intent
Provider-neutraler Generate→Select→Normalize→Validate→Publish Workflow mit Manifest/Provenance und Golden-Criteria.

## Happy Path
- [x] Authoring nutzt Generation Contract (kein Meshy-Hardcode in Domain)
- [x] Manifest: Provider/Model/Prompt/Refs/Settings/Provenance/Version/Checksum
- [x] Candidate-Validation + regelbasiertes Select
- [x] Docs für Tripo-Erweiterung
- [x] AGENTS queue-compact Forbidden-Liste + runner-profile
- [x] apply-migrations.sh 036–038

## Composition Gate
- HEAD_SHA: PLACEHOLDER
- BASE_SHA: e1a24f8e336952cf78eb58d67354a722857500fd
- Verdict: CLEAR
- Proof: .qa/runs/composition-gate-avatar-v2-asset-authoring-pipeline.md
