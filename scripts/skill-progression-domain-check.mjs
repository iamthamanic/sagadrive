#!/usr/bin/env node
/**
 * Skill progression v2 domain behavior check — runs the real domain/persistence code
 * (bundled via esbuild) against the post-merge hardening invariants.
 * Location: scripts/skill-progression-domain-check.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outdir = join(root, 'node_modules', '.cache', 'skill-progression-domain-check');
mkdirSync(outdir, { recursive: true });

const esbuild = join(root, 'node_modules', '.bin', 'esbuild');
const entries = {
  rules: 'src/domains/rules/sagadrive/skill-progression/index.ts',
  persistence: 'src/domains/character/use-cases/assert-character-persistence.ts',
  normalize: 'src/domains/character/use-cases/normalize-character.ts',
};
for (const [name, entry] of Object.entries(entries)) {
  execFileSync(esbuild, [join(root, entry), '--bundle', '--format=esm', `--outfile=${join(outdir, `${name}.mjs`)}`], { stdio: 'inherit' });
}

const rules = await import(pathToFileURL(join(outdir, 'rules.mjs')).href);
const persistence = await import(pathToFileURL(join(outdir, 'persistence.mjs')).href);
const normalize = await import(pathToFileURL(join(outdir, 'normalize.mjs')).href);

let failures = 0;
function check(condition, message) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}
function expectThrow(fn, message) {
  try {
    fn();
  } catch {
    return;
  }
  failures += 1;
  console.error(`FAIL (expected throw): ${message}`);
}
function expectPass(fn, message) {
  try {
    fn();
  } catch (error) {
    failures += 1;
    console.error(`FAIL (unexpected throw): ${message} — ${error.message}`);
  }
}

// §5.2 specialization bonus constant (no magic number in UI).
check(rules.SAGA_DRIVE_SPECIALIZATION_BONUS === 2, 'specialization bonus constant is +2');

const SKILL_POOL = ['medicine', 'insight', 'persuasion', 'awareness'];
const ARCHETYPE = 'fighter'; // skills: athletics, melee, ranged, intimidation

/** Canonical valid complete build: 7 free / 2 background / 1 archetype, bg spec bound to medicine. */
function validBuild() {
  return {
    // athletics 3 (2+archetype), melee 2, insight 1, awareness 1, persuasion 1, medicine 2 (background)
    freeSkillRanks: { athletics: 2, melee: 2, insight: 1, awareness: 1, persuasion: 1 },
    backgroundSkillPoints: { medicine: 2 },
    archetypeTrainingSkill: 'athletics',
    skillAdvances: [],
    specializations: [{ skill: 'medicine', name: 'Notfallmedizin', source: 'background', acquiredAtLevel: 1 }],
  };
}

function profileFor(build, extra = {}) {
  return {
    archetype: ARCHETYPE,
    speciesTraitInstances: [],
    background: {
      name: 'Feldmediziner',
      skillPool: [...SKILL_POOL],
      trainedSkills: rules.backgroundSkillPointsToTrainedSkills(build.backgroundSkillPoints ?? {}),
      backgroundSkillPoints: build.backgroundSkillPoints,
      specialization: (build.specializations ?? []).find((entry) => entry.source === 'background'),
      milieuAccess: 'Kliniken',
      contact: 'Dr. Imani',
      complication: 'Eid',
      communication: 'Standard',
    },
    archetypeTrainingSkill: build.archetypeTrainingSkill,
    freeSkillRanks: build.freeSkillRanks,
    skillAdvances: build.skillAdvances?.length ? build.skillAdvances : undefined,
    specializations: build.specializations?.length ? build.specializations : undefined,
    drive: 3,
    momentum: 0,
    ...extra,
  };
}

function finalSkillsFor(build, level) {
  return rules.resolveSagaDriveSkillRanks(build, level);
}

const ATTRS = { strength: 4, dexterity: 3, endurance: 3, mind: 2, perception: 2, charisma: 1 };

