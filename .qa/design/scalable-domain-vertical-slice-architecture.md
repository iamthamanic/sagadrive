# Design: Scalable Domain / Vertical-Slice Architecture

**Feature slug:** `scalable-domain-vertical-slice-architecture`  
**Issue:** #94  
**Status:** Ready for /implement: YES

## Intent

Establish a **Modular Monolith** with explicit domain boundaries, vertical slices for user flows, and a UI-independent rules kernel — incrementally migrated (Character + SagaDrive rules only) to unblock Skill Progression v2 (#90/#91).

## Principles

1. **Domains** hold business rules and types; no React, no Supabase, no UI imports.
2. **Infrastructure** adapts persistence (Supabase); no UI.
3. **App slices** compose UI + use-cases; one slice per user journey (edit, creation, progression).
4. **Shared UI** is presentation-only; no domain rules.
5. **Compatibility barrels** at legacy `src/modules/*` paths during migration.

## Target Layout

```
src/
├── domains/
│   ├── character/
│   │   ├── domain/           # entities (attributes, saga profile)
│   │   ├── contracts/        # commands + view models
│   │   └── use-cases/        # normalize, validate, service facade
│   └── rules/
│       └── sagadrive/        # rules kernel slices (no UI/Supabase)
│           ├── character-creation/
│           ├── attribute-progression/
│           ├── background-templates/
│           ├── species-trait-options/
│           ├── species-resistance-hazards/
│           └── derived-stats/
├── infrastructure/
│   └── character/            # CharacterDto + Supabase repository
├── app/
│   └── character/
│       ├── edit/             # CharacterEditor shell
│       ├── creation/         # species, background, archetype, essence
│       └── progression/      # skills, abilities, stats, inventory, preset
├── shared/
│   └── ui/                   # re-exports Radix primitives (components/ui)
└── modules/                  # legacy barrels → canonical paths
```

## IST → SOLL Mapping

| IST | SOLL |
|-----|------|
| `src/components/CharacterEditor.tsx` | `src/app/character/edit/CharacterEditor.tsx` |
| Creation panels (species, background, archetype, essence, entry dialog) | `src/app/character/creation/` |
| Progression panels (skills, abilities, statistics, inventory, preset, notes) | `src/app/character/progression/` |
| `character.service.ts` | `use-cases/normalize-character.ts` + `use-cases/character-service.ts` + `infrastructure/supabase-character.repository.ts` |
| `character.types.ts` | `domain/*` + `contracts/*` + `infrastructure/character.persistence.ts` |
| `derivedStats.ts` | `domains/rules/sagadrive/derived-stats/` (pure) + `app/character/edit/map-derived-stat-cards.ts` (UI) |
| `src/modules/rulesets/*` | `src/domains/rules/sagadrive/<slice>/` |

## Boundary Rules (enforced by `architecture-boundary-check.mjs`)

| Layer | May import | Must NOT import |
|-------|------------|-----------------|
| `domains/**` | other domains via public `index` only; stdlib | `react`, `@/components`, `src/app`, `supabase`, `src/infrastructure` internals |
| `domains/rules/**` | stdlib only | React, UI, Supabase, infrastructure |
| `infrastructure/**` | domains (public), lib/supabase | React UI components (`src/components`, `src/app`) |
| `app/**` | domains, infrastructure, shared/ui, lib | other app slices' private internals (prefer slice index) |

## Non-Goals (#94)

- Skill Progression v2 runtime (#90/#91)
- Full migration of projects/sessions/worlds/marketplace
- UI redesign, new DI frameworks, DB schema changes

## Follow-ups (#90/#91)

- Wire applicable EB / skill stacking in rules kernel consumers
- Extend progression slice for level-up UX
- Migrate remaining `src/modules/*` domains when touched
