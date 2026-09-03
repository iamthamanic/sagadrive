#!/usr/bin/env node
/**
 * Behavioral self-test for skill-progression domain rules (Issue #90).
 * Location: scripts/skill-progression.self-test.mjs
 */
import process from 'node:process';

function assert(condition, message) {
  if (!condition) {
    console.error(`Skill progression self-test failed: ${message}`);
    process.exit(1);
  }
}

function experienceBonus(level) {
  if (level <= 4) return 1;
  if (level <= 8) return 2;
  if (level <= 12) return 3;
  if (level <= 16) return 4;
  return 5;
}

function appliedEb(rank, level) {
  if (rank <= 0) return 0;
  return Math.min(experienceBonus(level), rank + 1);
}

function skillCap(level) {
  if (level <= 4) return 3;
  if (level <= 12) return 4;
  return 5;
}

function startRanks({ free, background, archetype }) {
  const keys = ['medicine', 'insight', 'persuasion', 'awareness'];
  const ranks = Object.fromEntries(keys.map((key) => [key, 0]));
  for (const [skill, value] of Object.entries(free)) ranks[skill] = (ranks[skill] ?? 0) + value;
  for (const [skill, value] of Object.entries(background)) ranks[skill] = (ranks[skill] ?? 0) + value;
  if (archetype) ranks[archetype] = (ranks[archetype] ?? 0) + 1;
  return ranks;
}

// Global EB bands
assert(experienceBonus(1) === 1, 'EB level 1-4');
assert(experienceBonus(17) === 5, 'EB level 17-20');

// Applied EB at level 17 (#89 examples)
assert(appliedEb(0, 17) === 0, 'rank 0 applied EB');
assert(appliedEb(1, 17) === 2, 'rank 1 applied EB');
assert(appliedEb(2, 17) === 3, 'rank 2 applied EB');
assert(appliedEb(3, 17) === 4, 'rank 3 applied EB');
assert(appliedEb(4, 17) === 5, 'rank 4 applied EB');
assert(appliedEb(5, 17) === 5, 'rank 5 applied EB cap');

// Skill caps
assert(skillCap(1) === 3, 'start cap');
assert(skillCap(5) === 4, 'mid cap');
assert(skillCap(17) === 5, 'high cap');

// Start sources: medicine +2 background, +1 archetype → 3
const levelOne = startRanks({
  free: {},
  background: { medicine: 2 },
  archetype: 'medicine',
});
assert(levelOne.medicine === 3, 'stacked background + archetype');

// Stacked +2 only on one skill
const stacked = startRanks({ free: {}, background: { medicine: 2 }, archetype: undefined });
assert(stacked.medicine === 2, 'background +2 alone');

console.log('Skill progression self-test passed.');
