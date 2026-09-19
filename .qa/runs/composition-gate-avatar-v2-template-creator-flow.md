# Composition Gate — avatar-v2-template-creator-flow (#260)

## Verdict
CLEAR

## HEAD_SHA
bf583b66d8b382ad6e617761104b6c1664864480

## Business event
User selects a species template („Vorlage anpassen“) → editor seed (morph/traits/family/outfit) → persisted appearance.avatar → reload hydrate.

## Hop chain
1. Producer: `applySpeciesTemplateIngress(speciesId)` (domain)
2. Transformer: CharacterEditor state → `CharacterAvatarDto` (`template_id`, `body_family`, `starter_wardrobe`, morph, traits)
3. Consumer A: Live preview via `resolveAvatarModelUrl` (family body when no model_url)
4. Consumer B: Save → character appearance.avatar → hydrate restores same fields

## Simulations
| Case | Expected | Result |
|------|----------|--------|
| N=1 dwarf pick | compact family + basic outfit ids + morph | PASS (ingress assert + check) |
| N=7 all templates | each seed family matches pack | PASS (`assertTemplateCreatorFlowInvariants`) |
| Invalid fallback missing wearable | warning + omit visual | PASS (ingress warnings) |
| Concurrent edit morph then save/reload | morph from DTO not re-seeded | PASS (hydrate uses saved morph) |
| Source import selected | picker hidden; no template invent | PASS (UI gate) |

## Fan-out / side effects
None (no queue/outbox/webhook). Persistence is owner-scoped character appearance only.

## Notes
Deterministic harness: `scripts/avatar-v2-template-creator-flow-check.mjs`.
