# Composition Gate Proof — Background skill points in pool nodes

- HEAD_SHA: bbb9ab52b54ad3c3952f6bf81fbf426fcde01600
- BASE_SHA: f5195acef1eda9a9ea08f07c7816900fb6b92ca9
- Date: 2026-09-03
- Verdict: SKIPPED

## Event

Editor UI: (1) distribute stackable 2-point background skill budget on pool nodes; (2) polish (clickable nodes, centering, intro copy); (3) primary essence carousel; (4) keep all 4 pool nodes visible after spend + specialize-in-node controls; (5) SkillIcon on nodes/select — all within Character Editor creation panels.

## Hop chain

UI (`CharacterBackgroundPanel` / `BackgroundSkillNode`, `CharacterEssencePanel` / `EssenceCarousel`) → existing editor callbacks (`onBackgroundSkillPointsChange`, specialization apply, `onEssenceChange`) → existing character editor state → existing save path. No new worker, queue, webhook, mail, or migration. Domain budget invariants unchanged (`adjustBackgroundSkillPoints` helpers only). Specialization suggestion names are read-only catalog helpers from `background-templates`.

## Simulations

- N-actors: unchanged owner-scoped character save; no multi-tenant write path added.
- Invalid/missing: + disabled when budget full or skill already at 2; − disabled at 0; Spezialisieren only when points spent; essence select via carousel; V2 persistence still fail-closed on save.
- Two consumers / crash: single UI hop; no secondary rules engine; specialization still requires full 2-point spend.

## Flags

None.

## Skip reason

Single-hop UI only; child −/+ must not sit under aria-disabled parent card (presentation + local state callbacks + static suggestion catalog). No producer→consumer side-effect path, no bulk fan-out, no cross-service hop. Live re-stamp for PR head `35bf6d1`.
