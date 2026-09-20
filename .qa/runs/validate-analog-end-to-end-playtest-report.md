# Analog End-to-End Playtest Report (#31 / Phase G1)

- Findings: 0
- Sessions: 3
- World profiles: eldenmark, graustadt
- Metaressourcen-Deaktivierung: Session-C:drive
- Digitale Hilfen: keine (Rule Engine / App verboten)

## Findings

- 0 Findings: drei analoge Pflichtsessions spielbar; Aufwandsschwellen eingehalten; Prior-Slices clean; keine spekulativen Core-Vorschläge.

## Aufwandsschwellen

| Metrik | Limit |
|---|---:|
| Regelpausen / Session | 8 |
| Nachschläge / Szene | 6 |
| Rechenschritte / Szene | 12 |
| Rechenschritte / Probe | 4 |
| Ungeklärte Situationen | 0 |

## Session-Metriken

| Session | Profil | Pausen | Nachschläge | Rechenschritte | Unklar | Digital-Ersatz |
|---|---|---:|---:|---:|---:|---|
| Session-A | Eldenmark (Fantasy) | 6 | 16 | 40 | 0 | nein |
| Session-B | Eldenmark (Fantasy) | 5 | 15 | 36 | 0 | nein |
| Session-C | Graustadt (Gegenwart) | 5 | 14 | 20 | 0 | nein |

## Session-A — Pflichtsession A — Chargen + Exploration + Sozial + Standardkampf

- Weltprofil: Eldenmark (Fantasy) (Magie 4 / Tech 0)
- Drive: an; Momentum: an
- Pflichtbeats: chargen, exploration, research-or-social, standard-combat

| Szene | Refs | Pausen | Nachschläge | Rechnen | Proben | Notes |
|---|---|---:|---:|---:|---:|---|
| A1-chargen Charaktererschaffung Stufe 1 (analog §17) | §17, §4.7, §5, §13.1 | 2 | 4 | 8 | 0 | Papierbogen + Schnellreferenz; keine App-Validierung. |
| A2-exploration Exploration / Navigation | §14.1, §2.3, §5 | 1 | 3 | 8 | 2 | Gruppenprobe + Fail-Forward ohne Sackgasse. |
| A3-research-social Recherche / soziale Szene | §14.3, §14.4, §14.5, §2.8 | 1 | 4 | 12 | 3 | Haltungskategorie statt freier Zahlenbonus. |
| A4-standard-combat Standardkampf | §6, §7, §8, §2.10 | 2 | 5 | 12 | 3 | Aktionsökonomie + Drive optional; Papier-HP-Strichliste. |

## Session-B — Pflichtsession B — Reise + Projekt + Elite/Boss + Heilung

- Weltprofil: Eldenmark (Fantasy) (Magie 4 / Tech 0)
- Drive: an; Momentum: an
- Pflichtbeats: travel-or-chase, community-project, elite-or-boss, heal-or-rest

| Szene | Refs | Pausen | Nachschläge | Rechnen | Proben | Notes |
|---|---|---:|---:|---:|---:|---|
| B1-travel-chase Reise / Verfolgungsjagd | §14.2, §14.10, §10.4 | 1 | 4 | 12 | 3 | Distanzleiste auf Papier; Gleichstand = 0 Shift. |
| B2-community-project Gemeinschaftsprojekt | §2.8, §14.6 | 1 | 3 | 8 | 2 | Intervall-Cap ≤3 Proben; Fortschritt handgeschrieben. |
| B3-elite-boss Schwerer Kampf (Elite/Boss) | §6, §7, §8, §11, §2.11 | 2 | 5 | 12 | 3 | Boss-Aktionsökonomie + Momentum-Ausgabe auf Marker. |
| B4-heal-rest Heilung / Ruhe | §8.8, §9 | 1 | 3 | 4 | 1 | Erholung × Multiplikator per Hand; Zustände abstreichen. |

## Session-C — Pflichtsession C — anderes Weltprofil + Drive deaktiviert

