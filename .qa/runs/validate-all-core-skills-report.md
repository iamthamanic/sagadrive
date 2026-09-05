# SagaDrive All Core Skills Report (#28)

Deterministische Prüfung aller 18 universellen Core-Fertigkeiten (§5.1–§5.8): Zuständigkeiten, Spezialisierung +2, Fachhandlungen, alternative Attribute, Caps/Training und Pflichtabgrenzungen. Kein RNG.

- Skills: 18/18
- Action-Kataloge: 18/18 (gewöhnlich / trainiert / Fachhandlung)
- Abgrenzungsgruppen: 8/8
- Coverage-Muster: 20
- Findings: 0

## Findings
- Alle 18 Skills mit gewöhnlich/trainiert/Fachhandlung belegt; Pflichtabgrenzungen eindeutig; Spec +2 / Caps / Training fail-closed; kein 19. Core-Skill erforderlich; Domain-Katalog synced.

## Katalog (§5.1)

| # | Key | Label | Standardattribut | Ticket-Alias |
|---:|---|---|---|---|
| 1 | athletics | Athletik | Stärke | — |
| 2 | acrobatics | Akrobatik | Geschicklichkeit | — |
| 3 | sleight | Fingerfertigkeit | Geschicklichkeit | — |
| 4 | stealth | Heimlichkeit | Geschicklichkeit | — |
| 5 | melee | Nahkampf | Stärke | — |
| 6 | ranged | Fernkampf | Geschicklichkeit | — |
| 7 | awareness | Aufmerksamkeit | Wahrnehmung | — |
| 8 | insight | Menschenkenntnis | Wahrnehmung | — |
| 9 | survival | Überleben | Wahrnehmung | — |
| 10 | investigation | Ermitteln | Verstand | — |
| 11 | knowledge | Wissen | Verstand | — |
| 12 | technology | Technik | Verstand | — |
| 13 | medicine | Medizin | Verstand | — |
| 14 | driving | Fortbewegungsmittel | Geschicklichkeit | Steuern |
| 15 | persuasion | Überzeugen | Charisma | — |
| 16 | deception | Täuschen | Charisma | — |
| 17 | intimidation | Einschüchtern | Charisma | — |
| 18 | performance | Auftreten | Charisma | — |

Hinweis: Issue #28 nennt „Steuern“; Core §5.1 und Domain verwenden **Fortbewegungsmittel** (key `driving`). Keine Core-Doc-Änderung in diesem Issue.

## Pro Fertigkeit

| Fertigkeit | Gewöhnlich | Trainiert | Fachhandlung | Abgrenzung |
|---|---|---|---|---|
| Athletik | kurzer Sprint über freies Gelände | schwierige Felswand unter Zeitdruck klettern | Überhang mit Spezialisierung Klettern [Klettern] | Kraft/Klettern → Athletik; Balance → Akrobatik; reines Aushalten → Ausdauer |
| Akrobatik | über niedrige Absperrung rollen | Balance auf schmalem Balken | Parkour-Sequenz mit Spezialisierung Parkour [Parkour] | ersetzt weder Athletik (Kraft) noch Nahkampf (Manöver) |
| Fingerfertigkeit | Münze unauffällig tauschen | mechanisches Schloss knacken | komplexes Feinmechanik-Schloss [Schlösser] | Analyse/Reparatur → Technik |
| Heimlichkeit | in Menschenmenge untertauchen | an Wachen vorbeischleichen | Infiltration mit Spezialisierung [Infiltration] | gegen Aufmerksamkeitswiderstand |
| Nahkampf | einfacher Schlag mit improvisierter Waffe | kontrollierter Klingenangriff | Greif-Manöver einleiten [Greifen] | Manöver einleiten → Nahkampf, nicht Athletik |
| Fernkampf | Wurfmesser auf nahe Scheibe | gezielter Bogenschuss unter Deckung | Fernschuss mit Spezialisierung Bögen [Bögen] | Distanzwaffen, nicht Nahkampf |
| Aufmerksamkeit | Geräusch hinter der Tür bemerken | Hinterhalt in Bewegung erkennen | gezielte Überwachung mit Spec [Überwachung] | unmittelbar wahrnehmen; systematisch → Ermitteln |
| Menschenkenntnis | offensichtliche Anspannung lesen | Motivation in Verhandlung einschätzen | Lügen erkennen gegen Täuschen [Lügen erkennen] | Widerstand gegen Täuschen; keine Gedankenleserei |
| Überleben | offensichtliche Wasserquelle finden | sichere Route bei schlechtem Wetter | Wildnis-Navigation mit Spec [Navigation] | praktische Orientierung; Tatort-Rekonstruktion → Ermitteln |
| Ermitteln | offensichtliche Spur am Tatort sichern | Archive systematisch durchsuchen | Forensik-Rekonstruktion mit Spec [Forensik] | aktive Recherche; Erinnerung → Wissen |
| Wissen | bekanntes Schulwissen abrufen | historischen Zusammenhang einordnen | Rechtsfrage mit Spec Geschichte/Recht [Geschichte] | Erinnerung/Einordnung; Recherche → Ermitteln |
| Technik | einfaches Gerät einschalten | defekten Schaltkreis analysieren | Sicherheitssystem umgehen mit Spec [Sicherheitssysteme] | Systemanalyse; manuelle Präzision klein → Fingerfertigkeit |
| Medizin | Verband bei leichter Schnittwunde | Stabilisierung nach Schock | Notfallmedizin Fachhandlung [Notfallmedizin] | biologisch; Maschinenreparatur → Technik |
| Fortbewegungsmittel | Fahrzeug auf nasser Straße halten | Verfolgungsfahrt unter Druck | Bodenfahrzeug-Fachmanöver [Bodenfahrzeuge] | Ticket-Alias Steuern = dieselbe Fertigkeit; Navigation ≠ Steuern |
| Überzeugen | ehrliche Bitte um Hilfe | Verhandlung über Preis | Diplomatie mit Spec Verhandeln [Verhandeln] | ehrlicher Einfluss; Darbietung → Auftreten |
| Täuschen | kleine Ausrede | glaubhafte Lüge unter Nachfrage | falsche Identität mit Spec [Falsche Identität] | gegen Menschenkenntnis; physische Fälschung braucht Praxis-Skill |
| Einschüchtern | drohende Haltung zeigen | Verhördruck aufbauen | Verhör mit Spec [Verhör] | außerhalb Kampf: Stärke möglich (§5.8.17) |
| Auftreten | kurze Ansprache vor Freunden | öffentliche Rede halten | Konzert mit Spec Musik [Musik] | Darbietung; Argument/Verhandlung → Überzeugen |

