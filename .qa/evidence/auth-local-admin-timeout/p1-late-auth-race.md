# P1 Late Auth Race — Evidence (#476)

## Lifecycle cause
`raceWithTimeoutOrSymbol(signInWithPassword)` only bounds the await. Supabase JS has no AbortSignal on password grant; the GoTrue request can still complete and persist a session, then emit `SIGNED_IN`.

## Pre-fix failure mode (contract)
Timeout → Local Admin fallback → logout → late GoTrue success → persisted admin session + `SIGNED_IN` → privilege resurrection.

## Post-fix mechanism
- `authGenerationRef` + `bumpAuthGeneration()` on login/logout/unmount
- `fallbackGenerationsRef` marks intentional Local Admin fallback
- `expectingGoTrueLocalAdminRef` allows in-flight legitimate GoTrue `SIGNED_IN`
- `watchStaleLocalAdminPasswordLogin` + `discardStaleLocalAdminSession({ scope: 'local' })` scrub stale admin JWT only when session user is seeded Local Admin
- `onAuthStateChange` rejects stale Local Admin `SIGNED_IN` when fallback / logged out / other user; ignores cleanup `SIGNED_OUT` for fallback/other user

## Regression cases (behavioral)
1 Fast GoTrue · 2 Timeout fallback · 3 Late success on fallback · 4 Logout→late success · 5 Different user→late admin · 6 Overlapping attempts · 7 Non-admin no fallback · 8 Session bootstrap

Targeted suite: 5× PASS (`--retries=0`).
