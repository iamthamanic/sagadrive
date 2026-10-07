/**
 * starting-templates validate — fail-closed catalog checks against rules kernel (#463).
 * Location: src/domains/rules/sagadrive/starting-templates/validate.ts
 */
import { isValidSagaDriveBaseAttributeDistribution } from '../attribute-progression';
import { getSagaDriveBackgroundTemplate } from '../background-templates';
import {
  SAGA_DRIVE_START_ATTRIBUTE_ARRAY,
  getSagaDriveSkill,
} from '../character-creation';
import {
  isValidSagaDriveSkillDevelopment,
  isValidStartSkillBuild,
} from '../skill-progression';
import { sagaDriveStartingTemplates } from './catalog';
import {
  SAGA_DRIVE_STARTING_TEMPLATE_KEYS,
  type SagaDriveStartingTemplate,
  type SagaDriveStartingTemplateKey,
} from './types';

export type SagaDriveStartingTemplateValidation =
  | { readonly ok: true; readonly template: SagaDriveStartingTemplate }
  | { readonly ok: false; readonly code: string; readonly message: string };

function attributeValuesMatchStartArray(template: SagaDriveStartingTemplate): boolean {
  const values = [
    template.attributes.strength,
    template.attributes.dexterity,
    template.attributes.endurance,
    template.attributes.mind,
    template.attributes.perception,
    template.attributes.charisma,
  ].sort((a, b) => b - a);
  const expected = [...SAGA_DRIVE_START_ATTRIBUTE_ARRAY].sort((a, b) => b - a);
  return values.every((value, index) => value === expected[index]);
}

export function validateSagaDriveStartingTemplate(
  template: SagaDriveStartingTemplate,
): SagaDriveStartingTemplateValidation {
  if (!template.labelDe.trim() || !template.summaryDe.trim()) {
    return {
      ok: false,
      code: 'starting-template-copy',
      message: `${template.key}: labelDe and summaryDe are required`,
    };
  }

  if (!isValidSagaDriveBaseAttributeDistribution(template.attributes)) {
    return {
      ok: false,
      code: 'starting-template-attributes',
      message: `${template.key}: attributes must sum to 15 with start cap 4`,
    };
  }
  if (!attributeValuesMatchStartArray(template)) {
    return {
      ok: false,
      code: 'starting-template-attribute-array',
      message: `${template.key}: attributes must be a permutation of [4,3,3,2,2,1]`,
    };
  }

  const background = getSagaDriveBackgroundTemplate(template.backgroundTemplateId);
  if (!background) {
    return {
      ok: false,
      code: 'starting-template-background',
      message: `${template.key}: unknown background ${template.backgroundTemplateId}`,
    };
  }

  const skillBuild = {
    freeSkillRanks: template.freeSkillRanks,
    backgroundSkillPoints: template.backgroundSkillPoints,
    archetypeTrainingSkill: template.archetypeTrainingSkill,
  };

  if (!isValidStartSkillBuild(skillBuild, background.skillPool, template.archetype)) {
    return {
      ok: false,
      code: 'starting-template-skills',
      message: `${template.key}: skill build fails 7/2/1 or pool/cap rules`,
    };
  }

  const specs = [template.backgroundSpecialization];
  if (
    template.backgroundSpecialization.source !== 'background'
    || template.backgroundSpecialization.acquiredAtLevel !== 1
  ) {
    return {
      ok: false,
      code: 'starting-template-spec-meta',
      message: `${template.key}: specialization must be background @ level 1`,
    };
  }

  // Spec name must exist on the skill catalog (reuse existing specializations).
  try {
    const skillDef = getSagaDriveSkill(template.backgroundSpecialization.skill);
    if (!skillDef.specializations.includes(template.backgroundSpecialization.name)) {
      return {
        ok: false,
        code: 'starting-template-spec-name',
        message: `${template.key}: unknown specialization "${template.backgroundSpecialization.name}"`,
      };
    }
  } catch {
    return {
      ok: false,
      code: 'starting-template-spec-skill',
      message: `${template.key}: invalid specialization skill`,
    };
  }

  if (!isValidSagaDriveSkillDevelopment(skillBuild, [], specs, 1)) {
    return {
      ok: false,
      code: 'starting-template-development',
      message: `${template.key}: skill development / background specialization invalid`,
    };
  }

  return { ok: true, template };
}

export function validateSagaDriveStartingTemplateCatalog(
  templates: readonly SagaDriveStartingTemplate[] = sagaDriveStartingTemplates,
): SagaDriveStartingTemplateValidation {
  if (templates.length !== SAGA_DRIVE_STARTING_TEMPLATE_KEYS.length) {
    return {
      ok: false,
      code: 'starting-template-count',
      message: `expected ${SAGA_DRIVE_STARTING_TEMPLATE_KEYS.length} templates, got ${templates.length}`,
    };
  }

  const seen = new Set<string>();
  for (const expected of SAGA_DRIVE_STARTING_TEMPLATE_KEYS) {
    const template = templates.find((entry) => entry.key === expected);
    if (!template) {
      return {
        ok: false,
        code: 'starting-template-missing',
        message: `missing template key ${expected}`,
      };
    }
    if (seen.has(template.key)) {
      return {
        ok: false,
        code: 'starting-template-duplicate',
        message: `duplicate key ${template.key}`,
      };
    }
    seen.add(template.key);
    const result = validateSagaDriveStartingTemplate(template);
    if (!result.ok) return result;
  }

  return { ok: true, template: templates[0]! };
}

export function getSagaDriveStartingTemplate(
  key: SagaDriveStartingTemplateKey | string,
): SagaDriveStartingTemplate | null {
  const template = sagaDriveStartingTemplates.find((entry) => entry.key === key);
  return template ?? null;
}

export function listSagaDriveStartingTemplates(): readonly SagaDriveStartingTemplate[] {
  return sagaDriveStartingTemplates;
}