// §5.2 specialization bonus constant (no magic number in UI).
check(rules.SAGA_DRIVE_SPECIALIZATION_BONUS === 2, 'specialization bonus constant is +2');

// (1) 7 free / 2 background / 1 archetype → valid roundtrip (20).
{
  const build = validBuild();
  const skills = finalSkillsFor(build, 1);
  check(skills.medicine === 2 && skills.athletics === 3 && skills.melee === 2, 'start sources stack correctly');
  expectPass(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, skills, profileFor(build), 1),
    'valid complete build passes persistence assert',
  );
}

// (2) Background { medicine: 2 } stacking is legal.
check(rules.isValidBackgroundSkillPoints({ medicine: 2 }, SKILL_POOL), 'background +2 stacking valid');

// (3) Background { medicine: 1, insight: 1 } split is legal.
check(rules.isValidBackgroundSkillPoints({ medicine: 1, insight: 1 }, SKILL_POOL), 'background +1/+1 split valid');

// (4) Background pool must be exactly four distinct valid skills.
{
  const build = validBuild();
  check(!rules.isValidStartSkillBuild(build, ['medicine'], ARCHETYPE), 'pool of one skill rejected');
  check(!rules.isValidStartSkillBuild(build, ['medicine', 'medicine', 'insight', 'awareness'], ARCHETYPE), 'duplicated pool rejected');
  check(!rules.isValidStartSkillBuild(build, ['medicine', 'insight', 'awareness', 'persuasion', 'stealth'], ARCHETYPE), 'pool of five rejected');
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor(build, {
      background: { ...profileFor(build).background, skillPool: ['medicine'] },
    }), 1),
    'pool [medicine] with { medicine: 2 } is not a complete background',
  );
}

// (2) Archetype key missing → FAIL.
{
  const build = validBuild();
  const profile = profileFor(build);
  delete profile.archetype;
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profile, 1),
    'missing archetype key fails',
  );
  check(!rules.isValidStartSkillBuild(build, SKILL_POOL, undefined), 'start build without archetype key rejected');
}

// (3) Archetype present, archetypeTrainingSkill missing → FAIL.
{
  const build = validBuild();
  delete build.archetypeTrainingSkill;
  const skills = finalSkillsFor(build, 1);
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, skills, profileFor(build), 1),
    'missing archetype training skill fails',
  );
}

// (4) archetypeTrainingSkill not belonging to archetype → FAIL.
{
  const build = validBuild();
  build.archetypeTrainingSkill = 'medicine';
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor(build), 1),
    'archetype training skill outside archetype list fails',
  );
}

// (5) Only 7 free + 2 background (no archetype point) → FAIL.
{
  const build = validBuild();
  delete build.archetypeTrainingSkill;
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor(build), 1),
    'only 7 free + 2 background fails',
  );
}

// (6) Only 7 free + 1 archetype → FAIL.
{
  const build = validBuild();
  build.backgroundSkillPoints = {};
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor(build), 1),
    'only 7 free + 1 archetype fails',
  );
}

// (7) Only 2 background + 1 archetype → FAIL.
{
  const build = validBuild();
  build.freeSkillRanks = rules.normalizeFreeSkillRanks({});
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor(build), 1),
    'only 2 background + 1 archetype fails',
  );
}

// (8) freeSkillRanks sum 5 → FAIL.
{
  const build = validBuild();
  build.freeSkillRanks = { athletics: 2, melee: 2, insight: 1 };
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor(build), 1),
    'free skill ranks summing to 5 fail',
  );
}

// (9) backgroundSkillPoints only 1 point → FAIL.
{
  const build = validBuild();
  build.backgroundSkillPoints = { medicine: 1 };
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor(build), 1),
    'background skill points summing to 1 fail',
  );
}

// (6) Start cap > 3 → FAIL.
{
  const build = validBuild();
  build.freeSkillRanks = { athletics: 2, melee: 1, insight: 1, awareness: 1, medicine: 2 };
  const skills = finalSkillsFor(build, 1); // medicine = 2 bg + 2 free = 4
  check(skills.medicine === 4, 'stacked start rank exceeds cap in fixture');
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, skills, profileFor(build), 1),
    'start cap violation fails',
  );
}

