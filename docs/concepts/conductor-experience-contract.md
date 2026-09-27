# SagaDrive Conductor Experience Contract

## Status

This document is a **canonical product-experience contract** for SagaDrive.

It defines how SagaDrive must **behave and feel during direct manipulation, live play, GM control, Director control and other high-frequency interactive surfaces**. It exists because visual polish alone cannot encode the intended product experience for coding agents.

Related canonical sources:

- `AGENTS.md` — repository and architecture rules
- `src/THEME_GUIDE.md` — visual design system
- `src/guidelines/Guidelines.md` — compact UI generation rules
- `docs/concepts/imagination-first-visualization-contract.md` — imagination-preserving visualization contract

When this document conflicts with a local implementation shortcut, **this document wins for product experience** unless a ticket explicitly changes the contract.

---

## 1. Product Thesis

SagaDrive is not a dashboard for administering a tabletop RPG.

SagaDrive is a **digital instrument for conducting a living shared world**.

The target feeling is closer to a conductor, performer or "bender" controlling a responsive medium than to a user navigating CRUD screens.

Canonical interaction thesis:

```text
SEE
  -> SELECT
  -> CONDUCT
  -> WORLD REACTS
```

The user should experience **agency, causality, flow and mastery**.

Do not use words such as "premium", "cinematic", "magical", "smooth" or "immersive" as acceptance criteria by themselves. Agents must translate them into observable behavior and measurable thresholds from this contract.

---

## 2. Operating Modes

Every SagaDrive surface must be classified before implementation.

### 2.1 Setup Mode

Setup Mode includes preparation and configuration work such as:

- character creation and editing
- item authoring
- world setup
- rules configuration
- adventure preparation
- look configuration
- library management

Setup Mode may use forms, tabs, dialogs, tables and explicit save flows where appropriate.

### 2.2 Performance Mode

Performance Mode includes any surface where a person is actively playing, directing, presenting or manipulating the current shared fiction:

- Player Live
- Gamemaster Live
- Viewer/Display
- Director Control Room
- live Scene control
- combat control
- live reveals
- live inventory transfer/equip/use
- LiveAct during an active session
- any action that changes current shared world or presentation state

Performance Mode is governed by the strictest rules in this contract.

**Route names do not determine the mode. User intent does.**

---

## 3. Non-Negotiable Performance Principles

### 3.1 Stage Permanence

The current world/program/live stage is the spatial anchor of Performance Mode.

Routine actions must **not navigate away from the stage**.

Desktop GM/Director:

- the Live Stage remains mounted during routine selection and command flows;
- changing NPC, item, scene, player, cue or source changes context around the stage;
- tabs/drawers may change supporting tools but must not replace the stage for routine live work.

Player:

- Program/Live Stage remains continuously accessible;
- private controls may use rails, sheets or tabs without destroying Program state.

Allowed exceptions:

- explicit full-screen focus/presentation mode;
- blocking security/authentication state;
- unrecoverable fatal error.

### 3.2 Context Instead of Navigation

Selecting an entity should normally update the current context, not open a new route.

Examples:

```text
NPC selected
  -> action rail becomes NPC actions

Scene selected
  -> action rail becomes Scene actions

Player selected
  -> action rail becomes Player actions
```

A route change is appropriate for a durable identity or long-form editing task, not for a routine live command.

### 3.3 Direct Manipulation

For the highest-frequency live commands:

- target visible -> command requires **at most 2 deliberate interactions**;
- neutral live state -> common command requires **at most 3 deliberate interactions**;
- a modal must not be introduced when the action needs only one simple choice/value and can safely fit the contextual surface;
- top-level live actions must never require a separate settings screen.

"Interaction" means a deliberate pointer/touch/key action that advances the task. Hover does not count.

### 3.4 Consequence Is the Feedback

A successful action must be confirmed primarily by the changed object/world state.

Bad:

```text
Click Reveal
-> toast "Successfully saved"
-> screen otherwise unchanged
```

Good:

```text
SECRET
-> revealed
-> audience badges change
-> content appears in the correct projection
```

Toasts may supplement feedback. They must not be the only visible proof for important live-state changes.

### 3.5 Causality Must Be Legible

Transfer-like actions should preserve source -> destination causality.

