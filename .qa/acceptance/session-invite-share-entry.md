# Acceptance — session-invite-share-entry (#490)

Feature slug: `session-invite-share-entry`

## Intent

GM shares a concrete Session via „Einladung kopieren“; authenticated recipients resolve an opaque invite token into the authorized session-entry flow without role claims from the URL.

## Happy Path

- [x] GM creates invite via `create_session_invite` (rotates prior active invites)
- [x] „Einladung kopieren“ on SessionJoin create-success and GM Live
- [x] `/session-invite?t=` resolves → `/session-join?saga&project_id&intent=join` (token stripped)
- [x] Existing GM membership → live gamemaster; existing player with character → live player
- [x] Auth interruption stashes invite path (`sagadrive:invite-return`) and resumes after login
- [x] Code join remains available as fallback
- [x] `revoke_session_invite` available; expired/revoked/completed surfaced in German
- [x] Zero type escape hatches; gate wired in test-gate

## Edge Cases

- Missing/invalid/revoked/expired token
- Completed session
- Login mid-invite
- Rejoin without double membership (join upsert remains SoT on play join)

## Security Coverage

- Invite token is not authorization; resolve returns facts only
- No GM/Director rights from URL; `is_project_gm` / membership computed server-side
- Token not required in canonical live URL after resolve
- Create/revoke GM-only via `is_project_gm`

## Scope

In: migration 055, domain session-invite, session-service RPCs, resolve screen, share button, AuthGate return, routing
Out: Character picker (#478), lobby, anonymous watch, mail/social send

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-session-invite-share-entry.md`
