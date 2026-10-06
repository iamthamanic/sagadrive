# Composition Gate — session-invite-share-entry

- HEAD_SHA: 50919cdaef8bcc445d7874c3b8de88b3ead4dce5
- BASE_SHA: 00f485670b2d38b13df8cd9cab8a6fedcca44e51
- Date: 2026-10-06
- Verdict: CLEAR

## Event
GM creates an opaque session invite; recipient opens `/session-invite?t=…`; server resolve returns saga/session facts; client navigates to session-join or live rejoin without role claims from the URL.

## Hop chain
SessionInviteShareButton → `create_session_invite` (rotate prior) → clipboard URL → AuthGate stash if logged out → `resolve_session_invite` → decideInvitePostResolveNavigation → `buildSessionJoinPath` / `pathForSessionLive` (token stripped) → #478 character join / live

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Each invitee resolves under own auth; membership upserts once | resolve facts + existing join upsert | pass |
| Invalid/missing | missing/revoked/expired token → German error, no live nav | error_code path, stay on resolve | pass |
| Two consumers / crash | Crash after resolve before join leaves no forced membership; re-open invite safe | resolve only updates last_resolved_at | pass |
| GM rejoin | live gamemaster | already_member + is_project_gm | pass |
| Auth interrupt | return to invite path | setInviteReturnPath / takeInviteReturnPath | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason
n/a
