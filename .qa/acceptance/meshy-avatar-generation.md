# Acceptance — meshy-avatar-generation

<!-- seeded for GitHub issue #10 / avatar-order-16 -->

## Intent
User erzeugen per Prompt einen 3D-Charakter mit Meshy (BYOK serverseitig). Ergebnis landet owner-scoped; Capabilities kommen nur aus #6, nie aus Provider-Success.

## Happy Path
- [ ] Entry „Mit KI erstellen“ + Prompt + Kostenbestätigung vor Submit
- [ ] Genau ein Job pro Bestätigung; Idempotency + Rate-Limit
- [ ] MESHY_API_KEY nur Edge/Server; SSRF-sicherer GLB-Download
- [ ] Materialisierung in `character-avatars`; `rig_analysis_status` bleibt `pending`
- [ ] Reload-stabiler Jobstatus (sessionStorage) + expliziter Retry (kein Auto-Paid-Retry)
- [ ] typed-strict + avatar-meshy-generation-check grün

## Scope
In: domain job contract, Edge `character-avatar-meshy`, migration, client service, AvatarMeshyPanel, CharacterEditor wiring.
Out: SkinTokens, Morph-Garantie, Marketplace.

## Composition Gate
- HEAD_SHA: c68fa639312a99ad4bda79eac45ecb4f5c08a4b1
- BASE_SHA: 1a88ea6a908a6836896e9bc7129586bb4a199954
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-meshy-avatar-generation.md`

## Implementation Notes
- `meshy-avatar-job.ts` + `assertNoCapabilityFromProviderStatus`
- Edge: text-to-3d provider, mock via `MESHY_AVATAR_USE_MOCK=1`
- UI states: idle/confirming/queued/generating/rigging/analyzing/success/failed/provider-unavailable
- AGENTS.md auto-compact between tickets
