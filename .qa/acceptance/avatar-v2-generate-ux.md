# Feature: Avatar V2 19/22 — Generate UX Editierbar vs Freie Form

<!-- #267 / Epic #248 — slug: avatar-v2-generate-ux -->

## Intent
Provider-neutraler Generate-Flow mit zwei Produktzielen: kanonisch editierbar/kleidungsfähig oder freie Körperform. Meshy bleibt Adapter.

## Happy Path
- [x] Mit KI erstellen ist fachlich provider-neutral; Meshy nur Adapter/Record
- [x] Beide Modi → Artifact→Analyzer→gemeinsamer Editor
- [x] UI States loading/progress/failure/unavailable/retry ohne Provider-Leak in Fach-UI
- [x] Keine Source-/Capability-Entscheidung am Providernamen
- [x] Zero type escape hatches

## Composition Gate
- HEAD_SHA: WORKTREE
- Verdict: CLEAR
