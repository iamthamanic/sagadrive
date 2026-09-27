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


---

## 25. Decision Rationale and Provenance

This section preserves the reasoning behind the Imagination-First contract so future agents do not mistake its thresholds for arbitrary style preferences or scientific constants.

### 25.1 Evidence labels

- **RESEARCH-INFORMED** — grounded in work on collaborative/co-constitutive imagination, TTRPG play or media/Actual Play, then translated into a SagaDrive design rule.
- **PRODUCT HEURISTIC** — a deliberate SagaDrive starting point to be tested with players.
- **DOMAIN PRINCIPLE** — follows from the product decision that humans remain authors and SagaDrive materializes shared fiction rather than fully simulating it.

### 25.2 Principle rationale

| Rule | Why it exists | Evidence type | Failure mode it prevents |
|---|---|---|---|
| Show enough to synchronize, leave enough to imagine | TTRPG play depends on people jointly elaborating an incomplete shared world. SagaDrive should stabilize shared reference without resolving every personal image. | RESEARCH-INFORMED / DOMAIN PRINCIPLE | turning shared imagination into passive visual consumption |
| canonical / suggestive / atmospheric | A generated image contains more visible detail than the fiction has actually established. Authority levels prevent pixels from silently becoming world truth. | DOMAIN PRINCIPLE | "it is on screen, therefore it exists" |
| Progressive Materialization | In tabletop play, locations/objects become more specific through questions, attention and action. Visual detail should follow the same causal rhythm. | RESEARCH-INFORMED / PRODUCT HEURISTIC | maximum-detail scene dump before play begins |
| Human Authorship Rule | The core loop is human intent -> uncertainty/rules -> consequence. AI should amplify/materialize this, not replace it with pre-authored spectacle. | DOMAIN PRINCIPLE | AI becoming the actual storyteller |
| Viewer prioritizes reaction/consequence | Actual Play derives value from watching play, improvisation, reactions and collaborative storytelling, not only fictional imagery. | RESEARCH-INFORMED / DOMAIN PRINCIPLE | Program output becoming a detached animation |
| Character/world specificity asymmetry | Concrete self/party embodiment supports identity while leaving the wider world less resolved preserves imaginative participation. | PRODUCT HEURISTIC | every part of the world becoming equally explicit |
| Fog of Imagination | Unknown information should remain evocative without leaking exact hidden state. | DOMAIN PRINCIPLE | mystery collapse and hidden-info leakage |

### 25.3 Numeric baseline rationale

The following percentages/counts are **design heuristics**, not empirical laws.