Examples:

- NPC -> Scene
- Secret -> Player
- Item -> Character
- Scene -> Preview -> Program
- Source -> Preview -> Program
- Actor -> Encounter

Use restrained spatial motion, connector motion, object continuity or state transition when it clarifies causality.

Do not add decorative motion that communicates no state change.

---

## 4. Quantitative Interaction Baselines

These values are **default product baselines**. A ticket may override one only with an explicit reason.

| Metric | Baseline | Hard ceiling / rule |
|---|---:|---|
| Local acknowledgement of click/key/touch | same frame where possible | p95 <= 100 ms |
| Context rail update after local selection | <= 100 ms | <= 150 ms |
| Hover transition | 120-160 ms | <= 200 ms |
| Press feedback | 70-100 ms | <= 120 ms |
| Selection transition | 120-180 ms | <= 220 ms |
| Standard panel/surface transition | 180-240 ms | <= 300 ms |
| Spatial source -> destination transition | 250-400 ms | <= 500 ms |
| Routine state-change animation | 150-350 ms | <= 400 ms |
| Intentional dramatic reveal | 400-700 ms | <= 900 ms unless explicitly authored |
| Pending state after async command begins | visible <= 100 ms | must not wait for server response |
| Important touch target | >= 44x44 px | no smaller primary touch target |
| Contextual primary actions visible at once | 1 dominant | max 7 direct actions before overflow/grouping |
| High-frequency live command depth | <= 2 after target selection | <= 3 from neutral live state |

### 4.1 Async Rule

Network latency must not become interaction latency.

Required sequence:

```text
0 ms      input
<=100 ms  local pressed/selected/pending state visible
...       network/server work
ACK       state settles or error is shown
```

Do not wait for the backend before acknowledging a valid user input visually.

Optimistic domain mutation is allowed only when domain safety permits it. Otherwise show a deterministic pending state.

---

## 5. Motion Vocabulary

Use one shared motion vocabulary instead of inventing timing per feature.

Suggested semantic tokens:

```text
motion.press       80 ms
motion.hover       140 ms
motion.select      160 ms
motion.transition  220 ms
motion.spatial     320 ms
motion.reveal      550 ms
```

Implementation may use CSS/Tailwind tokens or equivalent primitives, but the semantic categories must remain recognizable.

### Motion rules

- one user action should normally produce **one focal motion event**;
- do not stack unrelated animations;
- routine controls must never use > 400 ms motion;
- animation must not delay the actual state change;
- `prefers-reduced-motion` must preserve state clarity with motion removed;
- looping ambient motion is forbidden on dense control surfaces unless it communicates real live status.

---

## 6. Spatial Grammar for Live Surfaces

Default desktop grammar:

```text
LEFT              CENTER                    RIGHT
sources /         world /                   participants /
adventure         live stage                live state

                  BOTTOM
                  contextual action rail
```

Semantic rules:

- **Left** = sources, things that can enter the fiction, navigation through adventure material.
- **Center** = current shared focus, scene, Program, world or performance.
- **Right** = participants and current operational state.
- **Bottom/context rail** = actions available for the current selection.
- **Overlay/dialog** = temporary decision that cannot fit safely in context.

Agents must not use this as a rigid pixel template. It is a **meaning map**.

On tablet/mobile, collapse zones into drawers/sheets while preserving the same semantic ownership.

---

## 7. Action Vocabulary

Use consistent verbs across UI, state updates and feedback.

| Verb | Meaning |
|---|---|
| Select | establish current context; no shared-state mutation |
| Focus | direct attention to an existing thing |
| Preview | prepare a reversible/non-live presentation state |
| Take / Go Live | move Preview/current source to Program |
| Reveal | change knowledge visibility from hidden/private to an allowed audience |
| Bring In | add an actor/object/source to current fiction/presentation |
| Take Out | remove an actor/object/source from current focus/presentation |
| Apply | commit a prepared change |
| Undo | reverse a safe reversible action |
| Escalate | increase intensity/state when domain semantics support it |
| Settle | reduce intensity/state when domain semantics support it |

Do not use generic labels such as "Submit" when the domain verb is known.

The same action name must remain consistent across:

- button/control
- pending state
- success state
- event timeline
- undo/history label

---

