# Composition Gate — player-test-session-security-lifecycle

- HEAD_SHA: 5679124ba17d319f1a532516fd57199f2d9a10d7
- BASE_SHA: 212bc7c4b05fb2869037fd29dd2362d7358b4adb
- Date: 2026-09-20
- Verdict: CLEAR

## Event
Play session create/join/status/leave uses server-issued join codes and SECURITY DEFINER RPCs; Hosted make-server find-by-code path removed.

## Hop chain
1. SessionJoin (UI) collects project + name or join code
2. `session-service` calls `create_play_session` / `join_session_by_code` / `set_session_status` / `leave_play_session` via `supabase.rpc`
3. RPCs authorize with `auth.uid()`, generate unique `sessions.code`, enforce GM/character ownership
4. Clients re-read `sessions` + `session_players` under existing RLS (project membership ensured on join)

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N-actors | GM create + player join; distinct codes via unique index + retry | CLEAR |
| Invalid/missing | Bad/empty code, incomplete sheet, non-GM status → exception | CLEAR |
| Two consumers / crash | SessionJoin + useSessions share one service; no parallel hosted URL | CLEAR |

## Flags
None.