// (7) Only four trained start skills is allowed.
{
  const build = {
    freeSkillRanks: { melee: 2, insight: 3, awareness: 1, medicine: 1 },
    backgroundSkillPoints: { medicine: 2 },
    archetypeTrainingSkill: 'melee',
    skillAdvances: [],
    specializations: [{ skill: 'medicine', name: 'Notfallmedizin', source: 'background', acquiredAtLevel: 1 }],
  };
  const skills = finalSkillsFor(build, 1);
  const trained = Object.values(skills).filter((rank) => rank > 0).length;
  check(trained === 4, `exactly four trained start skills (got ${trained})`);
  expectPass(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, skills, profileFor(build), 1),
    'four trained start skills pass',
  );
}

// (8) Applied EB at level 17 (#89 table).
{
  const table = new Map([[0, 0], [1, 2], [2, 3], [3, 4], [4, 5], [5, 5]]);
  for (const [rank, expected] of table) {
    check(rules.getSagaDriveAppliedExperienceBonus(rank, 17) === expected, `applied EB level 17 rank ${rank} → ${expected}`);
  }
}

// (9) Duplicate development slot → FAIL.
{
  const build = validBuild();
  const advances = [
    { level: 3, kind: 'rank-up', skill: 'melee' },
    { level: 3, kind: 'rank-up', skill: 'insight' },
  ];
  check(!rules.isValidSagaDriveSkillDevelopment(build, advances, build.specializations, 5), 'duplicate rank slot rejected');
}

// (10) Rank advance + specialization in the same level → FAIL (both kinds).
{
  const build = validBuild();
  const rankUp = [{ level: 3, kind: 'rank-up', skill: 'melee' }];
  const learn = [{ level: 3, kind: 'learn', skill: 'stealth' }];
  const specAt3 = { skill: 'melee', name: 'Klingen', source: 'skill-development', acquiredAtLevel: 3 };
  check(!rules.isValidSagaDriveSkillDevelopment(build, rankUp, [...build.specializations, specAt3], 5), 'L3 rank-up + L3 spec rejected');
  check(!rules.isValidSagaDriveSkillDevelopment(build, learn, [...build.specializations, specAt3], 5), 'L3 learn + L3 spec rejected');
}

// (11) Chronological specialization prerequisites.
{
  const build = validBuild();
  // L3 learn stealth, L5 rank-up stealth → PASS.
  check(rules.isValidSagaDriveSkillDevelopment(
    build,
    [{ level: 3, kind: 'learn', skill: 'stealth' }, { level: 5, kind: 'rank-up', skill: 'stealth' }],
    build.specializations,
    5,
  ), 'L3 learn, L5 rank-up passes');

  // L3 rank-up melee, L5 spec on medicine (2nd spec needs rank 3, medicine still 2 at L5) → FAIL.
  check(!rules.isValidSagaDriveSkillDevelopment(
    build,
    [{ level: 3, kind: 'rank-up', skill: 'melee' }],
    [...build.specializations, { skill: 'medicine', name: 'Chirurgie', source: 'skill-development', acquiredAtLevel: 5 }],
    5,
  ), 'spec with too low rank at acquisition time rejected');

  // Later rank-up must not legitimize an earlier illegal specialization.
  check(!rules.isValidSagaDriveSkillDevelopment(
    build,
    [{ level: 7, kind: 'rank-up', skill: 'medicine' }],
    [...build.specializations, { skill: 'medicine', name: 'Chirurgie', source: 'skill-development', acquiredAtLevel: 5 }],
    7,
  ), 'later rank-up does not fix earlier illegal spec');

  // L3/L5 rank-ups on medicine (2→3→4 within caps), L7 spec (needs 3, has 4) → PASS.
  check(rules.isValidSagaDriveSkillDevelopment(
    build,
    [{ level: 3, kind: 'rank-up', skill: 'medicine' }, { level: 5, kind: 'rank-up', skill: 'medicine' }],
    [...build.specializations, { skill: 'medicine', name: 'Chirurgie', source: 'skill-development', acquiredAtLevel: 7 }],
    7,
  ), 'L3/L5 rank-ups, L7 valid spec passes');
}

