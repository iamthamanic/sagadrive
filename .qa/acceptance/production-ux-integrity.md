# Acceptance — production-ux-integrity (#493)

Slug: `production-ux-integrity`

## Intent
Normal product journeys must not show unmarked demo/fixture data or primary
controls that look live but have no end-to-end action.

## Given / When / Then

### GM panel honesty
- Given Gamemaster Panel opens
- When the user inspects storytelling / objects / sound
- Then those controls are disabled with a German deferred hint
- And character roster never lists unmarked demo IDs (`demo-*`)

### Session create without fixture UI
- Given production (non-DEV) Session Join create flow
- When the create tab renders
- Then `PreparedAdventureFixturePanel` is not mounted
- And in DEV it is labeled as developer/player-test context

### Marketplace paid CTA
- Given a marketplace item with `price > 0`
- When the CTA renders
- Then the button is disabled and labeled „Kauf nicht verfügbar“
- And no toast claims a purchase flow started

### Profile deferred settings
- Given Profile notification / AV / language / compact controls
- When they render
- Then they are disabled with `DEFERRED_SETTING_HINT_DE`
- And Dark Mode + Abmelden remain live

## Evidence
- Domain: `src/domains/session/contracts/production-ux-integrity.ts`
- Check: `scripts/production-ux-integrity-check.mjs`
- E2E: `e2e/production-ux-integrity.spec.ts`
