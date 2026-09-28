# SagaDrive Starttemplates V1 — Level-1 Build Contract

Feature slug: `character-starting-templates-design-v1`  
Source issues: #465 (this contract), #463 (domain catalog), #464 (create UI)  
Rules SoT: `src/domains/rules/sagadrive/**` (character-creation, attribute-progression, skill-progression, background-templates)

## Purpose

Ten **species-neutral Level-1 start builds**. They are curated Archetype + Essence combinations with a valid attribute array and 7/2/1 skill sources — **not** new classes, class levels, multiclassing, or extra abilities.

Level 1 still grants only the existing Rank-I core ability of the chosen primary archetype (from the rules kernel / CharacterAbilitiesPanel). Templates do not invent spells, tech powers, or combat abilities.

## Global rules (locked)

| Rule | Value |
|------|-------|
| Level | 1 |
| Attribute curve | Permutation of `SAGA_DRIVE_START_ATTRIBUTE_ARRAY = [4,3,3,2,2,1]` only |
| Attribute order | STÄ / GES / AUS / VER / WAH / CHA |
| Attribute budget / cap | 15 / start cap 4 |
| Free skill points | 7 |
| Background skill points | 2 (from background framework pool only) |
| Archetype training | +1 (from archetype skill pool only) |
| Skill start cap | 3 (final rank after stacking free+bg+archetype) |
| Skill advances | none at Level 1 |
| Background specialization | exactly one, `source: background`, `acquiredAtLevel: 1`, skill must have `backgroundSkillPoints > 0`, name from existing skill specialization catalog |

### Explicitly NOT set by any start template

Species / Spezies / race, species traits, name/identity, gender reading, appearance, avatar, portrait, Look, inventory / Inventar, equipment / Equipment.

## Catalog keys (stable IDs for #463)

| Key | DE label | Archetype | Essence |
|-----|----------|-----------|---------|
| `berserker` | Berserker | fighter | physical |
| `vanguard` | Vanguard | fighter | technological |
| `mage` | Zauberer | thinker | spiritual |
| `technomancer` | Technomant | thinker | technological |
| `medicus` | Medicus | healer | physical |
| `mystic` | Mystiker | healer | spiritual |
| `assassin` | Assassine | rebel | physical |
| `mechanom` | Mechanom | rebel | technological |
| `mentalist` | Mentalist | diplomat | mental |
| `herald` | Herold | diplomat | bound |

Wächter / Waldläufer are **not** part of V1.

---

## Role builds

Attribute format: `STÄ / GES / AUS / VER / WAH / CHA`.  
Skill stacks: `free + background + archetype(+1 if selected)`.

### 1. Berserker (`berserker`)

| Field | Value |
|-------|-------|
| Archetype / Essence | fighter + physical |
| Attributes | `4 / 3 / 3 / 1 / 2 / 2` |
| Background | `sport-competition` (Sport & Wettkampf) |
| Archetype +1 | `melee` |
| Background +2 | `athletics: 2` |
| Free +7 | `melee: 2`, `intimidation: 2`, `athletics: 1`, `awareness: 1`, `acrobatics: 1` |
| Specialization | `athletics` / Kraftakt |
| Final ranks (≠0) | melee 3, athletics 3, intimidation 2, awareness 1, acrobatics 1 |

**Why:** Physical fighter fantasy — close pressure and raw athleticism. Essence `physical` marks power as body/training, not tech or spirit. Differs from Vanguard (same archetype) by melee focus, sport background, and STÄ-led array vs AUS/ranged tech soldier.

### 2. Vanguard (`vanguard`)

| Field | Value |
|-------|-------|
| Archetype / Essence | fighter + technological |
| Attributes | `3 / 2 / 4 / 3 / 2 / 1` |
| Background | `soldier` (Militär & Wachdienst) |
| Archetype +1 | `ranged` |
| Background +2 | `ranged: 2` |
| Free +7 | `athletics: 2`, `intimidation: 2`, `melee: 2`, `awareness: 1` |
| Specialization | `ranged` / Schusswaffen |
| Final ranks (≠0) | ranged 3, athletics 2, intimidation 2, melee 2, awareness 1 |