## Pflichtabgrenzungen

- **athletik-akrobatik-ausdauer:** Felswand hochklettern → Athletik (nicht Akrobatik)
- **athletik-akrobatik-ausdauer:** Balance auf Seil → Akrobatik (nicht Athletik)
- **athletik-akrobatik-ausdauer:** langes Aushalten von Hitze ohne sportliche Technik → Attribut Ausdauer (kein Skill)
- **aufmerksamkeit-ermitteln:** Bewegung am Rand der Szene bemerken → Aufmerksamkeit (nicht Ermitteln)
- **aufmerksamkeit-ermitteln:** Tatort systematisch rekonstruieren → Ermitteln (nicht Aufmerksamkeit)
- **menschenkenntnis-taeuschen:** Absicht hinter höflicher Maske einschätzen → Menschenkenntnis (nicht Täuschen)
- **menschenkenntnis-taeuschen:** bewusst falsche Geschichte erzählen → Täuschen (nicht Menschenkenntnis)
- **fingerfertigkeit-technik:** mechanisches Schloss mit Dietrich → Fingerfertigkeit (nicht Technik)
- **fingerfertigkeit-technik:** elektronisches Türpanel analysieren und umverdrahten → Technik (nicht Fingerfertigkeit)
- **ueberleben-ermitteln:** Wildspur zur Wasserstelle folgen → Überleben (nicht Ermitteln)
- **ueberleben-ermitteln:** Akte in Archiv mit Spurenabgleich auswerten → Ermitteln (nicht Überleben)
- **nahkampf-athletik-manoever:** Gegner greifen / zu Fall bringen einleiten → Nahkampf (nicht Athletik)
- **nahkampf-athletik-manoever:** schwere Tür aufstemmen außerhalb Kampf → Athletik (nicht Nahkampf)
- **nahkampf-athletik-manoever:** Manöverwiderstand berechnen → Manöverwiderstand (Athletik|Akrobatik), nicht Nahkampf
- **auftreten-ueberzeugen:** Publikum mit Lied fesseln → Auftreten (nicht Überzeugen)
- **auftreten-ueberzeugen:** ehrliche Verhandlung um Vertrag → Überzeugen (nicht Auftreten)
- **wissen-ermitteln:** erlerntes Rechtswissen erinnern und einordnen → Wissen (nicht Ermitteln)
- **wissen-ermitteln:** unbekannte Quelle aktiv recherchieren → Ermitteln (nicht Wissen)

## Caps, Spec-Leiter, Alt-Attribute, §3.6

- **18 Core-Skills:** Athletik, Akrobatik, Fingerfertigkeit, Heimlichkeit, Nahkampf, Fernkampf, Aufmerksamkeit, Menschenkenntnis, Überleben, Ermitteln, Wissen, Technik, Medizin, Fortbewegungsmittel, Überzeugen, Täuschen, Einschüchtern, Auftreten
- **Steuern-Alias:** Steuern → Fortbewegungsmittel (key driving); Core §5.1 unverändert
- **sagaDriveSkillDefinitions:** 18/18 synced with Core §5.1
- **Spec-Leiter & Caps:** 1@1 / 2@3 / 3@5; Caps 3/4/4/5/5; Spec/Fach ohne Training abgelehnt
- **mechanisches Schloss knacken:** korrekt Fingerfertigkeit; Technik+Geschicklichkeit ersetzt Nachbar nicht dauerhaft
- **§3.6 Bypass-Schutz:** existierende Fertigkeit → kein reiner Attributscheck; sonst erlaubt
- **Normale Bewegung / Routinefahrt:** automatisch — kein Check (Athletik §5.8.1 / Fortbewegungsmittel §5.8.14)

## Universelle Abdeckung (kein 19. Skill)

| Handlungsmuster | Zuordnung |
|---|---|
| Last heben | → Athletik |
| kontrolliert landen | → Akrobatik |
| Taschendiebstahl | → Fingerfertigkeit |
| Schleichen | → Heimlichkeit |
| Nahkampfangriff | → Nahkampf |
| Distanzschuss | → Fernkampf |
| Hinterhalt bemerken | → Aufmerksamkeit |
| Stimmung lesen | → Menschenkenntnis |
| Lagerplatz wählen | → Überleben |
| Recherche | → Ermitteln |
| Fachwissen abrufen | → Wissen |
| Maschine reparieren | → Technik |
| Wunde behandeln | → Medizin |
| Fahrzeug steuern | → Fortbewegungsmittel |
| überreden | → Überzeugen |
| belügen | → Täuschen |
| einschüchtern | → Einschüchtern |
| auftreten / performen | → Auftreten |
| Hitze aushalten | → Ausdauer (kein 19. Skill Belastbarkeit (§5.1)) |
| Sprache sprechen | → nicht-Skill (Sprachen sind keine Fertigkeiten (§5.7)) |
