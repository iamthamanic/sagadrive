# Feature: Saga-Seite Hub UI – Geschichte und Gruppenfortschritt

## Intent
Ersetze den Placeholder in `SagaResourceScreen` Overview durch eine echte Saga-Übersicht mit genau einem Primary-CTA je Rolle.

## Happy Path
- [x] `/sagas/:id/overview` zeigt 4 Sections mit Overview-VM Daten.
- [x] Library Primary = „Saga öffnen“.
- [x] Primary CTA rollenbasiert aus `resolveSagaPrimaryAction`.
- [x] AU content-width + AdaptivePage; Phone/Tablet/Desktop via shared layout.
- [x] Keine Secret-Column-Namen in Hub-Komponenten (check).
- [x] Component header comments auf allen 4 Komponenten.
- [x] Touched files: zero type escape hatches.

## Edge Cases
- [x] 0 Sessions → wait / host via domain
- [x] Error state + zurück zur Liste
- [x] Lange Blurbs expand
- [x] >12 Episoden → „Ältere anzeigen“

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-saga-overview-hub-ui.md`
