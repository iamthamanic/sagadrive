# Acceptance — architecture-migration-06-marketplace (#170)

## Intent
Remove modules/marketplace; Marketplace screen under app/marketplace/browse.

## Happy Path
- [x] modules/marketplace gone
- [x] contracts → domains/marketplace
- [x] service → infrastructure/marketplace
- [x] browse slice + Marketplace.tsx under app/marketplace/browse
