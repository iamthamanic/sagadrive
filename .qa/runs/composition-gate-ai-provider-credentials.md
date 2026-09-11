# Composition Gate — ai-provider-credentials

- HEAD_SHA: 435cd99b994c9a25c0fb9716da2888d7e4c16478
- BASE_SHA: b58beb6bbb9eca2a7d1ac0814e3878c8739c4b70
- Date: 2026-09-11
- Verdict: CLEAR

## Event

User saves a Meshy API key in Settings → AI; later Item Workbench generate uses that credential for Meshy calls.

## Hop chain

1. `AiProviderCredentialsPanel` (app/profile) collects key once in memory
2. `aiProviderCredentialsService` → Edge `ai-provider-credentials` (`upsert` / `list` / `refresh` / `delete`)
3. Edge validates via Meshy `/balance`, encrypts with `CREDENTIALS_ENCRYPTION_KEY`, writes `user_ai_provider_credentials` (service_role only)
4. Workbench `item-thumbnail` / `item-model3d` `config`/`generate` → `resolveMeshyApiKeyForUser` / `isMeshyConfiguredForUser` → decrypt same row → Meshy provider
5. Meshy assets still materialize into private buckets (unchanged hop after provider call)

Cardinality: one credential row per `(user_id, provider_id)`; one Meshy generate job per confirmed click (existing submit locks).

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | User A and User B each own `(user_id, meshy)` only | JWT `user_id` + service_role filter; table revoked from authenticated | pass |
| Invalid/missing | Bad key / missing encrypt key / no user key → fail-closed | Upsert rejects invalid key; 503 without `CREDENTIALS_ENCRYPTION_KEY`; prod without user key → `not-configured` (host key only if `AI_PROVIDER_ALLOW_HOST_KEYS=1`); mocks still enable CI | pass |
| Two consumers / crash | Bild+3D Settings and thumbnail+model3d generate share one credential; crash mid-upsert does not leak plaintext | Same `provider_id=meshy` row; delete fails both generate paths together; client never stores secret | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Notes

Host `MESHY_API_KEY` is not a prod fallback (requires `AI_PROVIDER_ALLOW_HOST_KEYS=1`).
