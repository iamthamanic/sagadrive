/**
 * look domain barrel — LookProfile contracts & resolution (#339).
 * Location: src/domains/look/index.ts
 *
 * Pure domain: no React, no Supabase, no provider adapter types.
 */

export {
  LOOK_CAPABILITIES,
  LOOK_EXECUTION_MODES,
  LOOK_FUNCTIONAL_CAPABILITIES,
  LOOK_REFERENCE_KINDS,
  LOOK_RESERVED_CAPABILITIES,
  LOOK_SCOPES,
  LOOK_SOURCES,
  type LookCapability,
  type LookExecutionMode,
  type LookFunctionalCapability,
  LOOK_PROFILE_STATUSES,
  type LookProfile,
  type LookProfileRecord,
  type LookProfileStatus,
  type LookProfileVersion,
  type LookProfileWriteDraft,
  type LookReference,
  type LookReferenceKind,
  type LookReservedCapability,
  type LookResolutionContext,
  type LookResolutionResult,
  type LookResolutionTarget,
  type LookScope,
  type LookSource,
} from './types';

export type {
  AppendLookProfileVersionInput,
  CreateLookProfileInput,
  DuplicateLookProfileInput,
  LookProfileRepository,
} from './persistence-contracts';

export { normalizeLookProfileWriteDraft, type LookDraftValidationError } from './write-draft';

export {
  isLookCapability,
  isLookExecutionMode,
  isLookFunctionalCapability,
  isLookReferenceKind,
  isLookReservedCapability,
  isLookScope,
  isLookSource,
  parseLookCapabilities,
  parseLookCapability,
  parseLookExecutionMode,
  parseLookExecutionModes,
  parseLookProfile,
  parseLookProfileVersion,
  parseLookReference,
  parseLookReferences,
  parseLookScope,
  parseLookSource,
} from './parse';

export { resolveLookProfileId } from './resolve';

export {
  assertLookCapabilitiesSupported,
  assertLookProfileVersionInvariants,
  assertLookReferenceKindSemantics,
  type LookInvariantResult,
} from './invariants';
