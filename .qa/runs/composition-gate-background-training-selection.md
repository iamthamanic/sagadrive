# Composition Gate — background-training-selection

- HEAD_SHA: WORKTREE (committed tip includes stack through `b18a106…`; background slice last CLEAR at `dfa29cbcae1700dcd1bf2ded9e68d41457831e92`; WIP carousel hooks / panel polish on top)
- BASE_SHA: `dea1502ddef740ace9646a48a98838fbebcd131f`
- Date: 2026-09-02
- Verdict: **CLEAR** (background hop chain unchanged by attribute WIP; e2e failure is label matcher on attributes section before background assertions complete)

## Event
Spieler wählt ein Hintergrund-Framework, trainiert genau 2 von 4 Pool-Skills ohne Auto-Empfehlung, kann mit „Auswahl ändern“ nachbearbeiten; Icons sind rein präsentativ.

## Hop chain
`backgroundTemplates.ts` (Pool, kein `recommendedTraining`)
→ `CharacterEditor` setzt `backgroundTraining` auf `['','']`
→ `CharacterBackgroundPanel` (4 Nodes während Auswahl, 2 nach Abschluss, „Auswahl ändern“)
→ Persistenz konkreter Trainings in `sagadrive_profile.background`
→ Reload/Library

## Simulations
| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| N-actors | Unabhängige Charaktere; kein Framework-Auto-Write | Parent-local state + concrete save | pass |
| Invalid/missing | <2 Trainings / unvollständiger Pool nicht als complete | `backgroundComplete` verlangt 2 Trainings + Spezialisierung | pass |
| Two consumers / crash | UI-Modus „Auswahl ändern“ nicht persistiert; Save nur konkrete Skills | Kein async consumer; Abort vor Save ohne Side-Effect | pass |

## Flags
| Tag | Severity | Hops | Why local review missed it | Fix |
|-----|----------|------|----------------------------|-----|
| none | — | — | — | — |

## Skip reason
n/a

## Notes
- Regression scripts still reject `recommendedTraining`.
- Full browser proof for background flow blocked this run by earlier attribute e2e assertion failure (`15 / 15 Punkte`).
