# SagaDrive Avatar Assets

## Zweck

Der Avatar-Asset-Katalog trennt die SagaDrive-Rendering-Runtime von den tatsächlich ausgelieferten 3D-Modellen. Ein Asset wird nur als Remote-Fallback in `src/modules/characters/avatar/manifests.ts` aufgenommen, wenn Herkunft, konkreter Dateipfad und Lizenz nachvollziehbar geprüft werden können.

`VITE_AVATAR_ASSET_BASE_URL` kann dieselben stabilen Manifest-IDs auf selbst gehostete Dateien umleiten. Fehlt ein Self-Host-Asset, verwendet SagaDrive den unten dokumentierten, commit-gepinnten Remote-Fallback.

## Aktuell freigegebene Quelle

- Repository: `MJMoonbow/VRMavatars`
- Source-Commit: `6af59479c61ab13b6caa96a9b915498489f2b9cd`
- Lizenz: `CC0-1.0`
- Repository-Beschreibung: Sammlung frei nutzbarer VRM-Modelle unter CC0
- Quellhinweis: Das Repository nennt Stable Diffusion und TripoSR für die Erstellung sowie Mixamo für das Rigging.
- Erlaubte Nutzung im SagaDrive-Katalog: kommerziell und nicht-kommerziell; die CC0-Erklärung erlaubt Nutzung, Bearbeitung und Weiterverteilung für beliebige Zwecke. Rechte Dritter, Marken-, Patent-, Persönlichkeits- und ähnliche Rechte bleiben von CC0 unberührt und müssen bei einem konkreten Einsatz weiterhin berücksichtigt werden.

Die Remote-URLs zeigen absichtlich auf den geprüften Commit und nicht auf `main`. Ein späterer Upstream-Commit ändert dadurch kein bereits freigegebenes SagaDrive-Asset unbemerkt.

## Katalog

| SagaDrive-Spezies | Manifest | Self-Host-Pfad | Commit-gepinnter Quellpfad | Einstufung | Begründung |
| --- | --- | --- | --- | --- | --- |
| Neutral | `humanoid-neutral` | `neutral.vrm` | `skinnie1_5.vrm` | Neutraler Fallback | Allgemeiner humanoider Sicherheitsfallback |
| Mensch | `fantasy-human` | `human.vrm` | `skinnie1_5.vrm` | Neutraler Fallback | Quellkatalog weist das Modell nicht ausdrücklich als Mensch aus |
| Elf | `fantasy-elf` | `elf.vrm` | `skinnie3_1.vrm` | Neutraler Fallback | Noch kein geprüftes Elf-Spezialasset im freigegebenen Katalog |
| Zwerg | `fantasy-dwarf` | `dwarf.vrm` | `skinnie4.vrm` | Neutraler Fallback | Noch kein geprüftes Zwerg-Spezialasset im freigegebenen Katalog |
| Halbling | `fantasy-halfling` | `halfling.vrm` | `skinnie4.vrm` | Neutraler Fallback | Noch kein geprüftes Halbling-Spezialasset im freigegebenen Katalog |
| Ork | `fantasy-orc` | `orc.vrm` | `fantasy´/orcs/Orc 1.vrm` | Spezies-spezifisch | Upstream führt die Datei ausdrücklich unter `orcs` |
| Cyborg | `scifi-cyborg` | `cyborg.vrm` | `skinnie3_1.vrm` | Neutraler Fallback | Kein geprüftes Cyborg-Spezialasset mit direkter `.vrm`/`.glb`-Quelle |
| Alien | `scifi-alien` | `alien.vrm` | `skinnie1_5.vrm` | Neutraler Fallback | Kein geprüftes Alien-Spezialasset mit direkter `.vrm`/`.glb`-Quelle |

Die neutralen Fallbacks sind bewusst als solche gekennzeichnet. Optische Preset-Werte wie Körperproportionen und Farben dürfen nicht als Behauptung verstanden werden, dass das zugrunde liegende Upstream-Modell für diese Spezies erstellt wurde.

## Aufnahme neuer Assets

Ein neues Asset darf erst in den Remote-Katalog, wenn alle folgenden Punkte erfüllt sind:

1. Die Quelle ist dauerhaft und reviewbar (bevorzugt öffentliches Repository oder Release-Artefakt).
2. Der konkrete Asset-Stand ist unveränderlich referenziert, z. B. über Commit-SHA oder Release-Version.
3. Die Lizenz des Assets selbst ist eindeutig; eine Code-Lizenz des Quellprojekts reicht nicht als Ersatz.
4. Die Runtime kann die URL über `normalizeAvatarModelUrl` akzeptieren (`https` oder lokaler Pfad und Dateiendung `.vrm`/`.glb`).
5. Die Provenienz wird im Manifest und in diesem Dokument ergänzt.
6. Unklare Urheber-, Lizenz- oder Nutzungsrechte führen dazu, dass das Asset nicht aufgenommen wird.

Beliebige Modell-URLs von Nutzern sind nicht Teil dieses Katalogs. Ein späterer User-Avatar-Import benötigt eine eigene Trust-/Upload-Grenze und darf diese kuratierte Asset-Liste nicht umgehen.