## 8. Reversibility and Confirmation

Live flow must not be interrupted by unnecessary confirmation dialogs.

### Reversible actions

If an action is safe to reverse:

- prefer immediate execution;
- expose Undo in one interaction;
- keep Undo accessible for at least **8 seconds** or preserve it in an event/history surface.

### Destructive or irreversible actions

Require explicit confirmation when all are true:

1. the action is irreversible or expensive to reconstruct;
2. the impact is meaningful to shared gameplay/data;
3. accidental activation is plausible.

Do not confirm routine actions only because they write to the server.

---

## 9. Mastery Layer

SagaDrive must support increasing user mastery.

### Required

- every critical action is keyboard reachable;
- no critical live workflow requires drag-and-drop as its only input method;
- the **5 most frequent live commands on a surface** must have either:
  - a documented shortcut, or
  - direct command-palette access;
- shortcut behavior must mirror the pointer/touch action, not create a second semantic workflow;
- visible focus state is mandatory.

The expert path must be faster without making the novice path incomprehensible.

---

## 10. State Vocabulary

Interactive components that mutate or control live state should map to this vocabulary where relevant:

```text
idle
hover
selected
armed
pending
live
success
degraded
error
disabled
```

Definitions:

- **selected**: current local context
- **armed**: prepared but not yet committed, e.g. Preview
- **pending**: command sent, authoritative result not settled
- **live**: currently visible/active in shared Program/world
- **degraded**: still usable with missing media/network capability
- **error**: requested action failed

Do not collapse `selected`, `armed` and `live` into the same visual state.

---

## 11. Performance Mode Density Rules

To preserve control and legibility:

- one dominant primary action per context;
- max **7 directly visible contextual actions** before grouping into categories/overflow;
- max **3 simultaneously emphasized status signals** in one local region;
- routine live controls should not require reading paragraphs;
- helper copy for high-frequency controls should normally be <= **120 characters**;
- status labels should describe current state, not implementation details.

---

## 12. Agent Workflow

For any UI ticket touching Performance Mode, the agent MUST do the following before coding:

1. classify the touched surface as `SETUP`, `PERFORMANCE`, or mixed;
2. identify the current Stage/world anchor;
3. list the top 5 expected user actions for the touched surface;
4. estimate interaction depth for those actions;
5. identify which actions are previewable, reversible and authoritative;
6. state which quantitative baselines from Section 4 apply;
7. add acceptance criteria that reference the relevant `CE-*` gates below.

"Looks premium" is not an acceptable implementation plan.

---

## 13. Conductor Experience Gates

These are intended for tickets, reviews and AI-agent self-checks.

### Hard Gates

- **CE-01 Stage permanence:** routine Performance Mode actions do not navigate away from or unmount the current stage.
- **CE-02 Context selection:** selecting an entity updates context rather than opening a new screen unless long-form editing is the actual task.
- **CE-03 Command depth:** high-frequency live commands are <=2 interactions after target selection and <=3 from neutral live state.
- **CE-04 Immediate acknowledgement:** valid input produces visible local feedback within 100 ms p95.
- **CE-05 Async visibility:** pending state appears without waiting for server completion.
- **CE-06 State feedback:** important success is visible in changed state; no toast-only completion.
- **CE-07 Causality:** transfer/reveal/program actions make source -> destination/result understandable.
- **CE-08 State distinction:** selected, armed/preview, pending and live are not visually conflated.
- **CE-09 Motion purpose:** every non-trivial animation corresponds to a state/spatial change.
- **CE-10 Reduced motion:** removing animation preserves full comprehension and operation.
- **CE-11 Touch access:** primary touch targets are >=44x44 px.
- **CE-12 Input parity:** critical actions are keyboard reachable and do not require drag-only interaction.
- **CE-13 Action density:** no more than 7 direct contextual actions before grouping.
- **CE-14 Confirmation restraint:** routine reversible live actions do not open confirmation dialogs.
- **CE-15 Semantic copy:** controls use domain verbs rather than generic implementation verbs.

### Quality Gates

