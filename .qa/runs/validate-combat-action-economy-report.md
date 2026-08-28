# SagaDrive Combat & Action Economy Validation Report (#22)

Deterministic play-through of the C1 mandatory scenarios across bands I / III / V.

- Scenarios: 10
- Bands: Novize / Experte / Legende
- Probe rows: 57
- Findings: 0

## Findings
Keine Regel-Lücken, dominante Aktionen oder Timing-Widersprüche in den Pflichtszenarien.

## Scenario results

| Band | Szenario | Probe | Erfolgsanteil | Modus | Anmerkung |
|---|---|---|---:|---|---|
| Novize (Stufe 1) | Nahkampfduell | Nahkampf vs Verteidigung 17 | 60.00% | normal | Standard-Angriff beidseitig; Verteidigung nach §6.2. |
| Novize (Stufe 1) | Fernkampf Teildeckung | Fernkampf vs 17 (Teildeckung) | 42.25% | disadvantage | §7.7 Teildeckung → Nachteil |
| Novize (Stufe 1) | Fernkampf Volldeckung | Ziel nicht direkt anvisierbar | — | impossible | §7.7 Volldeckung: Angriff unmöglich, nicht Nachteil. |
| Novize (Stufe 1) | Fernkampf maximale Reichweite | Fernkampf vs 17 (über normale Reichweite) | 42.25% | disadvantage | §7.8: über normal bis maximal → Nachteil. |
| Novize (Stufe 1) | Überraschung | Initiative mit Nachteil; keine Reaktion vor dem ersten Zug | 79.75% | advantage | Überraschender Angreifer trifft unvorbereitetes Ziel; Opfer hat bis zum ersten Zug keine Reaktion. |
| Novize (Stufe 1) | Überraschung — Initiative | Überraschte würfelt Initiative mit Nachteil | 0.25% | disadvantage | §7.2 Nachteil auf Initiative; Gleichstands-Kaskade §6.3 nicht würfelbar, aber deterministisch auflösbar. |
| Novize (Stufe 1) | Greifen | Nahkampf vs Manöverwiderstand 17 | 65.00% | normal | §7.6 Erfolg → Gegriffen; Krit verschiebt zusätzlich bis 1,5 m. |
| Novize (Stufe 1) | Entkommen | Athletik oder Akrobatik vs Manöverwiderstand 17 | 45.00% | normal | Hauptaktion; Opfer wählt die bessere der beiden Fertigkeiten. |
| Novize (Stufe 1) | Schubsen | Nahkampf vs Körperwiderstand 14 | 80.00% | normal | §7.6: Erfolg 1,5 m; Krit bis 3 m — erzwungene Bewegung, kein Gelegenheitsangriff. |
| Novize (Stufe 1) | Zu-Fall-Bringen | Nahkampf vs Reflexwiderstand 14 | 80.00% | normal | §7.6 Erfolg: Ziel wird Liegend (§9.2). |
| Novize (Stufe 1) | Liegend — Nahkampfangriff | Angriff vs 17 (Ziel Liegend) | 87.75% | advantage | §9.2 Nahkampf aus unmittelbarer Nähe hat Vorteil. |
| Novize (Stufe 1) | Liegend — Fernkampfangriff | Angriff vs 17 (Ziel Liegend) | 42.25% | disadvantage | §9.2 Fernere Angriffe haben Nachteil. |
| Novize (Stufe 1) | Entwaffnen | Nahkampf vs Verteidigung 17 | 60.00% | normal | §7.6 Erfolg: Gegenstand fällt zu Boden; Krit bestimmt Fallrichtung. |
| Novize (Stufe 1) | Lösen (ohne Gelegenheitsangriff) | Hauptaktion; Bewegung löst keinen OA aus | — | none | §7.5: Lösen verhindert Gelegenheitsangriffe für den Rest des Zuges. |
| Novize (Stufe 1) | Rückzug ohne Lösen — Gelegenheitsangriff | Nahkampf vs 17 (Reaktion des Gegners) | 60.00% | normal | §7.5: freiwilliges Verlassen der Reichweite → Gegner-Reaktion. |
| Novize (Stufe 1) | Erzwungene Bewegung / Teleportation | kein Gelegenheitsangriff | — | none | §7.5 Ausnahmenliste. |
| Novize (Stufe 1) | Bereithalten + Auslösen | Fernkampf vs 17 als Reaktion | 60.00% | normal | §7.4 Bereithalten: Hauptaktion jetzt, Ausführung später als Reaktion — keine Gratis-Hauptaktion. |
| Novize (Stufe 1) | Verborgener Angriff | Fernkampf vs 17 aus Verborgenem | 79.75% | advantage | §7.7 Vorteil aus dem Verborgenen; Angreifer wird danach normalerweise sichtbar (observer-relativ, §9.10). |
| Novize (Stufe 1) | Verborgen observer-relativ | 2 Beobachter, 1 nimmt wahr | — | none | §9.10: Verborgen gilt pro Beobachtendem, kein globales Boolean. |
| Experte (Stufe 9) | Nahkampfduell | Nahkampf vs Verteidigung 19 | 60.00% | normal | Standard-Angriff beidseitig; Verteidigung nach §6.2. |
| Experte (Stufe 9) | Fernkampf Teildeckung | Fernkampf vs 19 (Teildeckung) | 42.25% | disadvantage | §7.7 Teildeckung → Nachteil |
| Experte (Stufe 9) | Fernkampf Volldeckung | Ziel nicht direkt anvisierbar | — | impossible | §7.7 Volldeckung: Angriff unmöglich, nicht Nachteil. |
| Experte (Stufe 9) | Fernkampf maximale Reichweite | Fernkampf vs 19 (über normale Reichweite) | 42.25% | disadvantage | §7.8: über normal bis maximal → Nachteil. |
| Experte (Stufe 9) | Überraschung | Initiative mit Nachteil; keine Reaktion vor dem ersten Zug | 79.75% | advantage | Überraschender Angreifer trifft unvorbereitetes Ziel; Opfer hat bis zum ersten Zug keine Reaktion. |
| Experte (Stufe 9) | Überraschung — Initiative | Überraschte würfelt Initiative mit Nachteil | 0.25% | disadvantage | §7.2 Nachteil auf Initiative; Gleichstands-Kaskade §6.3 nicht würfelbar, aber deterministisch auflösbar. |
| Experte (Stufe 9) | Greifen | Nahkampf vs Manöverwiderstand 19 | 65.00% | normal | §7.6 Erfolg → Gegriffen; Krit verschiebt zusätzlich bis 1,5 m. |
| Experte (Stufe 9) | Entkommen | Athletik oder Akrobatik vs Manöverwiderstand 19 | 45.00% | normal | Hauptaktion; Opfer wählt die bessere der beiden Fertigkeiten. |
| Experte (Stufe 9) | Schubsen | Nahkampf vs Körperwiderstand 16 | 80.00% | normal | §7.6: Erfolg 1,5 m; Krit bis 3 m — erzwungene Bewegung, kein Gelegenheitsangriff. |
| Experte (Stufe 9) | Zu-Fall-Bringen | Nahkampf vs Reflexwiderstand 16 | 80.00% | normal | §7.6 Erfolg: Ziel wird Liegend (§9.2). |
| Experte (Stufe 9) | Liegend — Nahkampfangriff | Angriff vs 19 (Ziel Liegend) | 87.75% | advantage | §9.2 Nahkampf aus unmittelbarer Nähe hat Vorteil. |
| Experte (Stufe 9) | Liegend — Fernkampfangriff | Angriff vs 19 (Ziel Liegend) | 42.25% | disadvantage | §9.2 Fernere Angriffe haben Nachteil. |
| Experte (Stufe 9) | Entwaffnen | Nahkampf vs Verteidigung 19 | 60.00% | normal | §7.6 Erfolg: Gegenstand fällt zu Boden; Krit bestimmt Fallrichtung. |
| Experte (Stufe 9) | Lösen (ohne Gelegenheitsangriff) | Hauptaktion; Bewegung löst keinen OA aus | — | none | §7.5: Lösen verhindert Gelegenheitsangriffe für den Rest des Zuges. |
| Experte (Stufe 9) | Rückzug ohne Lösen — Gelegenheitsangriff | Nahkampf vs 19 (Reaktion des Gegners) | 60.00% | normal | §7.5: freiwilliges Verlassen der Reichweite → Gegner-Reaktion. |
| Experte (Stufe 9) | Erzwungene Bewegung / Teleportation | kein Gelegenheitsangriff | — | none | §7.5 Ausnahmenliste. |
| Experte (Stufe 9) | Bereithalten + Auslösen | Fernkampf vs 19 als Reaktion | 60.00% | normal | §7.4 Bereithalten: Hauptaktion jetzt, Ausführung später als Reaktion — keine Gratis-Hauptaktion. |
| Experte (Stufe 9) | Verborgener Angriff | Fernkampf vs 19 aus Verborgenem | 79.75% | advantage | §7.7 Vorteil aus dem Verborgenen; Angreifer wird danach normalerweise sichtbar (observer-relativ, §9.10). |
| Experte (Stufe 9) | Verborgen observer-relativ | 2 Beobachter, 1 nimmt wahr | — | none | §9.10: Verborgen gilt pro Beobachtendem, kein globales Boolean. |
| Legende (Stufe 17) | Nahkampfduell | Nahkampf vs Verteidigung 21 | 60.00% | normal | Standard-Angriff beidseitig; Verteidigung nach §6.2. |
| Legende (Stufe 17) | Fernkampf Teildeckung | Fernkampf vs 21 (Teildeckung) | 42.25% | disadvantage | §7.7 Teildeckung → Nachteil |
| Legende (Stufe 17) | Fernkampf Volldeckung | Ziel nicht direkt anvisierbar | — | impossible | §7.7 Volldeckung: Angriff unmöglich, nicht Nachteil. |
| Legende (Stufe 17) | Fernkampf maximale Reichweite | Fernkampf vs 21 (über normale Reichweite) | 42.25% | disadvantage | §7.8: über normal bis maximal → Nachteil. |
| Legende (Stufe 17) | Überraschung | Initiative mit Nachteil; keine Reaktion vor dem ersten Zug | 79.75% | advantage | Überraschender Angreifer trifft unvorbereitetes Ziel; Opfer hat bis zum ersten Zug keine Reaktion. |
| Legende (Stufe 17) | Überraschung — Initiative | Überraschte würfelt Initiative mit Nachteil | 0.25% | disadvantage | §7.2 Nachteil auf Initiative; Gleichstands-Kaskade §6.3 nicht würfelbar, aber deterministisch auflösbar. |
| Legende (Stufe 17) | Greifen | Nahkampf vs Manöverwiderstand 21 | 65.00% | normal | §7.6 Erfolg → Gegriffen; Krit verschiebt zusätzlich bis 1,5 m. |
| Legende (Stufe 17) | Entkommen | Athletik oder Akrobatik vs Manöverwiderstand 21 | 45.00% | normal | Hauptaktion; Opfer wählt die bessere der beiden Fertigkeiten. |
| Legende (Stufe 17) | Schubsen | Nahkampf vs Körperwiderstand 18 | 80.00% | normal | §7.6: Erfolg 1,5 m; Krit bis 3 m — erzwungene Bewegung, kein Gelegenheitsangriff. |
| Legende (Stufe 17) | Zu-Fall-Bringen | Nahkampf vs Reflexwiderstand 18 | 80.00% | normal | §7.6 Erfolg: Ziel wird Liegend (§9.2). |
| Legende (Stufe 17) | Liegend — Nahkampfangriff | Angriff vs 21 (Ziel Liegend) | 87.75% | advantage | §9.2 Nahkampf aus unmittelbarer Nähe hat Vorteil. |
| Legende (Stufe 17) | Liegend — Fernkampfangriff | Angriff vs 21 (Ziel Liegend) | 42.25% | disadvantage | §9.2 Fernere Angriffe haben Nachteil. |
| Legende (Stufe 17) | Entwaffnen | Nahkampf vs Verteidigung 21 | 60.00% | normal | §7.6 Erfolg: Gegenstand fällt zu Boden; Krit bestimmt Fallrichtung. |
| Legende (Stufe 17) | Lösen (ohne Gelegenheitsangriff) | Hauptaktion; Bewegung löst keinen OA aus | — | none | §7.5: Lösen verhindert Gelegenheitsangriffe für den Rest des Zuges. |
| Legende (Stufe 17) | Rückzug ohne Lösen — Gelegenheitsangriff | Nahkampf vs 21 (Reaktion des Gegners) | 60.00% | normal | §7.5: freiwilliges Verlassen der Reichweite → Gegner-Reaktion. |
| Legende (Stufe 17) | Erzwungene Bewegung / Teleportation | kein Gelegenheitsangriff | — | none | §7.5 Ausnahmenliste. |
| Legende (Stufe 17) | Bereithalten + Auslösen | Fernkampf vs 21 als Reaktion | 60.00% | normal | §7.4 Bereithalten: Hauptaktion jetzt, Ausführung später als Reaktion — keine Gratis-Hauptaktion. |
| Legende (Stufe 17) | Verborgener Angriff | Fernkampf vs 21 aus Verborgenem | 79.75% | advantage | §7.7 Vorteil aus dem Verborgenen; Angreifer wird danach normalerweise sichtbar (observer-relativ, §9.10). |
| Legende (Stufe 17) | Verborgen observer-relativ | 2 Beobachter, 1 nimmt wahr | — | none | §9.10: Verborgen gilt pro Beobachtendem, kein globales Boolean. |

## Notes
- Alle Grade über die geteilte Kernprobe (§2.2 inkl. nat 1/20-Shift) aus scripts/lib/core-probe.mjs.
- Advantage-Folding §2.5: mehrere Quellen heben paarweise auf; nie mehr als 2d20.
- Aktionsökonomie §7.3 als State-Machine: 1 Hauptaktion, 1 Bewegung, 1 freie Interaktion, 1 Reaktion/Runde; keine allgemeine Bonusaktion.
- Überraschung §7.2: Nachteil auf Initiative + keine Reaktion bis zum ersten Zug.
- Deckung/Sicht §7.7 und Reichweite §7.8 als Modifikatoren auf der Kernprobe.
- Manöver-Widerstände §6.5 (Verteidigung, Körper, Reflex, Manöver) deterministisch abgeleitet.