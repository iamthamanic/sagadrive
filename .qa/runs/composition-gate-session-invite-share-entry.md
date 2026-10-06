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
| 1 invitee | session-join intent=join | decide → session-join | pass |
| GM rejoin | live gamemaster | already_member + is_project_gm | pass |
| Player rejoin w/ character | live player + CH | character_public_id | pass |
| Expired/revoked | German error, no live | error_code path | pass |
| Auth interrupt | return to invite path | setInviteReturnPath / takeInviteReturnPath | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason
n/a
