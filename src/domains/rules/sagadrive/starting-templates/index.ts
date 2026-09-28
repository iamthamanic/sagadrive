/**
 * starting-templates — public barrel for SagaDrive Level-1 start builds (#463).
 * Location: src/domains/rules/sagadrive/starting-templates/index.ts
 */

export { sagaDriveStartingTemplates } from './catalog';
export {
  SAGA_DRIVE_STARTING_TEMPLATE_KEYS,
  isSagaDriveStartingTemplateKey,
  type SagaDriveStartingTemplate,
  type SagaDriveStartingTemplateKey,
  type SagaDriveStartingTemplateSkillBuild,
} from './types';
export {
  getSagaDriveStartingTemplate,
  listSagaDriveStartingTemplates,
  validateSagaDriveStartingTemplate,
  validateSagaDriveStartingTemplateCatalog,
  type SagaDriveStartingTemplateValidation,
} from './validate';
