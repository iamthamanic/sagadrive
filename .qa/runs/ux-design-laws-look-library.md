# UX Design Laws — look-library (#343)

Date: 2026-09-27

| Law | Check | Result |
|-----|-------|--------|
| Hick | Looks tab = one job (browse/manage Looks); create is primary CTA | pass |
| Fitts | Search + CTAs `min-h-11`; card actions sized `sm` with text | pass |
| Jakob | Reuses Bibliothek Tabs + Card/Badge/Button patterns from Items/NPCs | pass |
| Proximity | Preview + name/meta + actions grouped per card | pass |
| Miller | Filters kept simple (search); advanced filters deferred | pass |
| Doherty | Loading spinner on fetch; toast on duplicate/archive outcome | pass |
| Peak-End | Empty copy invites first create; error offers retry | pass |
| Postel's / errors | Failures surface DE messages; read-only hides mutate paths | pass |

## Task completion
Open Library → Looks → see states → Create/Edit navigate to `/looks/*` stubs → Duplicate/Archive mutate via service.

## Verdict
PASS
