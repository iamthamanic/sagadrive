# SagaDrive Imagination-First Visualization Contract

## Status

This document is a **canonical product-experience contract** for how SagaDrive visualizes tabletop roleplaying without replacing player imagination.

It applies to:

- Scene rendering
- Program/Viewer output
- GM presentation tools
- Director output
- AI-assisted scene generation
- 2D/3D environment visualization
- Character/NPC presentation
- Items and reveals
- Maps and spatial aids
- LiveAct presentation
- any feature that converts fiction into visible or audible output

Related canonical sources:

- `docs/concepts/conductor-experience-contract.md`
- `src/THEME_GUIDE.md`
- `src/guidelines/Guidelines.md`
- `AGENTS.md`

This document exists because "more detailed", "more realistic" and "more cinematic" are **not automatically better** for a TTRPG.

SagaDrive must visualize enough to synchronize the shared fiction while deliberately leaving enough unresolved space for imagination.

---

## 1. Product Thesis

SagaDrive does not fully simulate the fictional world.

SagaDrive **materializes only the parts of the shared fiction that currently matter**.

Canonical principle:

```text
SHOW ENOUGH TO SYNCHRONIZE
LEAVE ENOUGH TO IMAGINE
```

Supporting principles:

```text
CONDUCT, DON'T OPERATE
EVOKE, DON'T EXHAUST
MATERIALIZE, DON'T AUTHOR
```

SagaDrive should help players think:

> "I can see enough to feel the place, but there is still more to discover and imagine."

It must not force the group to treat every rendered pixel as canonical world truth.

---

## 2. The Core Risk

In traditional tabletop play, the fictional world is incomplete by design.

Players continuously fill gaps with:

- personal imagery;
- interpretation;
- questions;
- assumptions;
- emotional projection;
- imagination.

A fully explicit visual simulation can unintentionally remove this activity.

Therefore:

- visual fidelity is not the objective;
- **fictional usefulness** is the objective;
- visual detail must be proportional to narrative relevance.

---

## 3. Visualization Authority Levels

Every visualized element must conceptually belong to one of these authority levels.

```ts
type VisualAuthority =
  | 'canonical'
  | 'suggestive'
  | 'atmospheric';
```

### 3.1 Canonical

The element is established fictional truth.

Examples:

- a named NPC is in the room;
- a sword lies on the altar;
- the bridge is broken;
- the north door is locked;
- the player received a specific item.

Rules:

- must correspond to authoritative world/session state when applicable;
- players may reason from it;
- if changed, shared state must update consistently;
- must not be invented silently by a decorative renderer.

### 3.2 Suggestive

The element supports interpretation but is not automatically canonical.

Examples:

- shelves in the background;
- generic tavern clutter;
- distant houses;
- decorative market stalls;
- implied furniture;
- unimportant passersby.

Rules:

- may reinforce genre, scale or mood;
- must not imply hidden gameplay affordances;
- should not be used as a rules dependency unless promoted to Canonical;
- if a player references it, the GM/system may accept, reject or canonize it.

### 3.3 Atmospheric

The element carries feeling rather than factual world structure.

Examples:

- fog;
- dust;
- light shafts;
- vague silhouettes;
- rain sound;
- distant crowd noise;
- drifting embers;
- ambient motion;
- abstract background shapes.

Rules:

- not queryable as world truth;
- no gameplay inference should depend on it;
- can be changed freely with Look/Scene mood.

---

## 4. Default Authority Distribution

For a normal exploration or roleplay Scene, target this approximate visible-content distribution:

| Authority | Target share of visible detail |
|---|---:|
| Canonical | 20-35% |
| Suggestive | 35-55% |
| Atmospheric | 20-40% |

This is not a pixel-perfect metric. It is a **composition target**.

Hard warning:

- if >60% of visible detail becomes Canonical in a normal narrative Scene, agents must justify why;
- tactical/combat/map-heavy contexts may intentionally exceed this;
- emotional/dialog scenes should normally stay below 40% Canonical visible detail.

---

## 5. Imagination Budget

Before generating or expanding a Scene, classify possible detail into four buckets.

### 5.1 Must Show

Show when needed to keep the group synchronized.

Examples:

- current location identity;
- present actors;
- central object;
- important exit/route;
- primary environmental danger;
- scene-defining condition.

