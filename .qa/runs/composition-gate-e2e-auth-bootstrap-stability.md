# Composition Gate — e2e-auth-bootstrap-stability

- HEAD_SHA: af6aa1922b8eb93c601f1a081932b87c42c3ab18
- Date: 2026-09-30
- Verdict: SKIPPED

## Event
Local Admin auth attempt generations invalidate timed-out / superseded GoTrue results; stale Local Admin sessions are scrubbed without wiping newer non-admin UI state. E2E proves late-success races.

## Why SKIPPED
Single-hop / no producer→consumer business path:
- No queue/worker/outbox/webhook/bulk side-effect
- Attempt generation + selective `signOut({ scope: 'local' })` are in-process AuthProvider lifecycle
- E2E race cases are test-only

## Simulations
N/A (skip criteria met)

## Findings
None