**Why:** Technological fighter as disciplined fire support / hardpoint. Soldier pool + AUS/VER lean and ranged stack vs Berserker’s melee/STÄ sport path. Essence `technological` frames combat edge as gear/systems, not raw physique.

### 3. Zauberer (`mage`)

| Field | Value |
|-------|-------|
| Archetype / Essence | thinker + spiritual |
| Attributes | `1 / 2 / 2 / 4 / 3 / 3` |
| Background | `academy-research` (Akademie & Forschung) |
| Archetype +1 | `knowledge` |
| Background +2 | `knowledge: 2` |
| Free +7 | `investigation: 2`, `awareness: 2`, `persuasion: 2`, `insight: 1` |
| Specialization | `knowledge` / Okkultes |
| Final ranks (≠0) | knowledge 3, investigation 2, awareness 2, persuasion 2, insight 1 |

**Why:** Academic mystic analyst — VER/WAH/CHA, knowledge stack + occult specialization. Essence `spiritual` separates from Technomant (same archetype) who routes analysis through tech/systems.

### 4. Technomant (`technomancer`)

| Field | Value |
|-------|-------|
| Archetype / Essence | thinker + technological |
| Attributes | `1 / 3 / 2 / 4 / 3 / 2` |
| Background | `academy-research` (Akademie & Forschung) |
| Archetype +1 | `technology` |
| Background +2 | `investigation: 1`, `awareness: 1` |
| Free +7 | `technology: 2`, `investigation: 2`, `knowledge: 1`, `awareness: 1`, `sleight: 1` |
| Specialization | `investigation` / Archive |
| Final ranks (≠0) | technology 3, investigation 3, awareness 2, knowledge 1, sleight 1 |

**Why:** Same academy past as Zauberer, but GES/tech/sleight and `technological` essence produce a systems/hacking thinker, not occult scholar. Archetype +1 on `technology` is the clearest mechanical fork.

### 5. Medicus (`medicus`)

| Field | Value |
|-------|-------|
| Archetype / Essence | healer + physical |
| Attributes | `1 / 2 / 3 / 4 / 3 / 2` |
| Background | `street-doctor` (Heilung & Fürsorge) |
| Archetype +1 | `medicine` |
| Background +2 | `medicine: 2` |
| Free +7 | `insight: 2`, `survival: 2`, `awareness: 2`, `knowledge: 1` |
| Specialization | `medicine` / Notfallmedizin |
| Final ranks (≠0) | medicine 3, insight 2, survival 2, awareness 2, knowledge 1 |

**Why:** Field medic under pressure — physical essence + emergency medicine + survival/awareness. Differs from Mystiker by medicine-led stack and care-background vs faith/insight path.

### 6. Mystiker (`mystic`)

| Field | Value |
|-------|-------|
| Archetype / Essence | healer + spiritual |
| Attributes | `1 / 2 / 2 / 3 / 4 / 3` |
| Background | `faith-order` (Glaube & Orden) |
| Archetype +1 | `insight` |
| Background +2 | `insight: 1`, `knowledge: 1` |
| Free +7 | `insight: 1`, `awareness: 2`, `persuasion: 2`, `knowledge: 1`, `medicine: 1` |
| Specialization | `insight` / Motivation |
| Final ranks (≠0) | insight 3, awareness 2, persuasion 2, knowledge 2, medicine 1 |

**Why:** Spiritual stabilizer — WAH/CHA, insight stack, faith order past. Light medicine only; essence and social/sense profile vs Medicus’s medicine-first physical caregiver.

### 7. Assassine (`assassin`)

| Field | Value |
|-------|-------|
| Archetype / Essence | rebel + physical |
| Attributes | `1 / 4 / 3 / 2 / 3 / 2` |
| Background | `smuggler` (Unterwelt & Grauzone) |
| Archetype +1 | `stealth` |
| Background +2 | `stealth: 1`, `deception: 1` |
| Free +7 | `stealth: 1`, `sleight: 2`, `acrobatics: 2`, `deception: 1`, `awareness: 1` |
| Specialization | `stealth` / Urbane Tarnung |
| Final ranks (≠0) | stealth 3, sleight 2, acrobatics 2, deception 2, awareness 1 |

