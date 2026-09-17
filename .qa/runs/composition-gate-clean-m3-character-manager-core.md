# Composition Gate — clean-m3-character-manager-core

- HEAD_SHA: 6944eee68402a61da65bbff24506f31051643e0b
- Date: 2026-09-17
- Verdict: CLEAR

## Event
App/Infrastructure adds or replaces a trait overlay mesh for a character preview.

## Hop chain
TraitLifecyclePort.add/replace (domain registry)
→ beginAsyncLoad (generation++)
→ Infrastructure loads mesh
→ attachLoadedRoot / commitAsyncLoad
→ GPU attach under overlay parent
→ AvatarCoreStatus ready/error to App

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N actors | one overlay instance per groupId; replace disposes previous once | registry keyed by groupId; onDispose once via disposedIds | pass |
| invalid / missing | empty group/assetKey → error status; no attach | throw after setStatus error; adapter never attaches | pass |
| 2 consumers / crash | stale generation discarded; double remove no-op | commitAsyncLoad false for stale; disposeObject3DTreeOnce WeakSet | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| (none) | | | | |

## Skip reason
n/a
