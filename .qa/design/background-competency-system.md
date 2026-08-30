# Background & Kompetenzsystem – UX/UI Design

## Ziel

Attribute, Fertigkeiten und Hintergrund werden im Character Editor als zusammenhängendes Kompetenzsystem erfahrbar. Die Regelquellen bleiben getrennt, ihre Beziehungen werden aber visuell erklärt.

## Informationsarchitektur

Unter `Parameter` wird `Attribute` durch `Kompetenzen` ersetzt.

```text
Parameter
├─ Kompetenzen
├─ Archetype
└─ Essenz
```

Der bisherige Top-Level-Tab `Hintergrund` entfällt nach erfolgreicher Migration seiner mechanischen Felder in `Parameter > Kompetenzen`.

Narrative Hintergrundgeschichte/AI-Composer kann weiterhin als eigener optionaler Abschnitt innerhalb von Kompetenzen oder als sekundärer Editorbereich bestehen; sie darf den mechanischen Kompetenzfluss nicht unterbrechen.

## Kompetenzen – Reihenfolge

1. Attribute
2. Hintergrund auswählen
3. Hintergrund-Fertigkeitspool
4. Zwei Trainings
5. Spezialisierung
6. Primärarchetyp-Punkt
7. Sieben freie Fertigkeitspunkte
8. Gesamtübersicht / Validierung

Die Reihenfolge ist UX-Führung. Vor Abschluss darf der User jederzeit zurückgehen und Entscheidungen ändern.

## Hintergrund-Auswahl

### Template-first

Der Einstieg zeigt Karten für verfügbare Hintergrund-Templates des aktiven Weltprofils.

Jede Karte zeigt mindestens:

- Name
- 1-Satz-Beschreibung
- vier Fertigkeiten
- ggf. kurze Spielstil-/Kompetenz-Zusammenfassung

Zusätzlich existiert immer eine sichtbare Karte `Eigenen Hintergrund erstellen`, sofern das Weltprofil freie Hintergründe nicht ausdrücklich deaktiviert.

### Beispiel

`Straßenarzt`

- Medizin
- Menschenkenntnis
- Überleben
- Aufmerksamkeit

Empfohlen: Medizin + Menschenkenntnis

## Auswahl innerhalb eines Templates

Nach Auswahl entfaltet sich das Template in einer klaren, verbundenen Struktur:

```text
Hintergrund
    ↓
4 Pool-Fertigkeiten
    ↓
2 Trainings
    ↓
1 Spezialisierung
```

Die vier Pool-Fertigkeiten sind beim Template fest. Zwei davon werden vom User gewählt und erhalten `Hintergrund +1`.

Empfohlene Trainings dürfen vorselektiert oder visuell empfohlen werden, müssen aber änderbar bleiben.

## Freier Hintergrund

Der freie Modus verwendet dieselbe visuelle Struktur, beginnt aber mit vier leeren Fertigkeitsknoten. Erst wenn vier unterschiedliche Skills gewählt wurden, wird die Trainingsstufe aktiviert.

Die Regeln bleiben identisch zum Template-Modus.

## Attributbeziehungen

Jeder Skill zeigt sein Standardattribut. Beziehungen werden nicht dauerhaft als globales Liniennetz gerendert, wenn dadurch visuelles Rauschen entsteht.

Empfohlenes Verhalten:

- Skill hover/focus/click hebt Standardattribut hervor.
- Aktive Verbindungslinie erscheint kontextuell.
- Unbeteiligte Knoten werden leicht gedimmt.
- Tooltip/Detailpanel erklärt: `Standardattribut – keine Voraussetzung`.

Ausdauer besitzt bewusst keinen Standard-Skill-Cluster und darf stattdessen seine Beziehungen zu abgeleiteten Werten zeigen.

## Fertigkeitsknoten

Ein Skill-Knoten zeigt kompakt:

- Name
- finalen Rang
- Standardattribut
- Quellenindikatoren
- Spezialisierung, falls vorhanden

Quellen:

- Hintergrund
- Archetyp
- Frei

Die Quelle muss zusätzlich zu Farbe mit Icon, Label oder Linienart unterscheidbar sein.

## Interaktionsmodell

### Desktop

- Hover: Preview einer Beziehung
- Click/Keyboard focus: persistente Auswahl
- Detailpanel: Erklärung, Quellen, Rank, Spezialisierungen
- `+` / `-` zur freien Punktevergabe erst bei Fokus oder eindeutiger aktiver Verteilung sichtbar