**Why:** Physical infiltrator — GES/AUS, stealth-led smuggler past. Differs from Mechanom (same archetype) by stealth/acrobatics vs tech/sleight gadgeteer profile.

### 8. Mechanom (`mechanom`)

| Field | Value |
|-------|-------|
| Archetype / Essence | rebel + technological |
| Attributes | `1 / 4 / 2 / 3 / 3 / 2` |
| Background | `corporate-technician` (Handwerk & Technik) |
| Archetype +1 | `sleight` |
| Background +2 | `technology: 1`, `sleight: 1` |
| Free +7 | `sleight: 1`, `technology: 2`, `stealth: 1`, `deception: 1`, `investigation: 1`, `awareness: 1` |
| Specialization | `technology` / Mechanik |
| Final ranks (≠0) | sleight 3, technology 3, stealth 1, deception 1, investigation 1, awareness 1 |

**Why:** Tech rebel / saboteur — workshop past, sleight+technology stack, `technological` essence. Same rebel chassis as Assassine, different fantasy (tools vs body stealth).

### 9. Mentalist (`mentalist`)

| Field | Value |
|-------|-------|
| Archetype / Essence | diplomat + mental |
| Attributes | `1 / 2 / 2 / 3 / 3 / 4` |
| Background | `investigator` (Ermittlung & Information) |
| Archetype +1 | `insight` |
| Background +2 | `insight: 1`, `investigation: 1` |
| Free +7 | `insight: 1`, `persuasion: 2`, `awareness: 2`, `deception: 1`, `investigation: 1` |
| Specialization | `insight` / Lügen erkennen |
| Final ranks (≠0) | insight 3, persuasion 2, awareness 2, investigation 2, deception 1 |

**Why:** Mental influence via reading people and cases — CHA-led, insight/investigation. Differs from Herold by investigator past and insight focus vs stage persuasion/performance.

### 10. Herold (`herald`)

| Field | Value |
|-------|-------|
| Archetype / Essence | diplomat + bound |
| Attributes | `1 / 2 / 3 / 2 / 3 / 4` |
| Background | `stage-public` (Bühne & Öffentlichkeit) |
| Archetype +1 | `persuasion` |
| Background +2 | `persuasion: 1`, `performance: 1` |
| Free +7 | `persuasion: 1`, `performance: 2`, `insight: 2`, `intimidation: 1`, `deception: 1` |
| Specialization | `persuasion` / Rede |
| Final ranks (≠0) | persuasion 3, performance 3, insight 2, intimidation 1, deception 1 |

**Why:** Public voice / bound mandate — stage background, persuasion+performance, essence `bound` (external source of authority). Same diplomat chassis as Mentalist, broadcast/leadership fantasy instead of quiet reading.

---

## Same-archetype differentiation (summary)

| Pair | Shared | Differentiator |
|------|--------|----------------|
| Berserker / Vanguard | fighter | physical+melee+sport vs technological+ranged+soldier |
| Zauberer / Technomant | thinker | spiritual+knowledge/occult vs technological+tech/investigation |
| Medicus / Mystiker | healer | physical+medicine/street-doctor vs spiritual+insight/faith |
| Assassine / Mechanom | rebel | physical+stealth/smuggler vs technological+tech/workshop |
| Mentalist / Herold | diplomat | mental+insight/investigator vs bound+persuasion/stage |

## Implementation notes for #463 / #464

- Persist only mechanical fields listed above; never race/appearance/inventory.
- Validate with `isValidSagaDriveBaseAttributeDistribution`, `isValidStartSkillBuild`, and L1 `isValidSagaDriveSkillDevelopment` (single background specialization).
- UI (#464) passes **template key only**; editor resolves against the domain catalog.
- Rank-cap note: free points on archetype-trained skills were reduced where stacking would exceed 3 (e.g. Vanguard ranged free 0 after bg2+arch1).

## Non-goals

New archetypes/essences, class levels, ability slots, fake Level-1 powers, species, Look, LiveAct, inventory, UI (#464), domain catalog code (#463).
