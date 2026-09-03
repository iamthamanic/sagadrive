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
const creation = read('src/domains/rules/sagadrive/character-creation/index.ts');
const assertPersistence = read('src/domains/character/use-cases/assert-character-persistence.ts');
const normalize = read('src/domains/character/use-cases/normalize-character.ts');
const derived = read('src/domains/rules/sagadrive/derived-stats/compute-derived-stats.ts');
const repository = read('src/infrastructure/character/supabase-character.repository.ts');
const presetService = read('src/modules/characters/services/characterPreset.service.ts');
const domainCheck = read('scripts/skill-progression-domain-check.mjs');

requireMatch(rules, /SAGA_DRIVE_START_BACKGROUND_SKILL_POINTS = 2/, 'two background skill points');
requireMatch(rules, /SAGA_DRIVE_SKILL_ADVANCE_LEVELS = \[3, 5, 7, 9, 11, 13, 15, 17, 19\]/, 'skill advance levels');
requireMatch(rules, /export function getSagaDriveExperienceBonus/, 'global experience bonus helper');
requireMatch(rules, /export function getSagaDriveAppliedExperienceBonus/, 'applied experience bonus helper');
requireMatch(rules, /Math\.min\(getSagaDriveExperienceBonus\(level\), rank \+ 1\)/, 'applied EB formula');
requireMatch(rules, /export function getSagaDriveSkillCap/, 'skill cap helper');
requireMatch(rules, /export function resolveSagaDriveSkillRanks/, 'full rank resolution');
requireMatch(rules, /export function assertSagaDriveSkillPersistence/, 'fail-closed persistence assert');
requireMatch(rules, /if \(!archetypeKey\) return false/, 'archetype key mandatory on complete start builds');
requireMatch(rules, /!build\.archetypeTrainingSkill \|\| !archetype\.skills\.includes\(build\.archetypeTrainingSkill\)/, 'archetype training skill must belong to archetype');
forbidMatch(rules, /legacy-unresolved/, 'legacy-unresolved provenance status remains');
forbidMatch(rules, /normalizeLegacyBackgroundSkillPoints/, 'legacy trainedSkills migration helper remains');
forbidMatch(rules, /hasCompleteSkillProvenance/, 'OR-of-partials provenance helper remains');
forbidMatch(rules, /provenanceStatus/, 'skill provenance status field remains');
forbidMatch(rules, /SagaDriveSkillProvenanceStatus/, 'skill provenance status type remains');
requireMatch(rules, /SAGA_DRIVE_SPECIALIZATION_BONUS = 2/, 'situational specialization bonus constant');
requireMatch(rules, /export function isValidSagaDriveSkillDevelopment/, 'chronological one-decision-per-slot validation');
requireMatch(rules, /for \(const unlockedLevel of getSagaDriveSkillAdvanceLevels\(normalizedLevel\)\)/, 'every unlocked development slot must hold one decision');
requireMatch(rules, /export function sanitizeSagaDriveSkillDevelopment/, 'deterministic dependent-slot prune');
requireMatch(rules, /if \(spec\.acquiredAtLevel !== 1\) return false/, 'background spec must be acquired at level 1');
requireMatch(rules, /if \(spec\.acquiredAtLevel !== 1\) continue/, 'sanitizer drops background spec not acquired at level 1');
requireMatch(rules, /export function resolveSagaDriveSkillRanksSafe/, 'non-throwing editor rank resolution');
requireMatch(rules, /skillPool\.length !== 4/, 'background framework pool of exactly four');
forbidMatch(rules, /if \(build\.provenanceStatus !== 'complete'\)/, 'legacy provenance persistence bypass');

requireMatch(assertPersistence, /assertValidSagaDriveSkillPersistence/, 'skill persistence guard');
requireMatch(assertPersistence, /assertValidSagaDriveCharacterPersistence/, 'combined character persistence guard');
forbidMatch(assertPersistence, /trainedSkills:/, 'persistence still reads trainedSkills as a skill source');
forbidMatch(assertPersistence, /skillProvenanceStatus/, 'client provenance status override');
requireMatch(normalize, /backgroundSkillPoints/, 'background skill points normalization');
requireMatch(normalize, /normalizeFreeSkillRanks/, 'free skill ranks normalization');
forbidMatch(normalize, /skillProvenanceStatus/, 'normalization still copies skillProvenanceStatus');
forbidMatch(normalize, /value\?\.trainedSkills/, 'normalization still restores trainedSkills as a source');
requireMatch(derived, /getSagaDriveAppliedExperienceBonus/, 'initiative uses applied EB');
requireMatch(repository, /assertValidSagaDriveCharacterPersistence/, 'repository enforces skill persistence');
requireMatch(repository, /touchesSagaDriveState/, 'partial updates validate the effective combined state');
requireMatch(presetService, /assertValidSagaDriveCharacterPersistence/, 'preset snapshots use central character persistence');
forbidMatch(presetService, /SAGA_DRIVE_START_MIN_TRAINED_SKILLS/, 'preset service still imports min-trained-skills constant');
forbidMatch(presetService, /trainedCount/, 'preset service still counts distinct trained skills');
forbidMatch(presetService, /mindestens 6/, 'preset service still enforces minimum 6 trained skills');
forbidMatch(creation, /SAGA_DRIVE_START_MIN_TRAINED_SKILLS/, 'catalog still exports leftover min-6 trained-skills constant');
forbidMatch(domainCheck, /SAGA_DRIVE_START_MIN_TRAINED_SKILLS/, 'domain check still references leftover min-6 constant');
requireMatch(domainCheck, /fourSkillStackedBuild/, 'legal V2 with fewer than 6 trained skills is covered');
requireMatch(domainCheck, /stacked four-skill V2 passes preset snapshot validation/, 'preset accepts legal four-skill V2');
requireMatch(domainCheck, /generated preset snapshot has no top-level freeSkillRanks/, 'preset snapshot omits parallel freeSkillRanks');
requireMatch(domainCheck, /preset rejects missing profile\.freeSkillRanks even with top-level freeSkillRanks/, 'top-level freeSkillRanks cannot rescue missing profile ranks');
requireMatch(domainCheck, /preset rejects manipulated final skills/, 'preset rejects tampered finals');
requireMatch(domainCheck, /background spec at level 19 fails persistence/, 'background spec level 19 is fail-closed');
requireMatch(domainCheck, /sanitizer does not keep background spec acquiredAtLevel 19 as valid V2 state/, 'sanitizer discards invalid background spec');
forbidMatch(presetService, /value\.freeSkillRanks/, 'preset normalizeSnapshot still reads top-level freeSkillRanks');

console.log('Skill progression regression check passed.');
