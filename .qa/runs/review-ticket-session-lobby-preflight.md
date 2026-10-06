# Review Ticket — session-lobby-preflight (#491)

- HEAD_SHA: 9eedd5ed02f85e923a1e3cf7abe9125a7eb5209c
- Date: 2026-10-06
- Verdict: ACCEPT

## Summary

Clean lobby hop between join and live: domain contract for enter/media, infra channel for ready broadcast, shared Adaptive lobby UI with role CTAs.

## Architecture

- Domain pure; Supabase Realtime confined to `session-lobby-channel.ts`
- App hook uses services + channel only
- Join handlers route to lobby before live

## Risks / follow-ups

- Ready is ephemeral broadcast (by design — not gameplay auth)
- Prepare/Recap remain #492
- Online flag depends on existing session_players.is_online freshness
