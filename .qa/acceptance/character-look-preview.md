# Feature: Integrate Look preview and selection into Character Creator

<!-- seeded by ecc-runner from issue #347 — refined by @implement -->

## Intent
Integriere den aufgelösten Look und eine einfache Look-Auswahl in den bestehenden Character Editor. Der Nutzer soll den aktuellen Charakter unter dem Look sehen und bei erlaubten Rechten zwischen Welt-/Saga-Look und persönlichem Character-Look wählen können, ohne einen zweiten Look-Editor zu bekommen.

## Happy Path
- [x] Character Editor zeigt den resolved Look inkl. Herkunft (`Saga`, `Session`, `Persönlich`, `System`) und wendet ihn live auf die vorhandene Avatar-Vorschau an. (`CharacterLookSelector` + `studioRuntimeRef` → `applyLookProfile`)
- [x] Wenn Player Override nicht erlaubt ist, ist Auswahl read-only; wenn erlaubt, gibt es „Welt-Look verwenden“ plus zulässige persönliche Looks.
- [x] „Neutral vergleichen“ nutzt PBR Reference (`restorePbrNeutralLook`) ohne den gespeicherten Look zu verändern.
- [x] Kein vollständiger Look-Inspector existiert im Character Editor; Authoring führt zum Library-Look-Editor (`pathForLookEdit`).
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Edge Cases
- [x] Charakter ohne Saga → System-Default Resolution.
- [x] Archivierter persönlicher Look → Notice + Fallback auf geerbten Look.
- [x] Gespeicherter Override, aber Override inzwischen verboten → read-only + Notice.
- [x] Look nicht ladbar → Notice, Preview ohne Look-Anwendung.
- [x] PBR Neutral compare bei noch ladendem Modell → Button disabled bis `runtimeReady`.

## Regression
- [x] AvatarSurfaceViewer bleibt für alle Surfaces nutzbar; `studioRuntimeRef` optional.
- [x] Appearance-Save erhält `personal_look_profile_id` (kein Wipe beim Charakter speichern).

## Assumptions
- Override-Permission kommt aus Project (`allowPlayerCharacterLookOverride`), nicht client-seitig erfunden.
- Persistenz des Overrides liegt in `appearance.personal_look_profile_id` (kein neues DB-Column).

## Screenshots
| Step | Filename |
|------|----------|
| 1 | `01-happy-path.png` |

## Implementation Notes
- `src/app/look/CharacterLookSelector.tsx` — summary, select, neutral compare, library link
- `src/app/look/look-origin-labels.ts` — DE Herkunftslabels
- `AvatarSurfaceViewer.studioRuntimeRef` — external LookRuntime bridge
- `CharacterEditor` appearance tab mounts selector; save/hydrate keep personal look id
- Contract: `scripts/character-look-preview-check.mjs`

## Composition Gate
- Verdict: CLEAR
- Proof: `.qa/runs/composition-gate-character-look-preview.md`
- Event: personal Look override select/apply on Character Editor avatar preview
