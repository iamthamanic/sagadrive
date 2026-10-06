# Feature: Basic Look Adaption UX

<!-- issue #353 — feature slug: basic-look-adaption-ux -->

## Intent

`Bibliothek › Looks › Look erstellen` bietet „Von Referenzbildern erstellen“: 1–10 Referenzen hochladen, Style/Content klassifizieren, analysieren, Draft in der Look Preview Stage prüfen, dann speichern.

## Happy Path

- [x] Create Flow: Preset / Referenzbilder / Bestehenden Look duplizieren
- [x] Referenzmodus: 1–10 PNG/JPEG/WebP
- [x] Jede Referenz zeigt STYLE|CONTENT; umklassifizieren / gewichten / entfernen vor Analyse
- [x] Analyse: Loading/Progress/Error/Retry → editierbarer Draft in Look Preview Stage
- [x] Reanalyse im Edit: neue Version erst nach Speichern; alte Version unverändert
- [x] Zero type escape hatches; `basic-look-adaption-ux-check` + test-gate

## Edge Cases

- [x] <1 oder >10 Bilder geblockt
- [x] Unsupported MIME → Fehlermeldung; bestehende Refs bleiben
- [x] Analyse-Fehler behält Referenzen + Retry
- [x] Entfernen nach Upload vor Analyse
- [x] Reanalyse ohne stilles Speichern

## Security Coverage

Client-side mime/size gate; analysis via authenticated edge (`analyzeLookReferencesForDraft`); no silent save.

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-basic-look-adaption-ux.md`
