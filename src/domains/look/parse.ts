/**
 * Look domain parsers — fail-closed for unknown persisted values (#339).
 * Location: src/domains/look/parse.ts
 */

import {
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
  type LookProfile,
  type LookProfileVersion,
  type LookReference,
  type LookReferenceKind,
  type LookReservedCapability,
  type LookScope,
  type LookSource,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function isLookSource(value: string): value is LookSource {
  return (LOOK_SOURCES as readonly string[]).includes(value);
}

export function isLookExecutionMode(value: string): value is LookExecutionMode {
  return (LOOK_EXECUTION_MODES as readonly string[]).includes(value);
}

export function isLookCapability(value: string): value is LookCapability {
  return (LOOK_CAPABILITIES as readonly string[]).includes(value);
}

export function isLookFunctionalCapability(
  value: string,
): value is LookFunctionalCapability {
  return (LOOK_FUNCTIONAL_CAPABILITIES as readonly string[]).includes(value);
}

export function isLookReservedCapability(
  value: string,
): value is LookReservedCapability {
  return (LOOK_RESERVED_CAPABILITIES as readonly string[]).includes(value);
}

export function isLookScope(value: string): value is LookScope {
  return (LOOK_SCOPES as readonly string[]).includes(value);
}

export function isLookReferenceKind(value: string): value is LookReferenceKind {
  return (LOOK_REFERENCE_KINDS as readonly string[]).includes(value);
}

/**
 * Parse a single capability. Unknown values return null (do not throw) so
 * resolution / catalog reads stay fail-closed without crashing.
 */
export function parseLookCapability(value: unknown): LookCapability | null {
  if (typeof value !== 'string') return null;
  return isLookCapability(value) ? value : null;
}

export function parseLookCapabilities(value: unknown): LookCapability[] {
  if (!Array.isArray(value)) return [];
  const out: LookCapability[] = [];
  for (const item of value) {
    const parsed = parseLookCapability(item);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

export function parseLookSource(value: unknown): LookSource | null {
  if (typeof value !== 'string') return null;
  return isLookSource(value) ? value : null;
}

export function parseLookExecutionMode(value: unknown): LookExecutionMode | null {
  if (typeof value !== 'string') return null;
  return isLookExecutionMode(value) ? value : null;
}

export function parseLookExecutionModes(value: unknown): LookExecutionMode[] {
  if (!Array.isArray(value)) return [];
  const out: LookExecutionMode[] = [];
  for (const item of value) {
    const parsed = parseLookExecutionMode(item);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

export function parseLookScope(value: unknown): LookScope | null {
  if (typeof value !== 'string') return null;
  return isLookScope(value) ? value : null;
}

export function parseLookReference(value: unknown): LookReference | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (!isNonEmptyString(value.uri)) return null;
  if (typeof value.kind !== 'string' || !isLookReferenceKind(value.kind)) {
    return null;
  }
  const label =
    typeof value.label === 'string' && value.label.length > 0
      ? value.label
      : undefined;
  let weight: number | undefined;
  if (value.weight !== undefined) {
    if (typeof value.weight !== 'number' || Number.isNaN(value.weight)) {
      return null;
    }
    if (value.weight < 0 || value.weight > 1) return null;
    weight = value.weight;
  }
  return {
    id: value.id,
    kind: value.kind,
    uri: value.uri,
    ...(label !== undefined ? { label } : {}),
    ...(weight !== undefined ? { weight } : {}),
  };
}

export function parseLookReferences(value: unknown): LookReference[] {
  if (!Array.isArray(value)) return [];
  const out: LookReference[] = [];
  for (const item of value) {
    const parsed = parseLookReference(item);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

export function parseLookProfile(value: unknown): LookProfile | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id)) return null;
  if (typeof value.currentVersion !== 'number' || !Number.isInteger(value.currentVersion)) {
    return null;
  }
  if (value.currentVersion < 1) return null;
  const ownerScope = parseLookScope(value.ownerScope);
  if (ownerScope === null) return null;
  const ownerId =
    value.ownerId === null
      ? null
      : isNonEmptyString(value.ownerId)
        ? value.ownerId
        : null;
  if (value.ownerId !== null && value.ownerId !== undefined && ownerId === null) {
    return null;
  }
  return {
    id: value.id,
    currentVersion: value.currentVersion,
    ownerScope,
    ownerId,
  };
}

export function parseLookProfileVersion(value: unknown): LookProfileVersion | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.profileId)) return null;
  if (typeof value.version !== 'number' || !Number.isInteger(value.version)) {
    return null;
  }
  if (value.version < 1) return null;
  const source = parseLookSource(value.source);
  if (source === null) return null;
  if (!isNonEmptyString(value.displayName)) return null;
  if (!isNonEmptyString(value.createdAtIso)) return null;
  const references = parseLookReferences(value.references);
  const capabilities = parseLookCapabilities(value.capabilities);
  const executionModes = parseLookExecutionModes(value.executionModes);
  if (executionModes.length === 0) return null;
  return {
    profileId: value.profileId,
    version: value.version,
    source,
    displayName: value.displayName,
    references,
    capabilities,
    executionModes,
    createdAtIso: value.createdAtIso,
  };
}