- **CE-16 Mastery path:** top 5 recurring commands have shortcut or command-palette access.
- **CE-17 Spatial grammar:** source/world/state/action zones preserve semantic ownership across responsive layouts.
- **CE-18 Motion timing:** motion fits the baseline categories in Section 4.
- **CE-19 One focal event:** one action does not trigger multiple competing decorative animations.
- **CE-20 Degraded operation:** unavailable media/network capability produces a usable degraded state instead of collapsing the entire surface.

A Performance Mode implementation should not be accepted with a failed Hard Gate unless the ticket explicitly changes this contract.

---

## 14. Example: GM Brings an NPC Into the Scene

### Reject

```text
NPC tab
-> NPC details page
-> Edit
-> Scene dropdown
-> choose scene
-> Save
-> Back
```

Reasons:

- stage lost;
- 5+ interactions;
- configuration workflow used for live intent;
- causality hidden behind save.

### Accept

```text
select NPC
-> contextual rail updates
-> Bring In
-> immediate pending/armed feedback
-> NPC appears on Stage
-> shared state settles
```

Target interaction depth after selection: **1**.

---

## 15. Example: Director Takes Preview to Program

### Reject

```text
select source
-> save layout
-> open Program tab
-> apply
```

### Accept

```text
select source
-> Preview changes
-> Take
-> Preview -> Program transition is legible
```

Preview and Program must remain visually distinct before `Take`.

---

## 16. Non-Goals

This contract does not require:

- gamepad-style controls;
- constant animation;
- skeuomorphic UI;
- excessive sound/haptics;
- a 3D interface for every task;
- removing all forms/tables from Setup Mode;
- hiding complex rules from expert users.

The goal is **direct, legible, responsive control over fiction and presentation**, not spectacle.


---

## 17. Decision Rationale and Provenance

This section preserves **why** the contract exists and **why the numeric defaults were chosen**. Future agents must not treat the numbers as universal laws.

### 17.1 Evidence labels

Each baseline belongs to one of four categories:

- **RESEARCH-INFORMED** — supported by published HCI or TTRPG research, then adapted to SagaDrive.
- **PLATFORM CONVENTION** — based on mature platform guidance and used as a compatibility/accessibility baseline.
- **PRODUCT HEURISTIC** — an explicit SagaDrive design choice that must be validated in real use.
- **DOMAIN PRINCIPLE** — derived from the kind of product SagaDrive is and the live-session job it performs.

A PRODUCT HEURISTIC is intentionally testable and replaceable. It is not disguised as scientific fact.

### 17.2 Principle rationale

| Rule | Why it exists | Evidence type | Failure mode it prevents |
|---|---|---|---|
| Stage permanence | Live play loses flow when routine commands replace the shared world with administrative screens. The stage is the user's spatial anchor. | DOMAIN PRINCIPLE | dashboard feeling, context loss, re-orientation cost |
| Context instead of navigation | Selection should change what can be done *to the current world*, not send the user away from it. | DOMAIN PRINCIPLE | CRUD navigation replacing direct manipulation |
| Direct manipulation | The GM/Director must be able to react at conversational speed. | DOMAIN PRINCIPLE | missed timing, tool friction during speech/play |
| Consequence is feedback | The user should see the world change, not merely receive confirmation that a database write happened. | DOMAIN PRINCIPLE | toast-driven admin UX, weak causality |
| Source -> destination causality | Transfer/reveal/program operations are easier to understand when the relationship between source and result is visible. | RESEARCH-INFORMED / PRODUCT HEURISTIC | uncertainty about what changed or where it went |
| Mastery layer | Repeated live use should become faster through muscle memory without creating a separate expert-only semantic model. | PRODUCT HEURISTIC | permanent novice-speed interaction |
| Selected / armed / pending / live distinction | These states have different consequences and must not be visually conflated. | DOMAIN PRINCIPLE | accidental publication, unclear authority |

### 17.3 Numeric baseline rationale

