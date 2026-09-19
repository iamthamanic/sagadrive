/**
 * resource-id domain barrel — Public Resource ID contract (#276).
 * Location: src/domains/resource-id/index.ts
 */
export {
  PUBLIC_ID_ALPHABET,
  PUBLIC_RESOURCE_PREFIXES,
  RESERVED_PUBLIC_RESOURCE_PREFIXES,
  assertPublicResourceId,
  formatPublicResourceId,
  generatePublicIdBody,
  generatePublicResourceId,
  isPublicResourcePrefix,
  isValidPublicIdBody,
  isValidPublicResourceId,
  parsePublicResourceId,
  publicResourceKindForPrefix,
  type ParsedPublicResourceId,
  type PublicResourceKind,
  type PublicResourcePrefix,
} from './public-resource-id';

export {
  decideScreenOrModal,
  type ScreenOrModalDecision,
  type ScreenOrModalSignals,
} from './screen-vs-modal';

export {
  authorizeLivePlayerCharacter,
  resolveLiveEntryPath,
  resolveNeutralSessionPhase,
  type LiveSessionRole,
  type LiveViewTarget,
  type ProjectSessionLifecycleStatus,
  type SessionLifecyclePhase,
} from './session-routing';
