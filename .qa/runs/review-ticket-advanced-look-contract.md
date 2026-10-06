# Review Ticket — advanced-look-contract (#355)

- HEAD_SHA: c7e215c38f316c7b01b6c674121d43dca6f8f150
- Date: 2026-10-06
- Verdict: ACCEPT

## Summary

Clean define-only contract mirroring #346 stubs pattern: pure domain types, negotiation with explicit German degrade messages, pluggable empty registry, docs + deterministic gate.

## Architecture

- Domain stays React/Supabase-free
- Reuses LookProfile/LookProfileVersion/LookReference — no parallel style object
- Registry is infrastructure-adjacent but still domain-pure (in-memory map)

## Maintainability

- Guide kinds centralized; check script pins the nine reserved ids
- `strictGuideInputs` optional for hard-fail vs soft omit

## Typed-strict

No `as any`, `@ts-ignore`, or any-annotations in new files.

## Risks / follow-ups

- UI Adaption surface is #356
- Concrete neural providers register later; none wired as default
