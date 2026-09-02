#!/usr/bin/env node
/**
 * Skill progression v2 domain regression — static contracts + behavioral self-test.
 * Location: scripts/skill-progression-regression-check.mjs
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import './skill-progression.self-test.mjs';
import './skill-progression-domain-check.mjs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function requireMatch(content, pattern, label) {
  if (!pattern.test(content)) {
    console.error(`Skill progression regression check failed: missing ${label}.`);
    process.exit(1);
  }
}

function forbidMatch(content, pattern, label) {
  if (pattern.test(content)) {
    console.error(`Skill progression regression check failed: forbidden ${label}.`);
    process.exit(1);
  }
}

const rules = read('src/domains/rules/sagadrive/skill-progression/index.ts');
const assertPersistence = read('src/domains/character/use-cases/assert-character-persistence.ts');
const normalize = read('src/domains/character/use-cases/normalize-character.ts');
const derived = read('src/domains/rules/sagadrive/derived-stats/compute-derived-stats.ts');
const repository = read('src/infrastructure/character/supabase-character.repository.ts');

requireMatch(rules, /SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS = 2/, 'two background skill points');
requireMatch(rules, /SAGA_DRIVE_SKILL_ADVANCE_LEVELS = \[3, 5, 7, 9, 11, 13, 15, 17, 19\]/, 'skill advance levels');
requireMatch(rules, /export function getSagaDriveExperienceBonus/, 'global experience bonus helper');
requireMatch(rules, /export function getSagaDriveAppliedExperienceBonus/, 'applied experience bonus helper');
requireMatch(rules, /Math\.min\(getSagaDriveExperienceBonus\(level\), rank \+ 1\)/, 'applied EB formula');
requireMatch(rules, /export function getSagaDriveSkillCap/, 'skill cap helper');
requireMatch(rules, /export function normalizeLegacyBackgroundSkillPoints/, 'legacy trainedSkills migration');
requireMatch(rules, /result\[skill\] = 1/, 'legacy maps each trained skill to +1');
requireMatch(rules, /export function resolveSagaDriveSkillRanks/, 'full rank resolution');
requireMatch(rules, /export function assertSagaDriveSkillPersistence/, 'fail-closed persistence assert');
requireMatch(rules, /SAGA_DRIVE_SPECIALIZATION_BONUS = 2/, 'situational specialization bonus constant');
requireMatch(rules, /export function isValidSagaDriveSkillDevelopment/, 'chronological one-decision-per-slot validation');
requireMatch(rules, /export function sanitizeSagaDriveSkillDevelopment/, 'deterministic dependent-slot prune');
requireMatch(rules, /export function resolveSagaDriveSkillRanksSafe/, 'non-throwing editor rank resolution');
requireMatch(rules, /skillPool\.length !== 4/, 'background framework pool of exactly four');
forbidMatch(rules, /provenanceStatus === 'legacy-unresolved'\)\s*return/, 'client-controlled legacy validation bypass');
forbidMatch(rules, /skillProvenanceStatus === 'complete'\) return true/, 'client-controlled complete shortcut');

requireMatch(assertPersistence, /assertValidSagaDriveSkillPersistence/, 'skill persistence guard');
requireMatch(assertPersistence, /assertValidSagaDriveCharacterPersistence/, 'combined character persistence guard');
forbidMatch(assertPersistence, /profile\.skillProvenanceStatus \?\?/, 'client provenance status override');
requireMatch(normalize, /backgroundSkillPoints/, 'background skill points normalization');
requireMatch(normalize, /normalizeFreeSkillRanks/, 'free skill ranks normalization');
requireMatch(derived, /getSagaDriveAppliedExperienceBonus/, 'initiative uses applied EB');
requireMatch(repository, /assertValidSagaDriveCharacterPersistence/, 'repository enforces skill persistence');
requireMatch(repository, /touchesSagaDriveState/, 'partial updates validate the effective combined state');

console.log('Skill progression regression check passed.');
