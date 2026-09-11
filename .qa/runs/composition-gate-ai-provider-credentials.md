# Composition Gate — ai-provider-credentials

- HEAD_SHA: 435cd99b994c9a25c0fb9716da2888d7e4c16478
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

## Simulations

### N-actors
| Actor | Credential row | Generate key used |
|-------|----------------|-------------------|
| User A | `(A, meshy)` only | A's key only |
| User B | `(B, meshy)` only | B's key only |

No cross-user SELECT (table revoked from authenticated; Edge filters by JWT `user_id`). Cardinality: **one** credential row per `(user_id, provider_id)`.

### Invalid / missing
| Case | Behavior |
|------|----------|
| Invalid Meshy key | Upsert rejected; prior row unchanged |
| Missing `CREDENTIALS_ENCRYPTION_KEY` | Upsert 503 fail-closed |
| No user key + no `AI_PROVIDER_ALLOW_HOST_KEYS` | `meshyConfigured=false`, generate `not-configured` even if host `MESHY_API_KEY` set |
| Mock flags | CI generate still works without user key |

### Two consumers / crash
| Consumer | Read |
|----------|------|
| Settings Bild tab | `list(modality=image)` → same `meshy` row |
| Settings 3D tab | `list(modality=3d)` → same `meshy` row |
| Thumbnail generate | decrypt `meshy` for user |
| Model3d generate | decrypt `meshy` for user |

Crash mid-upsert: no partial plaintext on client; DB either old ciphertext or new after successful write. Delete removes row → both generate paths fail-closed together.

## Findings

None.

## Notes

Host `MESHY_API_KEY` is not a prod fallback (requires `AI_PROVIDER_ALLOW_HOST_KEYS=1`).
