# Acceptance — architecture-migration-09-app-shell (#173)

## Intent
Move remaining feature screens and shell composition out of `src/components/**` into `src/app/**` slices.

## Happy Path
- [x] Layout, AuthGate, LoginScreen, SagaDriveLogo, ViewLoadingFallback → `app/shell`
- [x] Dashboard → `app/dashboard`
- [x] Profile → `app/profile`
- [x] Library + EntityBrowser(+Card) → `app/library`
- [x] SessionJoin → `app/session`
- [x] Character assistant → `app/character/assistant`
- [x] Delete CharacterEditor compatibility barrel; App imports canonical slices only
- [x] `components/**` retains only generic UI leftovers for #174 (`ui/`, icons, connectors, figma helper)

## Edge Cases
- [x] No new `app/components|hooks|services` dump folders
- [x] App.tsx remains composition root with lazy views from app slices

## Composition Gate
See `.qa/runs/composition-gate-architecture-migration-09-app-shell.md`
