# SagaDrive Release Readiness

`readiness.json` ist die kanonische Source of Truth für Release-Reife. GitHub Issues sind Work-Items und Evidence, aber nicht der Release-Vertrag.

## Release-Stufen

| Milestone | Bedeutung |
|---|---|
| **R0 – Reveal** | Wir können SagaDrive öffentlich zeigen |
| **R1 – Closed Alpha** | Fremde Gruppen können wirklich spielen |
| **R2 – Public Beta** | Jeder kann selbstständig starten |
| **R3 – Paid Acquisition** | Wir können Geld in User Acquisition stecken |

Milestones sind kumulativ: R2 umfasst alle Anforderungen aus R0 + R1 + R2.

## Auswertung

```bash
node scripts/release-readiness.mjs --refresh-github --write
```

Optionaler vollständiger Daily Gate Run:

```bash
npm run test-gate
npm run test:e2e
node scripts/release-readiness.mjs --refresh-github --write
```

Der Bericht zeigt pro Milestone:
- erledigte Tasks / Gesamt-Tasks
- % fertig
- % fehlt bis 100 %
- Anzahl fehlender Tasks
- READY oder BLOCKED
- Critical Blockers
- Status der kanonischen Userflows
- Human-Evidence und stale Evidence
- Änderungen zum vorherigen Lauf

Ein hoher Prozentwert gibt **keine** Freigabe. Ein Milestone ist nur READY, wenn alle erforderlichen blocking Gates `PASS` oder explizit `N/A` sind.

## Statuswerte

- `PASS` — nachgewiesen erfüllt
- `FAIL` — geprüft und fehlgeschlagen
- `BLOCKED` — kann wegen einer abhängigen Anforderung noch nicht bestehen
- `NOT_RUN` — noch nicht geprüft / Evidence fehlt / GitHub nicht lesbar
- `STALE` — frühere Human-Evidence ist durch relevante Änderungen veraltet
- `N/A` — explizit nicht anwendbar

## Human Evidence

Qualitative Gates dürfen nicht vom LLM selbst bestanden werden. Sie benötigen:
`.qa/release/evidence/<GATE-ID>/evidence.json`

Beispiel:

```json
{
  "status": "PASS",
  "commitSha": "0123456789abcdef0123456789abcdef01234567",
  "reviewers": ["Ben", "Tester 2"],
  "date": "2026-09-27",
  "notes": "Mund, Blink L/R, Gaze, Head und Brows auf realem Webcam-Input geprüft."
}
```

Wenn seit `commitSha` relevante Pfade geändert wurden, setzt der Checker das Gate auf `STALE`.

## Userflows

Unter `.qa/release/flows/` liegen die kanonischen Release-Flows:
- FLOW-001 Join Session
- FLOW-002 Human Performance → Character → Remote Player
- FLOW-003 Golden Run 60–90 Minuten
- FLOW-004 Viewer
- FLOW-005 Director
- FLOW-006 Session Continuity

Ein Flow ist nur PASS, wenn alle verknüpften Gates PASS/N/A sind.

## GitHub Milestones

Einmalig:

```bash
node scripts/release-readiness-setup.mjs
```

Das Script legt R0–R3 idempotent als GitHub Milestones an. Es schließt/reopened keine Issues und ändert keine Produkt-Issue-Inhalte.

## Daily OpenClaw

Der vollständige Setup-/Cron-/Reporting-Prompt liegt in `OPENCLAW_PROMPT.md`.
