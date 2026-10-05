# Composition Gate — golden-adventure-dornhain
- HEAD_SHA: c5feb7e262f3787852645e0f233326f0ffa61203
- BASE_SHA: 226960b24aaca14313a36ec0e2fdea24bd40acf7
- Verdict: CLEAR

## Event
GM instantiates Dornhain package → adventure runtime commands → shared.adventure + projects.adventure_runtime with definitionRef package:dornhain.whisper.v1.

## Hop chain
GoldenAdventureDornhainPanel
→ dornhainInstantiateCommands / useAdventureRuntime
→ adventure-runtime-state + SQL adventure (#374)
→ session/project durable playthrough

## Simulations
- N-actors: multiple sessions hydrate same package definitionRef without mutating package source.
- Invalid/missing: integrity assert fails closed; non-GM cannot instantiate.
- Two consumers / crash: mid-instantiate leaves partial flags; persist/hydrate resume from project.adventure_runtime.

## Flags
none
