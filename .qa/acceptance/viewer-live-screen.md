# Acceptance — viewer-live-screen (#370)

## Intent
Read-only Viewer live surface: Program + public knowledge projection. No gameplay mutations.

## Happy Path
Authenticated viewer opens `/live/viewer` → Program stage + minimal public context.

## Security
- viewer access projection only
- no PlayerPanel / checks / inventory / GM controls
- no gm_only secrets in feed
