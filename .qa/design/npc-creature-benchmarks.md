# Design: NPC & Creature Benchmarks 1-20

## Status
Specification-ready for Issue 1. Numbers are binding playtest values until empirical validation.

## Power bands
- Level 1-4: Gering
- Level 5-8: Mittel
- Level 9-12: Hoch
- Level 13-16: Extrem
- Level 17-20: Legendaer

## Standard + Balanced benchmark table

Formula anchors:
- primary modifier = 6 + floor((level - 1) / 2)
- defense = 14 + floor((level - 1) / 2)
- HP = 18 + 2 * floor((level - 1) / 4)

| Lv | Machtgrad | EB | Primary skill | Primary mod | DEF | Resist H/N/L | HP | Base damage |
|---:|---|---:|---:|---:|---:|---|---:|---|
| 1 | Gering | +1 | 2 | +6 | 14 | 14/13/11 | 18 | d6+1 |
| 2 | Gering | +1 | 2 | +6 | 14 | 14/13/11 | 18 | d6+1 |
| 3 | Gering | +1 | 3 | +7 | 15 | 14/13/11 | 18 | d6+1 |
| 4 | Gering | +1 | 3 | +7 | 15 | 14/13/11 | 18 | d6+1 |
| 5 | Mittel | +2 | 3 | +8 | 16 | 15/14/12 | 20 | d8+1 |
| 6 | Mittel | +2 | 3 | +8 | 16 | 15/14/12 | 20 | d8+1 |
| 7 | Mittel | +2 | 4 | +9 | 17 | 15/14/12 | 20 | d8+1 |
| 8 | Mittel | +2 | 4 | +9 | 17 | 15/14/12 | 20 | d8+1 |
| 9 | Hoch | +3 | 3 | +10 | 18 | 17/16/13 | 22 | d8+2 |
| 10 | Hoch | +3 | 3 | +10 | 18 | 17/16/13 | 22 | d8+2 |
| 11 | Hoch | +3 | 4 | +11 | 19 | 17/16/13 | 22 | d8+2 |
| 12 | Hoch | +3 | 4 | +11 | 19 | 17/16/13 | 22 | d8+2 |
| 13 | Extrem | +4 | 4 | +12 | 20 | 18/17/14 | 24 | d10+2 |
| 14 | Extrem | +4 | 4 | +12 | 20 | 18/17/14 | 24 | d10+2 |
| 15 | Extrem | +4 | 5 | +13 | 21 | 18/17/14 | 24 | d10+2 |
| 16 | Extrem | +4 | 5 | +13 | 21 | 18/17/14 | 24 | d10+2 |
| 17 | Legendaer | +5 | 4 | +14 | 22 | 20/19/15 | 26 | d10+3 |
| 18 | Legendaer | +5 | 4 | +14 | 22 | 20/19/15 | 26 | d10+3 |
| 19 | Legendaer | +5 | 5 | +15 | 23 | 20/19/15 | 26 | d10+3 |
| 20 | Legendaer | +5 | 5 | +15 | 23 | 20/19/15 | 26 | d10+3 |

H/N/L means High / Normal / Low. Assign Body, Reflex and Mind to these slots by concept/profile.

## Attribute defaults
- Gering: +3,+2,+2,+1,+1,+0
- Mittel: +3,+3,+2,+2,+1,+0
- Hoch: +4,+3,+3,+2,+1,+0
- Extrem: +4,+4,+3,+2,+1,+0
- Legendaer: +5,+4,+3,+2,+1,+0

These are generator defaults only, not a second character point-buy system.

## Damage step ladder
1. d4+1
2. d6+1
3. d8+1
4. d8+2
5. d10+2
6. d10+3
7. d12+3
8. d12+4

A +/-1 damage step moves exactly one row and clamps at the ends unless an explicit ability states otherwise.

## Profiles

### Noncombat
Use when level represents social, technical, academic or other noncombat competence.
- primary benchmark belongs to the chosen noncombat specialty
- combat attacks use a relevant secondary/untrained skill
- direct damage defaults to d4+1 or equipment
- DEF -1
- no combat signature ability required

### Balanced
No shifts.

### Tough
- HP x1.20 before role multiplier
- Body or one durability resistance +1
- movement -3 m
- primary damage -1 step

### Offensive
- primary combat attack/effect +1
- primary damage +1 step
- DEF -1
- weakest resistance -1

### Mobile
- DEF +1
- Reflex +1
- movement +3 m
- HP x0.80 before role multiplier

### Ranged
- primary ranged attack +1
- movement +3 m
- melee attack -1
- HP x0.80 before role multiplier
- requires at least one ranged primary action

### Control/Support
- chosen control/support effect +1
- Mind or one control resistance +1
- direct-damage attack -1
- primary direct damage -1 step
- spend signature budget on control, positioning, protection, help or utility

Profile shifts may not create hidden modifiers beyond SagaDrive caps. If a +1 cannot be represented legally at the cap, move that profile strength to another allowed dimension or signature ability.

## Combat roles
Calculation order: level benchmark -> concept -> profile -> role -> explicit gear/abilities.

HP multipliers:
- Standard x1.00
- Elite x1.50
- Boss x2.50

Round combined HP once, upward, at the end.

Elite: one Elite Impulse per round after another figure finishes a turn. It allows half movement or a tagged minor ability. Offensive impulse damage must be at least one NPC damage step below the primary attack.

Boss: two Boss Impulses per round, max one after the same other turn, plus one explicit Wendepunkt per combat, normally at first reaching 50% max HP. No generic cleanse or immunity.

Combat role does not alter attack, DEF, resistances, base damage, identity or controller.

## Signature ability budget
| Machtgrad | Standard signature abilities | Max full-power effect guideline |
|---|---:|---|
| Gering | 1 | about d6+2 or comparable |
| Mittel | 2 | about 2d6+2 |
| Hoch | 2 | about 3d6+3 |
| Extrem | 3 | about 4d6+4 |
| Legendaer | 3 | about 5d6+5 |

Use existing Core effect-budget tradeoffs: more targets, area, range, duration or control consume the same budget. Near-ceiling effects require a meaningful limitation and are not ordinary at-will attacks.

Role additions:
- Standard: table count
- Elite: +1 signature ability and at least one useful Elite-Impulse option
- Boss: +2 signature abilities, at least two useful Boss-Impulse options and exactly one Wendepunkt

## Examples
- Lv7 Mobile Elite: HP 20 x0.80 x1.50 = 24; DEF 18; move 12 m; primary +9.
- Lv10 Offensive Standard: primary combat +11; DEF 17; HP 22; damage d8+2 -> d10+2.
- Lv18 Tough Boss: HP 26 x1.20 x2.50 = 78; move 6 m; damage d10+3 -> d10+2.

## Core replacement
Issue 1 replaces current coarse Core section 15 opponent rules. Preserve the old Standard anchor points at levels 1/5/9/13/17, but replace old Scherge, Elite +1 attack/x2 HP, Boss +1 attack/+1 DEF/higher damage/two initiative slots/two reactions, and their threat-point assumptions.

## Ready
YES for Issue 1 implementation. Encounter-budget math across different levels is deferred to the later encounter/session issue.