| Baseline | Why this value was selected | Evidence type | Change rule |
|---|---|---|---|
| input acknowledgement p95 <= 100 ms | Delays around/above 100 ms in discrete interaction become perceptible and weaken the direct-manipulation illusion. SagaDrive uses this as a user-visible response ceiling, not a server SLA. | RESEARCH-INFORMED | may become stricter; loosen only with measured evidence and explicit ticket rationale |
| context update <= 100 ms, ceiling 150 ms | Context selection should feel like the same interaction as the click/keypress. 150 ms is a temporary upper bound, not a target. | PRODUCT HEURISTIC informed by responsiveness research | validate on supported devices |
| press 70-100 ms | Press feedback should read as tactile acknowledgement, not as a transition. | PRODUCT HEURISTIC | tune globally, not per feature |
| hover 120-160 ms | Long enough to avoid visual flicker, short enough to stay subordinate to selection/action. | PRODUCT HEURISTIC | tune globally after usability testing |
| selection 120-180 ms | Selection carries more meaning than hover but must remain immediate. | PRODUCT HEURISTIC | tune globally |
| panel transition 180-240 ms | Provides spatial continuity without slowing live operation. | PRODUCT HEURISTIC | >300 ms requires explicit authored reason |
| spatial transition 250-400 ms | Source -> destination motion needs enough time to be legible as movement rather than a color flash. | PRODUCT HEURISTIC | use shortest duration that preserves causality |
| reveal 400-700 ms, <=900 ms default | Reveals may deliberately carry more weight, but should not suspend control for a full second during live play. | PRODUCT HEURISTIC | authored set pieces may override explicitly |
| >=44x44 px primary touch target | 44x44 is the comfortable default control size used in Apple touch guidance; SagaDrive adopts it as a cross-device product baseline for important touch controls. | PLATFORM CONVENTION | do not reduce for primary touch actions |
| <=2 interactions after target selection | A GM should be able to react to conversation without entering an administrative mini-flow. Two interactions allow one optional choice plus commit. | DOMAIN PRINCIPLE / PRODUCT HEURISTIC | measure task completion in live-session tests |
| <=3 interactions from neutral live state | Neutral state may require selecting the target first; this adds one step to the <=2 rule. | DOMAIN PRINCIPLE / PRODUCT HEURISTIC | same as above |
| max 7 direct contextual actions | This is a scanability/product-density heuristic, **not Miller's Law**. Beyond this point SagaDrive requires grouping/overflow so the action rail remains readable. | PRODUCT HEURISTIC | tune based on observed command frequency |
| Undo >=8 s or persistent history | Gives time to notice a mistaken live action without leaving an indefinite transient control on screen. | PRODUCT HEURISTIC | persistent history may replace timeout |
| top 5 frequent commands get shortcut/palette path | "5" forces explicit prioritization of the actual recurring workflow rather than shortcutting everything. | PRODUCT HEURISTIC | derive from telemetry/usability once available |
| max 3 emphasized status signals per local region | Prevents every status from competing for attention during live play. | PRODUCT HEURISTIC | exceptions require hierarchy rationale |
| helper copy <=120 characters for high-frequency controls | Forces live controls to remain scannable; long explanations belong in help/details, not the performance surface. | PRODUCT HEURISTIC | localization may justify small variance |

### 17.4 Research and platform references

These references explain the direction of the evidence-backed rules. They do **not** validate every SagaDrive-specific heuristic above.

- Apple, **Improving app responsiveness**: discrete interaction work should stay below roughly 100 ms; continuous interaction must update around display refresh intervals. https://developer.apple.com/documentation/xcode/improving-app-responsiveness
- Apple, **Understanding user interface responsiveness**: distinguishes discrete and continuous interaction and explains how latency/hitches break direct manipulation. https://developer.apple.com/documentation/xcode/understanding-user-interface-responsiveness/
- Apple, **Accessibility / Buttons / Game controls**: 44x44 pt is a recommended/default comfortable touch-control size on iOS/iPadOS. https://developer.apple.com/design/human-interface-guidelines/accessibility and https://developer.apple.com/design/human-interface-guidelines/game-controls

### 17.5 Historical intent

These baselines were introduced in September 2026 while converting the product goal "SagaDrive should feel like conducting/bending a living world rather than operating software" into instructions that AI coding agents can execute and reviewers can verify.

The values are intentionally explicit because agents do not reliably infer human qualities such as flow, responsiveness, tactility, restraint or instrument-like control from adjectives alone.

When changing a value later, preserve history:

1. state the old value;
2. state the new value;
3. record the observed problem or evidence;
4. note which CE gates are affected.

Do not silently "clean up" numbers because they look arbitrary. If they are wrong, replace them with a documented better decision.