// (11) Background spec missing → FAIL.
{
  const build = validBuild();
  build.specializations = [];
  const profile = profileFor(build);
  profile.background.specialization = undefined;
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profile, 1),
    'missing background specialization fails',
  );
}

// (12) Background specialization must bind to a background-trained skill.
{
  const build = validBuild();
  const unbound = [{ skill: 'insight', name: 'Menschenlesen', source: 'background', acquiredAtLevel: 1 }];
  check(!rules.isValidSagaDriveSkillDevelopment(build, [], unbound, 1), 'background spec on non-background-trained skill rejected');
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor({ ...build, specializations: unbound }), 1),
    'persistence rejects unbound background spec',
  );
}

// (13) Level 3 without slot → FAIL.
{
  const build = validBuild();
  check(!rules.isValidSagaDriveSkillDevelopment(build, [], build.specializations, 3), 'level 3 without slot rejected');
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), profileFor(build), 3),
    'level 3 without development slot fails',
  );
}

// (15) L3 + L5 complete → PASS.
{
  const build = validBuild();
  build.skillAdvances = [
    { level: 3, kind: 'rank-up', skill: 'melee' },
    { level: 5, kind: 'rank-up', skill: 'insight' },
  ];
  expectPass(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 5), profileFor(build), 5),
    'L3 + L5 complete passes',
  );
}

// (19) Partial update `skills`: effective combined state is validated → inconsistent FAIL.
{
  const build = validBuild();
  const storedSkills = finalSkillsFor(build, 1);
  const patchedSkills = { ...storedSkills, melee: 5 };
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, patchedSkills, profileFor(build), 1),
    'skills-only inconsistent partial update fails',
  );
}

// (17) Partial update `profile`: new provenance must match stored final skills.
{
  const build = validBuild();
  const storedSkills = finalSkillsFor(build, 1);
  const patchedProfile = profileFor({ ...build, skillAdvances: [{ level: 3, kind: 'rank-up', skill: 'melee' }] });
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, storedSkills, patchedProfile, 3),
    'profile-only partial update inconsistent with stored skills fails',
  );
}

// (18) Partial update `level`: every unlocked slot up to the new level needs exactly one
// decision — a level-5 character with only the L3 slot filled is incomplete, even when
// the final ranks still match. Lowering below existing advances keeps failing on finals.
{
  const build = validBuild();
  build.skillAdvances = [{ level: 3, kind: 'rank-up', skill: 'melee' }];
  const storedSkills = finalSkillsFor(build, 3);
  check(
    !rules.isValidSagaDriveSkillDevelopment(build, build.skillAdvances, build.specializations, 5),
    'level 5 with only a level-3 decision is rejected (unfilled L5 slot)',
  );
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, storedSkills, profileFor(build), 5),
    'level-up to 5 with an unfilled L5 slot fails even with matching finals',
  );
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, storedSkills, profileFor(build), 1),
    'level-only downgrade invalidating existing advances fails',
  );
}

// (18) Tampered final skill values → FAIL.
{
  const build = validBuild();
  const skills = { ...finalSkillsFor(build, 1), awareness: 0 };
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, skills, profileFor(build), 1),
    'inconsistent final skill values fail',
  );
}

// (22) Completely missing skill provenance → FAIL.
{
  const empty = profileFor({ backgroundSkillPoints: {}, specializations: [] });
  delete empty.freeSkillRanks;
  delete empty.skillAdvances;
  delete empty.specializations;
  delete empty.archetypeTrainingSkill;
  empty.background.backgroundSkillPoints = undefined;
  empty.background.trainedSkills = [];
  empty.background.specialization = undefined;
  const emptySkills = rules.normalizeFreeSkillRanks({});
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, emptySkills, empty, 1),
    'completely missing skill provenance fails',
  );
}