Default target:

- **3-7 explicit canonical visual facts** in a standard scene opening.

### 5.2 May Suggest

Use as evocative support.

Examples:

- architecture;
- clutter;
- crowd density;
- generic decor;
- vegetation;
- material texture;
- non-essential tools/objects.

Default target:

- **5-15 suggestive cues**, preferably grouped visually rather than individually emphasized.

### 5.3 Atmosphere Only

Use to shape feeling.

Default target:

- **1-3 dominant atmospheric channels** at once, chosen from:
  - light;
  - weather;
  - sound;
  - particles;
  - haze;
  - camera motion;
  - color temperature.

Do not run all channels at high intensity simultaneously.

### 5.4 Leave Open

Deliberately do not define:

- unexplored side areas;
- exact contents of irrelevant containers;
- precise minor-object layout;
- hidden meaning;
- off-screen spaces;
- interior thoughts;
- non-established history;
- unknown creatures/items;
- exact details not required by current fiction.

At least **30% of potentially describable scene detail should remain intentionally unspecified** in normal narrative play.

---

## 6. Progressive Materialization

SagaDrive should reveal specificity as the fiction earns it.

Canonical progression:

```text
ATMOSPHERE
  -> ORIENTATION
  -> FOCUS
  -> INSPECTION
  -> REVEAL
  -> CANONICAL DETAIL
```

Example:

```text
enter tavern
-> dark room + fire + rain + old counter
-> player focuses counter
-> bottles/glass become clearer
-> investigation succeeds
-> blood trail becomes canonical
-> follow trail
-> next spatial detail materializes
```

### Hard rule

**Do not render a location at maximum detail on first reveal unless the fiction explicitly requires full spatial precision.**

---

## 7. Detail Escalation Levels

Use these levels for scene/presentation logic.

### L0 — Unknown

- no visual commitment;
- sound/silhouette/placeholder allowed.

### L1 — Evoked

- mood established;
- broad composition;
- 1-3 canonical anchors;
- most detail atmospheric/suggestive.

### L2 — Oriented

- key actors and navigational facts visible;
- 3-7 canonical facts;
- enough for shared understanding.

### L3 — Focused

- selected area/object gains detail;
- surrounding world remains less specific;
- 1 focal subject emphasized.

### L4 — Inspected

- interaction-relevant properties become canonical;
- usable for rules/actions.

### L5 — Resolved

- detailed presentation is justified because the scene/object is now central, discovered or mechanically important.

Agents must default new narrative scenes to **L1 or L2**, not L5.

---

## 8. Focus Budget

At any moment, presentation should normally have:

- **1 primary focal subject**;
- max **2 secondary focal subjects**;
- everything else visually subordinate.

Hard rule:

- do not give 4+ unrelated elements equal visual emphasis;
- if everything is sharp, bright and animated, the scene fails the imagination-first contract.

Use focus tools such as:

- contrast;
- scale;
- lighting;
- framing;
- depth of field;
- motion;
- sound priority;
- local clarity.

---

## 9. Canon Promotion

A suggestive visual becomes canonical only through an explicit fictional event.

Allowed promotion paths:

- GM confirms it;
- player action establishes it;
- generated adventure data already defines it;
- successful check/reveal establishes it;
- authoritative world state introduces it.

Example:

```text
suggestive shelf
-> player: "Is there a bottle I can grab?"
-> GM confirms yes
-> specific bottle becomes canonical item/object
```

A renderer must not silently promote background decoration to gameplay truth.

---

## 10. Visual Fact Limits for First Reveal

For a new Scene entering Program/Player view:

### Narrative / social scene

- canonical facts: **3-5**
- named active actors: **1-5**
- focal environmental object: **0-2**
- dominant atmosphere channels: **1-2**
- explicit spatial exits/routes: **0-3**

### Exploration scene

- canonical facts: **4-7**
- focal objects: **1-3**
- exits/routes: **1-4**
- atmosphere channels: **1-3**

### Tactical / combat scene

- canonical facts may exceed narrative limits;
- exact positions may be shown when rules need them;
- still avoid irrelevant environmental over-definition.

### Reveal moment

- one newly important fact should dominate;
- secondary visual changes should be limited to **max 2** supporting effects.

