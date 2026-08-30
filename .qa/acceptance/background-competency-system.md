# Background-Kompetenzsystem – Acceptance

## Scope

Epic #67 führt Background Templates, `Parameter > Kompetenzen`, Quellenvisualisierung und die konsolidierte Start-Fertigkeitsverteilung ein.

## Verbindliche Regeln

- Hintergrund gibt keine Attributsboni.
- Template: exakt vier unterschiedliche Pool-Fertigkeiten.
- Zwei unterschiedliche Pool-Fertigkeiten erhalten je `Hintergrund +1`.
- Eine Spezialisierung liegt auf einer trainierten Hintergrund-Fertigkeit.
- Primärarchetyp vergibt genau `Archetyp +1` aus seiner typischen Liste.
- Sieben Punkte sind frei.
- Gesamt bei Charaktererschaffung: `2 + 1 + 7 = 10`.
- Start-Cap 3 und mindestens sechs trainierte Fertigkeiten bleiben erhalten.
- `Eigenen Hintergrund erstellen` ist mechanisch gleichwertig zu Templates.

## Desktop

- [ ] Top-Level-Tab `Hintergrund` ist entfernt.
- [ ] `Parameter` besitzt `Kompetenzen | Archetype | Essenz`.
- [ ] Kompetenzen zeigt Attribute, Hintergrund und Fertigkeiten in dieser Reihenfolge.
- [ ] Template-Karten zeigen Name, Kurzbeschreibung und vier Skills.
- [ ] `Straßenarzt` zeigt Medizin, Menschenkenntnis, Überleben, Aufmerksamkeit.
- [ ] Empfehlungen sind markiert, aber veränderbar.
- [ ] Der Hintergrundflow ist als `4 Pool → 2 Training → 1 Spezialisierung` lesbar.
- [ ] Skill-Details zeigen Standardattribut und Quellen.
- [ ] Standardattribut ist ausdrücklich keine Voraussetzung.
- [ ] Hintergrund-Pool und tatsächlich trainierte Hintergrund-Skills sind visuell unterscheidbar.
- [ ] Freie Punkte werden nicht mehr im Archetyp-Tab verwaltet.
- [ ] Narrative Hintergrundgeschichte und Notizen bleiben erreichbar.

## Mobile / Touch

- [ ] Bei 375–390 px bleibt der Flow ohne horizontales Graph-Scrolling bedienbar.
- [ ] Hintergrundstufen werden als vertikale Branch-Rail dargestellt.
- [ ] Alle primären Auswahl-/Punkte-Controls sind touch-bedienbar.
- [ ] Keine notwendige Information hängt ausschließlich von Hover ab.

## Keyboard / Accessibility

- [ ] Template-Karten sind per Tastatur fokussierbar und auswählbar.
- [ ] Trainingsknoten besitzen `aria-pressed`.
- [ ] Quellen werden nicht nur durch Farbe kommuniziert.
- [ ] Skill-Fokus öffnet dieselben Informationen wie Click.
- [ ] Fokusindikatoren bleiben sichtbar.
- [ ] Dark/Light Theme besitzen ausreichenden Kontrast.
- [ ] Nicht notwendige Animationen respektieren `prefers-reduced-motion`.

## Persistenz / Backward Compatibility

- [ ] Neue Profile speichern optional `backgroundTemplateId`.
- [ ] Konkrete Pool-/Trainings-/Spezialisierungswerte bleiben Source of Truth.
- [ ] Profile ohne `backgroundTemplateId` normalisieren zu Custom/Legacy ohne Datenverlust.
- [ ] Unbekannte Template-ID fällt auf Custom/Legacy zurück.
- [ ] Template-Katalogänderungen mutieren gespeicherte Charaktere nicht rückwirkend.

## UX-Verständnis

Eine Person ohne Regelbuch muss direkt aus der Oberfläche beantworten können:

1. Welche vier Skills gehören zu meinem Hintergrund?
2. Welche zwei davon habe ich trainiert?
3. Warum hat `Medizin` bei mir einen Punkt?
4. Welches Attribut wird für `Medizin` standardmäßig verwendet?
5. Kann ich statt der Empfehlung ein anderes Training wählen?
6. Woher kommen die zehn Start-Fertigkeitspunkte?
7. Wie erstelle ich einen eigenen Hintergrund?

## Automatisierte Abnahme

- [ ] `npm run checks`
- [ ] `npm run test-gate`
- [ ] `npm run composition-gate`
- [ ] relevante Playwright Character-Editor Tests
- [ ] keine neuen Type-Escape-Hatches in touched files
