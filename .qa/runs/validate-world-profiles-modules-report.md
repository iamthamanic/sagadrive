# SagaDrive World Profiles & Modules Report (#30)

Deterministische Prüfung von §4.7 (20 Pflichtfelder), §16.1 (Modulvertrag), §16.2 (Priorität), §16.3 (Deaktivierung), §16.5 (unabhängige Skalen). Kein RNG.

- Profile vollständig geprüft: 0/3
- Modulkonfliktfälle (§16.2): 3
- Cross-Setting-Abbildungen: 6
- Findings: 0

## Findings
- Alle 20-Felder-Profile legal; Modulpriorität deterministisch; Deaktivierungen deklariert; keine stillen Core-Änderungen; Magie/Tech unabhängig.

## Weltprofile (§4.7)

### undefined — Klassische Fantasy

- Magie 4/4 · Tech 0/4 (unabhängig, §16.5) · Härtegrad Standard
- Aktive Module: MOD-HARNESS-HEROIC
- Deaktivierte Regeln: §4.7: Profil Eldenmark: Pflichtfeld „milieus" fehlt.
- Deklarierte Abweichungen: —
- Audit: FEHLER: undefined

### undefined — Moderne Gegenwart

- Magie 0/4 · Tech 3/4 (unabhängig, §16.5) · Härtegrad Standard
- Aktive Module: MOD-TECH-GEAR
- Deaktivierte Regeln: §4.7: Profil Graustadt: Pflichtfeld „milieus" fehlt.
- Deklarierte Abweichungen: —
- Audit: FEHLER: undefined

### undefined — Science-Fiction hoher Technologie

- Magie 1/4 · Tech 4/4 (unabhängig, §16.5) · Härtegrad Standard
- Aktive Module: MOD-HARNESS-HEROIC, MOD-SPACE-GEAR
- Deaktivierte Regeln: §4.7: Profil Orbita: Pflichtfeld „milieus" fehlt.
- Deklarierte Abweichungen: —
- Audit: FEHLER: undefined

## Modulpriorität (§16.2)

- MOD-HARNESS-HEROIC vs Core §8.8 → Spezialmodul (MOD-HARNESS-HEROIC): Volle Ruhe heilt zusätzlich 1 × Erholung.
- Manuelles Core-Szenario → Spezialmodul: Volle Ruhe heilt zusätzlich 1 × Erholung.
- MOD-COUNTER-CLAIM vs MOD-HARNESS-HEROIC (§8.8 doppelt belegt) → Deklarierter Konflikt — gleichzeitige Aktivierung verboten; Profil muss sich für genau ein Modul entscheiden.

## Cross-Setting-Abbildung (F1)

| Konzept | Profil | Essenz | Flavor |
|---|---|---|---|
| Heiler (Siegel vs Medbank) | Eldenmark | Körperlich | Biomantin |
| Heiler (Siegel vs Medbank) | Orbita | Technologisch | Medbank-Operateur |
| Kämpfer (Kriegsruf vs Neuro-Überladung) | Eldenmark | Mental | Kriegsschamane |
| Kämpfer (Kriegsruf vs Neuro-Überladung) | Orbita | Mental | Neuro-Überladung |
| Rebell (Paktgeist vs Drohnenschwarm) | Eldenmark | Gebunden | Paktgebundene |
| Rebell (Paktgeist vs Drohnenschwarm) | Orbita | Gebunden | Drohnenschwarm-Pakt |

## Negativpfade

- §4.7/20: stille Drive-Max-Änderung → abgelehnt
- §16.3: Momentum deaktiviert ohne Ersatzregel → abgelehnt
- §16.3: Genresperrung Spirituell ohne Markierung → abgelehnt
- §16.2: Weltprofil überschreibt aktives Modul → abgelehnt