### Mobile

Kein verkleinerter Desktop-Graph.

- vertikale Branch-Rails
- einklappbare Attribute-Cluster
- Bottom Sheet / Drawer für Skilldetails
- mindestens 44px Touch Targets
- keine Funktion ausschließlich über Hover

## Liniensemantik

- Solide Akzentlinie: aktive Quelle/gewählte Beziehung
- Dezente/dünne Linie: Standardattribut-Beziehung
- Gestrichelte Linie: Vorschlag/verfügbar, nicht gewählt
- Lock/Progression-Line: nur für echte Freischaltungen

Pfeile werden nur genutzt, wenn Richtung oder Voraussetzung fachlich relevant ist.

## Validation Strip

Der Screen zeigt permanent eine kompakte Startvalidierung:

- Attribute vollständig
- Hintergrund gewählt
- 4/4 Pool-Fertigkeiten
- 2/2 Hintergrund-Trainings
- 1 Spezialisierung
- 1 Archetyp-Punkt
- 7/7 freie Punkte
- 10/10 Gesamtpunkte
- mindestens 6 trainierte Fertigkeiten
- Start-Cap 3 eingehalten

Fehler werden an der betroffenen Stelle zusätzlich lokal erklärt.

## Bestehendes Designsystem

Die Umsetzung bleibt im vorhandenen SagaDrive Character-Editor-Design:

- bestehende Dark-/Light-Themes
- bestehende shadcn/Radix-Primitives
- bestehende Cyan/Teal-Interaktionsfarben
- bestehende Card-/Border-/Radius-Systeme
- keine neue UI-Library nur für Graphen

Connector-Linien bevorzugt über leichtgewichtige SVG/CSS-Overlays. ReactFlow/D3 oder vergleichbare neue Graph-Libraries sind für v1 nicht erforderlich.

## Accessibility

- Source-/State-Semantik nie nur über Farbe
- sichtbarer Keyboard-Fokus
- `prefers-reduced-motion` respektieren
- Tooltips besitzen auch Focus/Click-Zugang
- lesbare Kontraste in Dark und Light
- Mobile ohne Hover vollständig bedienbar

## Datenmodell – Zielbild

Ein Background-Template benötigt mindestens:

```ts
type BackgroundTemplate = {
  id: string;
  name: string;
  description: string;
  skillPool: [SkillId, SkillId, SkillId, SkillId];
  recommendedTraining: [SkillId, SkillId];
  specializationSuggestions: Array<{
    skillId: SkillId;
    name: string;
  }>;
  milieuSuggestions: string[];
  contactSuggestions: string[];
  complicationSuggestions: string[];
  communicationSuggestions?: string[];
  worldProfileIds?: string[];
};
```

Das konkrete Character-Modell speichert weiterhin die Entscheidungen des Charakters, nicht nur die Template-ID. Dadurch bleiben bestehende Charaktere und später geänderte Templates stabil.

Zusätzlich kann `backgroundTemplateId?: string | null` gespeichert werden, um Herkunft/UX zu kennen; die mechanischen Felder bleiben kanonisch.

## Backward Compatibility

Bestehende Charaktere ohne `backgroundTemplateId` werden als `custom` behandelt. Ihre vorhandenen Felder dürfen bei Migration oder Laden nicht verändert werden.

## Non-Goals

- Hintergrund gibt keine Attributsboni.
- Hintergrund wird keine Klasse oder Progressionsschiene.
- Keine neue Fertigkeitsliste.
- Keine Änderung der 10 Start-Fertigkeitspunkte.
- Keine Änderung der Archetyp-/Essenz-Core-Mechanik in diesem Epic.
- Keine vollständige Content-Produktion für jedes zukünftige Weltprofil.

## UX-Abnahmetest

Eine Person ohne SagaDrive-Vorwissen soll ohne Regelbuch beantworten können:

1. Welche vier Skills gehören zu meinem Hintergrund?
2. Welche zwei davon habe ich trainiert?
3. Warum hat `Medizin` bei mir einen Punkt?
4. Welches Attribut wird für `Medizin` standardmäßig verwendet?
5. Kann ich statt der Empfehlung ein anderes Training wählen?
6. Woher kommen die insgesamt zehn Start-Fertigkeitspunkte?
7. Wie erstelle ich statt eines Templates einen eigenen Hintergrund?

Wenn eine dieser Fragen nicht direkt aus der Oberfläche beantwortbar ist, ist die UX noch nicht abnahmefähig.