---

## 11. Character Specificity

Player-owned characters are intentionally more concrete than the world.

Default specificity hierarchy:

```text
player's own character        90-100%
current important NPC         70-100%
party members                 70-100%
current focus object          60-100%
current scene                 40-70%
background world              20-50%
unknown/unexplored content     0-30%
```

These percentages represent **degree of visual specificity**, not opacity.

Rationale:

- identity benefits from concrete embodiment;
- world imagination benefits from incompleteness.

LiveAct, face tracking, equipment and character visuals may therefore be highly specific without requiring the environment to become fully explicit.

---

## 12. Camera and Framing Rules

SagaDrive should frame moments, not document everything.

Default rules:

- use establishing views briefly;
- move toward the current focal subject;
- do not keep wide "show everything" compositions as the permanent default;
- unexplored or irrelevant regions may remain out of frame;
- a camera move should follow a shift in attention, not happen continuously.

For automatic/director logic:

- no more than **1 automatic reframing event per 4 seconds** during active dialogue unless a strong event occurs;
- avoid cuts for minor state updates;
- repeated camera motion must not compete with player speech.

---

## 13. Sound as Imagination Support

Sound is especially useful because it evokes without fully specifying visuals.

Default scene sound budget:

- **1 base ambience**
- **0-2 secondary environmental layers**
- **0-1 focal event sound**

Avoid more than **4 simultaneous perceptually distinct ambient/event layers** unless an authored scene explicitly requires it.

Sound should often carry information that does not need visual definition.

Example:

```text
distant chains
-> something may exist beyond the door
-> do not render the source yet
```

---

## 14. Reveal Timing

Reveals are allowed to be more dramatic than routine UI state changes.

Baseline:

| Reveal type | Duration |
|---|---:|
| Small information reveal | 250-450 ms |
| Important object/actor reveal | 400-700 ms |
| Major scene reveal | 600-900 ms |
| Routine repeated reveal | <= 450 ms |

Hard rule:

- reveal animation must not delay interaction beyond 900 ms;
- if text/dialogue is ongoing, reveal must not obscure the speaker/player reaction unless intentionally directed.

---

## 15. Human Authorship Rule

SagaDrive visualizes consequences of human-led fiction.

Default causal order:

```text
human intent
-> speech/action
-> rules/uncertainty if required
-> consequence
-> SagaDrive materializes relevant result
```

Reject this default pattern:

```text
AI invents complete dramatic sequence
-> users consume generated fiction
```

AI may assist with:

- materialization;
- atmosphere;
- visual interpretation;
- continuity;
- optional suggestions;
- asset generation.

AI must not silently become the authoritative author of the shared fiction.

---

## 16. Actual-Play / Viewer Principle

Program output should emphasize **the creation of the story**, not only the finished fictional image.

Viewer priority order:

1. human/character reaction;
2. consequential fictional event;
3. reveal/check/result;
4. environment context;
5. decorative visual detail.

For emotionally important moments, showing the reacting character/player/avatar may be more valuable than showing a larger environment.

Automatic Director must not maximize visual spectacle. It must maximize **moment relevance**.

---

## 17. Fog of Imagination

Unknown content should not default to black boxes or full renders.

Allowed treatments:

- blur;
- silhouette;
- partial framing;
- shadow;
- haze;
- occlusion;
- sound-only presence;
- low-detail placeholder geometry;
- abstract shape;
- off-screen implication.

Purpose:

- communicate that "something exists" without defining exactly what it is.

Hard rule:

- unknown content must not visually expose hidden canonical information.

---

## 18. UI and Metadata Requirements

When authoring tools expose visual elements, editors should support or preserve:

- VisualAuthority;
- RevealLevel / DetailLevel;
- Canonical ID linkage where applicable;
- audience/visibility;
- whether the element is interactive;
- whether the element is decorative only.

Suggested model:

```ts
type VisualizationMetadata = {
  authority: 'canonical' | 'suggestive' | 'atmospheric';
  detailLevel: 0 | 1 | 2 | 3 | 4 | 5;
  interactive: boolean;
  canonicalRef?: string;
  audience?: 'public' | 'gm_only' | 'character_specific';
};
```

Exact data shape may vary by domain. Do not create a duplicate world-state source of truth merely to satisfy this document.

