# SagaDrive Adaptive UI & Mobile Experience Contract

## Status

This document is a **canonical product-experience contract** for SagaDrive adaptive layout, touch interaction, safe areas, motion restraint, accessibility, and device-appropriate recomposition.

It exists because words such as "responsive", "mobile-first", "premium", or "Apple-like" are not acceptance criteria. Agents must translate them into observable layout/interaction rules and measurable `AU-*` gates.

Related canonical sources:

- `AGENTS.md` — repository and architecture rules
- `src/THEME_GUIDE.md` — visual design system (tokens, brand roles, control affordances)
- `src/guidelines/Guidelines.md` — compact AI/Figma-Make generation rules
- `docs/concepts/conductor-experience-contract.md` — Performance Mode behaviour (`CE-*`)
- `docs/concepts/imagination-first-visualization-contract.md` — visualization behaviour (`IV-*`)
- `src/styles/globals.css` / `src/shared/ui/` — technical source of truth for tokens and primitives

When this document conflicts with a local implementation shortcut, **this document wins for adaptive UI/mobile experience** unless a ticket explicitly changes the contract.

Shared primitives live under `src/shared/ui/adaptive/**` (#482). Automated gates (#483) and golden mobile journeys (#484) enforce this contract further.

---

## 1. Product Thesis

SagaDrive is a **tools-first TTRPG product surface**, not a marketing landing page and not a shrunk desktop dashboard.

Canonical adaptive thesis:

```text
CLASSIFY THE SURFACE
  -> CHOOSE THE DEVICE COMPOSITION
  -> PRESERVE TASK COMPLETION
  -> PROVE THE GATES
```

On Phone, Tablet, and Desktop the user must complete the same job without horizontal clipping, unreachable controls, or hover-only dead ends. Complex Desktop workstations must be **recomposed** on Phone, not merely scaled.

Do not use subjective styling goals as acceptance. Reference `AU-*` gates instead.

---

## 2. Surface Classification (required before UI work)

Every user-facing ticket must classify the surface before implementation:

| Class | Examples | Adaptive expectation |
|---|---|---|
| **Journey** | Library browse, session join, character pick, onboarding | Full Phone/Tablet/Desktop compositions; golden-journey candidates |
| **Workstation** | Character Studio, World Editor, Look Editor, Face Mapping | Desktop-primary; Phone gets a reduced composition (primary task only) with explicit deviation if a full Phone parity is out of scope |
| **Live / Performance** | Player Live, GM Live, Director, Viewer/Program | Follow this contract **and** `CE-*` from the Conductor contract |
| **Overlay / Sheet** | Dialogs, drawers, action sheets, confirmations | Must fit viewport with safe areas; no nested scroll traps |

Route names do not determine class. **User intent does.**

---

## 3. Device Bands

Use these product bands (CSS breakpoints may map to tokens later; do not invent ad-hoc per-feature widths):

| Band | Width guidance | Primary interaction |
|---|---|---|
| **Phone** | 320–767 px | Touch-first; bottom nav / sheets; single column |
| **Tablet** | 768–1023 px | Touch + pointer; optional two-pane; drawers ok |
| **Desktop** | ≥1024 px | Pointer + keyboard; multi-pane workstations allowed |

Existing technical baseline: `useIsMobile()` treats `<768px` as mobile; `THEME_GUIDE` requires multi-column editors to collapse under 768px. This contract **keeps that 768px mobile cutoff** and adds an explicit Tablet band for composition rules.

**Narrow floor:** 320px width must remain usable (no required horizontal page scroll for primary tasks).

**Landscape:** only when Media/LiveStage/maps clearly benefit; otherwise preserve portrait-first task completion on Phone.

---

## 4. Non-Negotiable Adaptive Principles

1. **Recompose, don't shrink.** Workstation chrome that needs three panes on Desktop becomes stacked/sheeted task flows on Phone.
2. **Touch parity.** Any critical action reachable by pointer must be reachable by touch without hover discovery.
3. **Safe areas are layout, not decoration.** Home indicator, notches, and status bars must not cover primary controls.
4. **One focal column on Phone.** Avoid competing sticky headers + sticky footers that leave <50% content height.
5. **State clarity without motion.** `prefers-reduced-motion` must not remove selected/pending/error comprehension.
6. **German UI copy must fit.** Labels wrap or truncate with accessible names; they must not overflow into controls.
7. **Theme tokens win.** No feature-local color systems that conflict with `THEME_GUIDE`.
8. **No second UI framework.** Adaptive behaviour builds on existing Radix/`src/shared/ui` primitives (#482).

---

## 5. Quantitative Baselines

These values are **default product baselines**. A ticket may override one only with an explicit deviation note (see §9).

| Metric | Baseline | Hard rule |
|---|---:|---|
| Primary touch target | ≥44×44 px | Matches `CE-11` / THEME_GUIDE |
| Minimum supported CSS width | 320 px | No required page-level horizontal scroll for Journey primary tasks |
| Mobile editor collapse | <768 px → single column | THEME_GUIDE responsive rule |
| Content gutter (Phone) | ≥16 px | Plus safe-area insets where edges meet device chrome |
| Safe-area bottom chrome | `max(token, env(safe-area-inset-*))` | Primary bottom actions clear the home indicator |
| Tap acknowledgement | ≤100 ms p95 local feedback | Aligns with Conductor async rule |
| Hover-only critical action | Forbidden | Must have visible touch/keyboard path |
| Focus ring | Visible Cyan/Teal | Must survive Dark/Light |
| Text contrast | WCAG AA | Body and interactive labels |
| Reduced motion | Full operation preserved | No information only in animation |

---

## 6. Phone / Tablet / Desktop Pattern Rules

### 6.1 Phone (Journey)

- Single primary column; secondary filters/tools in Sheet/Drawer.
- Primary CTA visible without horizontal pan.
- Bottom navigation / action bars use `.safe-area-pb` (or equivalent inset padding).
- Lists: one primary action per row; overflow in an explicit menu.
- Forms: labels above controls; 44px control height for important fields.

### 6.2 Phone (Workstation — reduced composition)

- Ship the **primary authoring task** only unless the ticket scopes full Phone parity.
- Multi-pane Desktop layouts become sequential steps or a single pane + sheet inspector.
- Dense tool rails collapse into menus; do not keep unreadably tiny icon strips.
- If Face Mapping / 3D / LiveAct authoring cannot meet Phone gates in-slice, record an **AU deviation** and keep Desktop as the supported band for that surface.

### 6.3 Tablet

- Prefer two-pane (list + detail) when it improves task completion.
- Touch targets remain ≥44×44 for primary actions.
- Avoid hover-only affordances; pointer hover may enhance but must not gate access.

### 6.4 Desktop

- Multi-pane workstations allowed when semantic zones stay clear (see Conductor spatial grammar for Performance).
- Keyboard: all critical actions reachable; no drag-only exclusive paths for critical tasks (`CE-12` alignment).
- Do not remove Phone/Tablet compositions when adding Desktop power features.

---

## 7. Motion, Keyboard, Accessibility

- Motion follows Conductor motion vocabulary when in Performance Mode; otherwise keep transitions short (≤300 ms for standard surface changes unless authored reveal).
- `prefers-reduced-motion: reduce` disables non-essential motion while keeping state changes instant and obvious.
- Keyboard: tab order matches reading order; dialogs trap focus; Escape closes ephemeral overlays.
- Screen reader: interactive controls have accessible names; status changes use polite live regions where async completion matters.
- Selected / focus / disabled / invalid must not rely on a single color channel alone (THEME_GUIDE Accessibility).

---

## 8. Required States

Every Journey and Live surface must define explicit UI for:

- loading
- empty
- error / retry
- offline or reconnecting (when networked)
- success via **changed state** (not toast-only for important outcomes)

Workstation surfaces must at least cover loading, empty, and error for the primary pane.

---

## 9. Deviation Rule

A ticket may deviate from an `AU-*` Hard Gate only when **all** of the following are true:

1. The issue/acceptance names the gate IDs being waived.
2. The reason is product/scope (e.g. Desktop-only Workstation for this slice), not convenience.
3. The supported device bands are listed explicitly.
4. A follow-up issue exists or is referenced when Phone/Tablet parity is deferred.

Silent deviation is a failed review.

---

## 10. Agent Workflow

Before implementing user-facing UI:

1. Classify surface (Journey / Workstation / Live / Overlay).
2. List target device bands for this slice.
3. Read this contract and apply relevant `AU-*` gates in acceptance.
4. For Performance/Live also apply `CE-*`; for visualization also apply `IV-*`.
5. Prefer existing `src/shared/ui` primitives; do not add a parallel component system.
6. If a Hard Gate cannot be met, document a deviation per §9.

Subjective acceptance text such as "looks premium on mobile" is insufficient.

---

## 11. Adaptive UI Gates (`AU-*`)

### Hard Gates

- **AU-01 Overflow:** At 320px and at the Phone band max, primary Journey content and controls are not clipped by horizontal page scroll; tabs/controls do not truncate into unusable fragments.
- **AU-02 Touch targets:** Primary product actions expose ≥44×44 px hit targets (or equivalent spacing) on Phone/Tablet.
- **AU-03 Safe areas:** Fixed top/bottom chrome respects `env(safe-area-inset-*)`; primary actions remain tappable above the home indicator.
- **AU-04 Keyboard:** Critical actions are keyboard-reachable; overlays restore focus on close.
- **AU-05 Motion restraint:** Non-essential motion respects `prefers-reduced-motion`; comprehension does not depend on animation.
- **AU-06 Recomposition:** Surfaces with multi-pane Desktop layouts provide an intentional Phone composition (stack/sheet/steps) rather than scaled miniature panes — or an explicit §9 deviation naming supported bands.
- **AU-07 Touch parity:** No critical action is hover-only; touch users can complete the primary task.
- **AU-08 Accessibility basics:** Visible focus, WCAG AA text contrast for primary copy, and accessible names on icon-only controls.
- **AU-09 States:** Loading / empty / error (and reconnecting when networked) are designed states, not blank screens.
- **AU-10 Token fidelity:** Colors/spacing use theme tokens / shared primitives; no conflicting local brand system.

### Quality Gates

- **AU-11 Tablet two-pane:** Journey list+detail uses a coherent two-pane or equivalent sheet pattern between 768–1023 px when it improves task completion.
- **AU-12 Virtual keyboard:** Phone forms keep focused inputs and primary CTA visible / scrollable into view when the virtual keyboard opens (no permanently covered submit).
- **AU-13 Text zoom:** Layout survives browser text zoom ~200% without overlapping interactive controls for primary Journey tasks.
- **AU-14 Reduced chrome:** Phone sticky header+footer combined do not consume more than ~50% of the viewport height in the default state.
- **AU-15 German labels:** Long German strings wrap or truncate with tooltips/accessible names; they do not break control layout.

A user-facing implementation should not be accepted with a failed Hard Gate unless the ticket explicitly changes this contract or records a §9 deviation.

---

## 12. Relationship to Upcoming Slices

| Issue | Role |
|---|---|
| **#481** (this) | Contract + AGENTS/THEME_GUIDE linkage |
| **#482** | Adaptive shared UI primitives implementing patterns |
| **#483** | Automated Mobile / a11y / visual quality gates |
| **#484** | Golden Mobile Journeys on real device profiles |
| **#368** | Player Live consumes #481–#483 foundation |

---

## 13. Non-Goals

- No Ionic / Konsta / React Native rewrite.
- No iOS visual clone; HIG/Mobbin are evidence for interaction rules, not pixel skins.
- No Big-Bang redesign of every existing screen in one PR.
- No business-rule or authority changes derived from viewport size.

---

## 14. Decision Rationale

SagaDrive already had mobile-first notes in `THEME_GUIDE` and Performance baselines in the Conductor contract, but agents still accepted "responsive/premium" wording without measurable gates. This Adaptive UI contract closes that gap with device bands, recomposition rules, and `AU-*` IDs that Acceptance and later automated gates (#483) can reference.
