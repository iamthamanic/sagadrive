# SagaDrive Navigation — Public IDs, URLs, Screen vs Modal

Canonical rules for #276. Implementation: `src/domains/resource-id/**`, `src/app/shell/routing/**`.

## Public IDs

Format: `PREFIX-XXXXX` (exactly 5 body characters).

Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `O`, `0`, `I`, `1`).

Rules: uppercase; ≥1 letter and ≥1 digit; server-generated; immutable; UNIQUE.

| Prefix | Resource |
|--------|----------|
| `SA-` | Saga (`projects`) |
| `SE-` | Session (`sessions`) |
| `CH-` | Character |
| `IT-` | Item definition |
| `NPCC-` | NPC / Creature definition |
| `SC-` | Scene (reserved) |
| `QT-` | Quest (reserved) |

Internal UUID / TEXT PKs remain the relational source of truth. `projects.code` stays the join code and must never be merged with `SA-XXXXX`.

Public IDs are **identifiers, not secrets**. Knowledge of an ID never grants access — Auth, RLS, and membership do.

## Canonical Saga / Session URLs

```text
/sagas
/sagas/new
/sagas/:sagaPublicId → /overview
/sagas/:sagaPublicId/{overview|characters|world|npc-creatures|items|quests|sessions|settings}

/sagas/:sagaPublicId/sessions/:sessionPublicId          → status → prepare|live|recap
/sagas/:sagaPublicId/sessions/:sessionPublicId/prepare
/sagas/:sagaPublicId/sessions/:sessionPublicId/live
/sagas/:sagaPublicId/sessions/:sessionPublicId/recap

/sagas/.../live/gamemaster
/sagas/.../live/player                     → resolve assigned character → canonical
/sagas/.../live/player/:characterPublicId
/sagas/.../live/display
```

`session_number` is immutable order within a saga; `SE-XXXXX` is identity.

Compatibility: `/gamemaster` and `/adventure-editor` remain reachable but are not a second navigation source of truth.

## Screen vs Modal

**Screen + URL** when any of: reload restore, history step, shareable link, own resource identity, standalone/long task, primary navigation.

**Modal / popover / drawer** when the action is short-lived inside the current screen and closing returns to the exact previous context.

Decision test: *Should this view open as its own link?* Yes → route/screen. No → modal.