// (23) Only trainedSkills without V2 provenance → FAIL.
{
  const trainedOnly = profileFor({ backgroundSkillPoints: {}, specializations: [] });
  delete trainedOnly.freeSkillRanks;
  delete trainedOnly.skillAdvances;
  delete trainedOnly.specializations;
  delete trainedOnly.archetypeTrainingSkill;
  trainedOnly.background.backgroundSkillPoints = undefined;
  trainedOnly.background.trainedSkills = ['medicine', 'insight'];
  trainedOnly.background.specialization = undefined;
  const storedFinals = rules.normalizeFreeSkillRanks({ medicine: 4, insight: 2 });
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, storedFinals, trainedOnly, 7),
    'trainedSkills without V2 provenance fails',
  );
  const normalized = normalize.normalizeSagaDriveProfile(trainedOnly);
  check(normalized.background.trainedSkills.length === 0, 'normalization does not restore trainedSkills without backgroundSkillPoints');
  check(!('skillProvenanceStatus' in normalized), 'normalization does not emit skillProvenanceStatus');
}

// (24) Partial V2 provenance → FAIL.
{
  const build = validBuild();
  const partial = profileFor(build);
  delete partial.archetypeTrainingSkill;
  partial.background.backgroundSkillPoints = undefined;
  expectThrow(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, finalSkillsFor(build, 1), partial, 1),
    'partial V2 provenance fails',
  );
}

// (25) Valid save/load roundtrip at level 7 with advances + development spec → PASS.
{
  const build = validBuild();
  build.skillAdvances = [{ level: 3, kind: 'rank-up', skill: 'medicine' }, { level: 5, kind: 'rank-up', skill: 'melee' }];
  build.specializations = [
    ...build.specializations,
    { skill: 'medicine', name: 'Chirurgie', source: 'skill-development', acquiredAtLevel: 7 },
  ];
  const skills = finalSkillsFor(build, 7);
  const profile = profileFor(build);
  expectPass(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, skills, profile, 7),
    'valid level-7 roundtrip passes',
  );
  const reloaded = normalize.normalizeSagaDriveProfile(profile);
  expectPass(
    () => persistence.assertValidSagaDriveCharacterPersistence(ATTRS, normalize.normalizeSkills(skills), reloaded, 7),
    'normalized complete V2 profile still passes',
  );
  check(!('skillProvenanceStatus' in reloaded), 'roundtrip does not persist skillProvenanceStatus');
  check(
    reloaded.background.trainedSkills.length === 2 && reloaded.background.trainedSkills.every((skill) => skill === 'medicine'),
    'trainedSkills is derived from backgroundSkillPoints (+2 medicine)',
  );
}

// Cascade sanitize: removing an earlier slot prunes dependent later slots, keeps independent ones.
{
  const build = validBuild();
  const advances = [
    { level: 3, kind: 'learn', skill: 'stealth' },
    { level: 5, kind: 'rank-up', skill: 'stealth' },
    { level: 7, kind: 'rank-up', skill: 'melee' },
  ];
  const withoutL3 = advances.filter((entry) => entry.level !== 3);
  const sanitized = rules.sanitizeSagaDriveSkillDevelopment(build, withoutL3, build.specializations, 7);
  check(!sanitized.advances.some((entry) => entry.level === 5 && entry.skill === 'stealth'), 'dependent later rank-up pruned');
  check(sanitized.advances.some((entry) => entry.level === 7 && entry.skill === 'melee'), 'independent later slot kept');
  // Safe resolve never throws on the broken chain.
  const ranks = rules.resolveSagaDriveSkillRanksSafe({ ...build, skillAdvances: withoutL3 }, 7);
  check(ranks.stealth === 0 && ranks.melee === 3, 'safe resolve prunes instead of throwing');
}

if (failures > 0) {
  console.error(`Skill progression domain behavior check failed (${failures} case(s)).`);
  process.exit(1);
}
console.log('Skill progression domain behavior check passed.');
