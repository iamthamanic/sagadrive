/**
 * Look write-draft validation — structured data only, no provider blobs (#340).
 * Location: src/domains/look/write-draft.ts
 */

import {
  assertLookProfileVersionInvariants,
  type LookInvariantResult,
} from './invariants';
import {
  isLookCapability,
  isLookExecutionMode,
  isLookReferenceKind,
  isLookScope,
  isLookSource,
} from './parse';
import type {
  LookCapability,
  LookExecutionMode,
  LookProfileWriteDraft,
  LookReference,
  LookScope,
  LookSource,
} from './types';

const FORBIDDEN_PROVIDER_KEYS = [
  'toonlab',
  'toonLab',
  'ToonLab',
  'providerRaw',
  'providerBlob',
  'rawProvider',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectProviderKeys(value: unknown, path: string): LookInvariantResult {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const nested = rejectProviderKeys(value[i], `${path}[${i}]`);
      if (!nested.ok) return nested;
    }
    return { ok: true };
  }
  if (!isRecord(value)) return { ok: true };
  for (const key of Object.keys(value)) {
    if ((FORBIDDEN_PROVIDER_KEYS as readonly string[]).includes(key)) {
      return {
        ok: false,
        code: 'look-provider-blob-rejected',
        message: `Forbidden provider key "${key}" at ${path}`,
      };
    }
    const nested = rejectProviderKeys(value[key], `${path}.${key}`);
    if (!nested.ok) return nested;
  }
  return { ok: true };
}

function parseReference(value: unknown): LookReference | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || value.id.length === 0) return null;
  if (typeof value.uri !== 'string' || value.uri.length === 0) return null;
  if (typeof value.kind !== 'string' || !isLookReferenceKind(value.kind)) return null;
  const label =
    typeof value.label === 'string' && value.label.length > 0 ? value.label : undefined;
  let weight: number | undefined;
  if (value.weight !== undefined) {
    if (typeof value.weight !== 'number' || Number.isNaN(value.weight)) return null;
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

export type LookDraftValidationError = {
  readonly code: string;
  readonly message: string;
};

/**
 * Normalize and validate a client/write draft into a domain LookProfileWriteDraft.
 * Rejects unknown enums and nested provider blobs.
 */
export function normalizeLookProfileWriteDraft(
  raw: unknown,
):
  | { ok: true; draft: LookProfileWriteDraft }
  | { ok: false; error: LookDraftValidationError } {
  const blobCheck = rejectProviderKeys(raw, 'draft');
  if (blobCheck.ok === false) {
    return {
      ok: false,
      error: { code: blobCheck.code, message: blobCheck.message },
    };
  }
  if (!isRecord(raw)) {
    return {
      ok: false,
      error: {
        code: 'look-draft-shape',
        message: 'Look write draft must be an object',
      },
    };
  }
  if (typeof raw.displayName !== 'string' || raw.displayName.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: 'look-draft-display-name',
        message: 'displayName is required',
      },
    };
  }
  if (typeof raw.source !== 'string' || !isLookSource(raw.source)) {
    return {
      ok: false,
      error: {
        code: 'look-draft-source',
        message: 'source must be a known LookSource',
      },
    };
  }
  const source: LookSource = raw.source;
  if (!Array.isArray(raw.executionModes) || raw.executionModes.length === 0) {
    return {
      ok: false,
      error: {
        code: 'look-draft-execution-modes',
        message: 'executionModes required',
      },
    };
  }
  const executionModes: LookExecutionMode[] = [];
  for (const mode of raw.executionModes) {
    if (typeof mode !== 'string' || !isLookExecutionMode(mode)) {
      return {
        ok: false,
        error: {
          code: 'look-draft-execution-mode',
          message: `unknown executionMode: ${String(mode)}`,
        },
      };
    }
    executionModes.push(mode);
  }
  const capabilities: LookCapability[] = [];
  if (raw.capabilities !== undefined) {
    if (!Array.isArray(raw.capabilities)) {
      return {
        ok: false,
        error: {
          code: 'look-draft-capabilities',
          message: 'capabilities must be an array',
        },
      };
    }
    for (const cap of raw.capabilities) {
      if (typeof cap !== 'string' || !isLookCapability(cap)) {
        return {
          ok: false,
          error: {
            code: 'look-draft-capability',
            message: `unknown capability: ${String(cap)}`,
          },
        };
      }
      capabilities.push(cap);
    }
  }
  const references: LookReference[] = [];
  if (raw.references !== undefined) {
    if (!Array.isArray(raw.references)) {
      return {
        ok: false,
        error: {
          code: 'look-draft-references',
          message: 'references must be an array',
        },
      };
    }
    for (const ref of raw.references) {
      const parsed = parseReference(ref);
      if (parsed === null) {
        return {
          ok: false,
          error: {
            code: 'look-draft-reference',
            message: 'invalid LookReference entry',
          },
        };
      }
      references.push(parsed);
    }
  }
  let ownerScope: LookScope | undefined;
  if (raw.ownerScope !== undefined) {
    if (typeof raw.ownerScope !== 'string' || !isLookScope(raw.ownerScope)) {
      return {
        ok: false,
        error: {
          code: 'look-draft-owner-scope',
          message: 'ownerScope must be a known LookScope',
        },
      };
    }
    ownerScope = raw.ownerScope;
  }

  const draft: LookProfileWriteDraft = {
    displayName: raw.displayName.trim(),
    source,
    references,
    capabilities,
    executionModes,
    ...(ownerScope !== undefined ? { ownerScope } : {}),
  };

  const probe = assertLookProfileVersionInvariants({
    profileId: 'probe',
    version: 1,
    source: draft.source,
    displayName: draft.displayName,
    references: draft.references,
    capabilities: draft.capabilities,
    executionModes: draft.executionModes,
    createdAtIso: '1970-01-01T00:00:00.000Z',
  });
  if (probe.ok === false) {
    return {
      ok: false,
      error: { code: probe.code, message: probe.message },
    };
  }

  return { ok: true, draft };
}