---

## 19. Agent Workflow

For any feature that adds or changes visualization, the agent MUST state before coding:

1. what is canonical;
2. what is suggestive;
3. what is atmospheric;
4. what deliberately remains unspecified;
5. the starting detail level L0-L5;
6. what user/event can increase detail;
7. what hidden information must remain protected;
8. which `IV-*` gates below apply.

"Make it more immersive/cinematic" is not an acceptable implementation description.

---

## 20. Imagination-First Gates

### Hard Gates

- **IV-01 Authority classification:** meaningful visual elements have a clear canonical/suggestive/atmospheric role.
- **IV-02 No silent canon:** decorative/suggestive detail does not become gameplay truth without explicit promotion.
- **IV-03 Progressive detail:** new narrative Scenes default to L1/L2 unless full precision is mechanically required.
- **IV-04 Open space:** normal narrative Scenes intentionally leave >=30% of potentially describable detail unspecified.
- **IV-05 First-reveal limits:** scene openings stay within the visual-fact limits in Section 10 unless justified.
- **IV-06 Focus budget:** max 1 primary + 2 secondary focal subjects.
- **IV-07 Hidden info safety:** visualization never leaks gm_only/character_specific/undiscovered content.
- **IV-08 Human authorship:** AI visualization does not silently author consequential fiction.
- **IV-09 Interaction truth:** only canonical interactive elements may imply reliable gameplay affordances.
- **IV-10 Unknown treatment:** unknown spaces/entities are obscured/evoked rather than fully exposed.
- **IV-11 Character/world asymmetry:** player characters may be highly specific while background world remains less explicit.
- **IV-12 Reveal restraint:** major reveal motion <=900 ms by default and does not block control.

### Quality Gates

- **IV-13 Progressive materialization:** focus/inspection/reveal can increase visual specificity without re-rendering the whole world at max detail.
- **IV-14 Atmosphere budget:** normal scenes use 1-3 dominant atmosphere channels.
- **IV-15 Viewer relevance:** Program output prioritizes human reaction and consequential events over decorative scenery.
- **IV-16 Sound leverage:** audio can imply off-screen/unknown content instead of forcing extra visuals.
- **IV-17 Camera restraint:** automatic framing responds to meaningful attention changes rather than continuously moving.
- **IV-18 Canonical linkage:** persistent canonical visual elements link to authoritative domain state where applicable.

A visualization feature should not be accepted with failed Hard Gates unless a ticket explicitly changes this contract.

---

## 21. Example: New Tavern Scene

### Reject

Immediate first render contains:

- exact full floorplan;
- 22 individually visible props;
- 8 NPCs;
- readable labels;
- every door;
- exact bottle placement;
- interactive-looking shelves;
- animated weather;
- particles;
- three moving cameras.

Reason: the system has already resolved most of the fiction before the group interacts with it.

### Accept

L1/L2 first reveal:

Canonical:

- old tavern;
- lit fireplace;
- damaged counter;
- one known NPC;
- one visible exit.

Suggestive:

- shelves;
- rough furniture;
- distant clutter.

Atmospheric:

- rain;
- low firelight;
- wood creaks.

Open:

- back room contents;
- exact shelf inventory;
- source of a faint metallic sound;
- upper floor.

The scene becomes more concrete through attention and play.

---

## 22. Example: Unknown Creature

### Reject

Player hears something behind a door and SagaDrive renders the exact monster model.

### Accept

```text
sound
-> shadow under door
-> vague silhouette
-> player investigates
-> partial form
-> reveal/check/door opens
-> canonical creature appears
```

---

## 23. Example: Important Reveal

Before:

```text
sealed letter
authority = canonical
meaning = unknown
detailLevel = 3
```

After successful reveal:

```text
letter opens
specific crest/text becomes canonical
detailLevel = 5
audience changes
program focuses the reveal
```

Only the newly meaningful content receives maximal specificity.

---

## 24. Non-Goals

This contract does not require:

- low-fidelity graphics;
- removing 3D;
- removing generated images/video;
- hiding mechanically necessary tactical information;
- making every environment blurry;
- restricting character customization;
- preventing cinematic presentation.

The goal is not "less visual".

The goal is:

> **Visualize selectively so imagination remains an active part of play.**