- Weltprofil: Graustadt (Gegenwart) (Magie 0 / Tech 3)
- Drive: aus; Momentum: an
- Deaktiviert für G1: **drive** (Ersatzregeln §16.3, keine digitale Ersatzlogik)
- Pflichtbeats: other-world-profile, drive-or-momentum-off, no-digital-ersatz

| Szene | Refs | Pausen | Nachschläge | Rechnen | Proben | Notes |
|---|---|---:|---:|---:|---:|---|
| C1-profile-switch Weltprofil-Wechsel (Gegenwart) ohne neuen Grundregel-Lernaufwand | §4.7, §16.1, §16.5 | 1 | 3 | 0 | 0 | Nur Flavor/Quellen/Sperren; Core-Probe unverändert. |
| C2-drive-off Drive deaktiviert — Ersatzregeln prüfen (§16.3) | §2.10, §2.12, §16.3 | 1 | 4 | 4 | 1 | Drive-abhängige Rerolls nicht verfügbar; Ersatzbegrenzung auf Fähigkeiten markiert; kein digitales Ersatz-Ledger. |
| C3-exploration-conflict Exploration + Konflikt ohne Drive | §14.1, §6, §7, §5 | 2 | 5 | 12 | 3 | Momentum bleibt; Probe/Schaden analog wie Session A. |
| C4-recovery Erholung ohne Metaressourcen-Lücke | §8.8, §9, §2.11 | 1 | 2 | 4 | 1 | Momentum-Decay per Szenenende auf Papier; keine unsichtbare Drive-Abhängigkeit. |

## Prior-Slice-Aggregation

| Issue | Report | Status | Findings |
|---:|---|---|---:|
| #19 | `.qa/runs/validate-core-probability-report.md` | CLEAN | 0 |
| #20 | `.qa/runs/validate-character-creation-progression-report.md` | CLEAN | 0 |
| #22 | `.qa/runs/validate-combat-action-economy-report.md` | CLEAN | 0 |
| #23 | `.qa/runs/validate-damage-healing-dying-report.md` | CLEAN | 0 |
| #24 | `.qa/runs/validate-enemy-encounter-boss-balance-report.md` | CLEAN | 0 |
| #25 | `.qa/runs/validate-powers-essences-ranks-report.md` | CLEAN | 0 |
| #26 | `.qa/runs/validate-drive-momentum-report.md` | CLEAN | 0 |
| #27 | `.qa/runs/validate-noncombat-projects-social-report.md` | CLEAN | 0 |
| #28 | `.qa/runs/validate-all-core-skills-report.md` | CLEAN | 0 |
| #29 | `.qa/runs/validate-travel-chase-vehicles-report.md` | CLEAN | 0 |
| #30 | `.qa/runs/validate-world-profiles-modules-report.md` | CLEAN | 0 |
| #32 | `.qa/runs/validate-gear-resources-load-report.md` | CLEAN | 0 |
| #33 | `.qa/runs/validate-conditions-resistances-report.md` | CLEAN | 0 |

## Core-Änderungsvorschläge (evidenzgebunden)

- Keine. Alle Prior-Slices und G1-Sessions sind clean; spekulative Backlog-Einträge sind unzulässig.

## Human Playtest Protocol (optional live Tisch)

Diese Engine fixiert den Papier-Ledger deterministisch. Eine physische Tischgruppe kann dieselben Sessions A/B/C mit Charakterbogen, Würfeln und Schnellreferenz wiederholen und Abweichungen als Findings nachtragen — nur reproduzierbare Abweichungen werden Core.

1. Session A: Fantasy-Chargen → Exploration → Sozial/Recherche → Standardkampf.
2. Session B: Reise/Chase → Gemeinschaftsprojekt → Elite/Boss → Heilung/Ruhe.
3. Session C: anderes Weltprofil + Drive **oder** Momentum aus; keine App/Rule Engine.
4. Pro Szene: Pausen, Nachschläge, Rechenschritte, Unklarheiten notieren.

## Harte K.o.-Kriterien

- Sessions ≥ 3: true
- Weltprofile ≥ 2: true
- Metaressource deaktiviert ohne Digital-Ersatz: true
- Prior-Slices CLEAN: true
- Spekulative Core-Vorschläge: 0
