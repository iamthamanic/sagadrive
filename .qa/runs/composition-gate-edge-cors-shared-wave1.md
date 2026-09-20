# Composition Gate — edge-cors-shared-wave1 (#305)

- HEAD_SHA: 1ec9407c9889674a2452b47e8c05daaceaa939b1
- BASE_SHA: 212bc7c4b05fb2869037fd29dd2362d7358b4adb
- Date: 2026-09-20
- Verdict: SKIPPED

## Event

Edge Functions adopt shared CORS headers from `_shared/cors.ts`; CI fails on new local `Access-Control-Allow-Origin` literals (wave-1 migrated functions + legacy allowlist).

## Hop chain

Browser/preflight → Edge Function `handleOptions`/`corsHeaders` (`_shared/cors.ts`) → HTTP response headers (no DB/outbox/multi-consumer hop)

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | N/A (no shared event fan-out) | Shared header helper only | n/a |
| Invalid/missing | Unmatched Origin omit / configured-or-star | `corsHeaders` missingOriginPolicy | n/a |
| Two consumers / crash | N/A | No dual consumers | n/a |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

Single-hop backend chore: CORS header policy only — no producer→consumer persistence, outbox, or multi-actor event chain. Backend zone touched solely for shared Origin/Methods helpers + CI allowlist until #306.
