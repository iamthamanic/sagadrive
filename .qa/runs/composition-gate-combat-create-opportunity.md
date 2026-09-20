# Composition Gate — combat-create-opportunity

- HEAD_SHA: 8ff021f0eabe5c1a6039b87a0030f956a8516e27
- Date: 2026-09-20
- Verdict: **SKIPPED**

## Event
Rules-kernel resolution of Hauptaktion „Gelegenheit schaffen“ → named advantage source records (pure function). No persisted business event, queue, webhook, or multi-hop consumer ships in this slice.

## Path
Producer: `resolveCreateOpportunity` (in-process)  
Consumer: none in this PR (session/combat UI explicitly Out of scope)

## Simulations
- N-actors: N/A — no shared mutable record
- Invalid fallback: eligibility deny reasons are fail-closed (`existing-action-takes-precedence`, `no-plausible-tactical-effect`, `follow-up-undeclared`)
- Concurrent consumers: N/A

## Skip reason
Single-hop pure rules + docs-only consumer surface. No producer→consumer path across modules for a business event; no bulk side-effects, outbox, or write-A/read-B.

## Open findings
None
