# Feature: Basic Look Reference Analysis

<!-- issue #352 — feature slug: basic-look-reference-analysis -->

## Intent

Provider-neutrale Referenzanalyse: 1–10 Style-/Content-Bilder → strukturierter, editierbarer LookProfile-Draft (Palette, Character, Lighting, PostFX). AI analysiert Stil; sie rendert nicht die Runtime-Ausgabe.

## Happy Path

- [x] Analyzer akzeptiert 1–10 PNG/JPEG/WebP mit Typ `style|content` und Gewichtung
- [x] Content References werden nicht automatisch als Stilquelle behandelt
- [x] Provider-neutraler Contract (`LookReferenceAnalyzer`) + Domain-Normalisierung
- [x] Strukturierter Draft: Palette/Color, Character Shading/Outline, Lighting, PostFX
- [x] Erster Provider ausschließlich Edge/Infrastructure (`look-reference-analysis`)
- [x] Domain/Persistence ohne Provider-Typen oder Secrets
- [x] Provenance/Analysis-Version (`look-ref-analysis-v1`); ungültige Analyse wird nicht gespeichert
- [x] Zero type escape hatches; `basic-look-reference-analysis-check` + test-gate

## Edge Cases

- [x] 1 Bild vs 10 Bilder (count gate)
- [x] Nur Content References → neutrale Knobs/Palette, contentNotes erlaubt
- [x] Provider free-text / unknown keys → reject (nicht speichern)
- [x] Provider-Leak-Felder (`apiKey`, …) → reject
- [x] Owner-scoped storage path + mime sniff auf Edge

## Security Coverage

- API keys nur serverseitig (`LOOK_AI_*` / `CHARACTER_AI_*` fallback)
- Auth required; in-memory rate limit
- Upload/asset refs owner-scoped; mime validated from bytes
- Persist path: `createLookProfileFromReferenceAnalysis` only after normalized draft

## Composition Gate

- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-basic-look-reference-analysis.md`
