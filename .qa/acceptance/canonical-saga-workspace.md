# Acceptance — canonical-saga-workspace (#489)

Feature slug: `canonical-saga-workspace`

## Intent

User-facing Saga is the canonical campaign container. `/sagas`, `/sagas/new`, and `/sagas/:sagaPublicId/**` are real product surfaces. Dashboard/Library/Session entry use Saga terminology. ProjectJoin is join-only; create/open go through `/sagas`.

## Happy Path

- [x] `/sagas` lists authorized Sagas via project summaries
- [x] `/sagas/new` creates via project-service and navigates to `/sagas/:sagaPublicId/overview`
- [x] Dashboard „Saga erstellen“ → `/sagas/new`; open → saga overview
- [x] Library CTAs use Saga create path + Saga copy
- [x] ProjectJoin join-only; open → saga overview; create CTA → `/sagas/new`
- [x] SessionJoin labels Saga (no „Abenteuer (Projekt)“)
- [x] Internal `projects` / project-service unchanged
- [x] AdaptivePage on saga list/new/section + join; zero type escape hatches
- [x] `canonical-saga-workspace-check` wired in test-gate

## Edge Cases

- Empty Saga list → create CTA
- Create without publicId → error, no fake navigate
- Invalid saga URL → clear error + back
- Unavailable sections → empty/unavailable copy (no fake controls)

## Security Coverage

- Membership/RLS remain authority; public ID is identity only
- No client-claimed GM rights from URL

## Scope

In: Dashboard, Library, SagaResourceScreen (+ list/create/nav), ProjectJoin demotion, SessionJoin copy, gate
Out: DB rename, new subsystem engines, Live composition

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-canonical-saga-workspace.md`