| Baseline | Why this value was selected | Evidence type | Change rule |
|---|---|---|---|
| Canonical 20-35%, Suggestive 35-55%, Atmospheric 20-40% | Forces normal narrative scenes to contain more evocative/non-authoritative material than hard world facts while still maintaining shared orientation. | PRODUCT HEURISTIC | validate through playtests; do not present as research result |
| >60% Canonical requires justification | A forcing function against defaulting narrative scenes to simulation-level explicitness. Tactical scenes are exempt when precision is mechanically necessary. | PRODUCT HEURISTIC | explicit context exception allowed |
| >=30% potentially describable detail left unspecified | Creates a concrete minimum "imagination budget" so agents cannot satisfy the principle with token ambiguity while rendering everything else. | PRODUCT HEURISTIC | tune through player research |
| 3-7 canonical visual facts at standard scene opening | Enough anchors to align a group without providing a complete inventory of the environment. | PRODUCT HEURISTIC informed by progressive shared-world elaboration | use scene-type limits in Section 10 |
| 5-15 suggestive cues | Gives texture/genre without elevating every visible prop to gameplay significance. The cues should be grouped rather than counted as isolated UI elements. | PRODUCT HEURISTIC | composition judgement still required |
| 1-3 dominant atmosphere channels | Prevents light/weather/sound/particles/camera/color from all competing simultaneously. | PRODUCT HEURISTIC | authored set pieces may explicitly exceed |
| L1/L2 default for new narrative scenes | New places should first be evoked/oriented and become more specific through attention, questions and actions. | RESEARCH-INFORMED / PRODUCT HEURISTIC | L4/L5 only when mechanics immediately require precision |
| 1 primary + max 2 secondary focal subjects | Establishes a staging hierarchy and prevents equal emphasis across the whole rendered world. | PRODUCT HEURISTIC | change only with explicit composition reason |
| Character specificity 90-100%, scene 40-70%, background 20-50%, unknown 0-30% | Encodes the intentional asymmetry between identity-bearing characters and imagination-bearing world space. | PRODUCT HEURISTIC | not opacity; validate per art direction |
| <=1 automatic reframing event per 4 s in dialogue | Protects conversational continuity and reactions from an overactive automatic Director. | PRODUCT HEURISTIC | strong events can override |
| sound: 1 base + 0-2 secondary + 0-1 focal, normally <=4 perceptual layers | Preserves an intelligible sound hierarchy while allowing audio to imply off-screen detail. | PRODUCT HEURISTIC | authored scenes may exceed with mix validation |
| reveal 250-900 ms depending on importance | Creates visual weight without blocking conversational control for long periods. | PRODUCT HEURISTIC | repeated reveals should shorten |
| max 2 supporting effects around a reveal | Keeps the newly revealed fact as the moment's dominant information. | PRODUCT HEURISTIC | authored exception requires focus rationale |
| narrative first reveal 3-5 canonical facts / exploration 4-7 | Social scenes require less spatial precision; exploration needs slightly more orientation. | PRODUCT HEURISTIC | tactical scenes follow mechanics instead |

### 25.4 Research references

These sources support the **direction** of the contract. They do not establish the SagaDrive-specific percentages above.

- Bogotá, Kines & Ekdahl (2025), **You walk into a tavern: co-constitutive imagination in Dungeons and Dragons**. The paper describes D&D's imagined world as dynamically sustained and elaborated through reciprocal participation, with shared objects becoming increasingly detailed through inquiry and interaction. https://link.springer.com/article/10.1007/s11097-025-10106-2
- Nicholas J. Mizer (2019), **Tabletop Role-Playing Games and the Experience of Imagined Worlds**. Ethnographic work on how free-form imagination and constrained rules combine in actual play. https://link.springer.com/book/10.1007/978-3-030-29127-3
- Alex Chalk (2023), **Mapping an online production network: The field of 'actual play' media**. Describes Actual Play as recorded unscripted tabletop roleplaying combining narrative, modeled play and player charisma/chemistry. https://journals.sagepub.com/doi/abs/10.1177/13548565221103987
- Jan Švelch (2022), **Mediatization of tabletop role-playing: The intertwined cases of Critical Role and D&D Beyond**. Examines Critical Role and the coexistence of mediated/digital forms with embodied tabletop practices. https://journals.sagepub.com/doi/10.1177/13548565221111680

### 25.5 What is hypothesis vs. product law

The following are **current product hypotheses** and should eventually be validated with SagaDrive playtests:

- 30% unspecified detail is enough to preserve imaginative participation;
- the authority distribution ranges produce the desired balance;
- L1/L2 openings feel evocative rather than under-rendered;
- the specificity hierarchy preserves character identity without over-defining the world;
- four-second automatic camera restraint is appropriate during dialogue.

The following are **product laws unless explicitly changed at product level**:

- visual output must not silently invent canonical facts;
- hidden/private facts must not leak through visuals;
- humans remain the authoritative source of consequential fiction;
- generated visual detail must distinguish fiction truth from evocation;
- more visual detail is not automatically higher quality.

### 25.6 Historical intent

This contract was introduced in September 2026 because SagaDrive increasingly supports characters, scenes, items, LiveAct, Program output and Director-style presentation. Without a counter-rule, technical progress naturally pushes the product toward "render everything".

The intended direction is different:

> SagaDrive should make shared imagination more tangible without replacing the act of imagining together.

When a future agent changes a threshold, it must record:

1. previous value;
2. new value;
3. playtest/research/technical reason;
4. affected IV gates;
5. whether the change is a product hypothesis update or a product-law change.
