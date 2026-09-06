# Composition Gate — item-routing-foundation

- HEAD_SHA: 
- Date: 2026-09-06
- Verdict: CLEAR

## Event

User navigates to a shell screen (or Item placeholder) via URL or `onNavigate`; browser history becomes the single source of truth for which screen is shown.

## Hop chain

UI click / deep link → `navigateToView` / `pushState` → `popstate`/`useAppLocation` → `resolvePathname` → AppShell switch → Layout label (no persistence / no Supabase)

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | One browser tab; one active route | Single History state per tab | pass |
| invalid / missing | Unknown path → not-found UI, no loop | `not-found` kind + home CTA | pass |
| 2 consumers / crash | Layout + view both read same hook state | Shared `useAppLocation` in AppShell | pass |

## Flags

| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason

n/a — CLEAR (single-hop UI routing; documented hop for History SoT)
