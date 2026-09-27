/**
 * Look domain invariants — reference kind semantics and version rules (#339).
 * Location: src/domains/look/invariants.ts
 */

import type { LookProfileVersion, LookReference } from './types';
import { isLookFunctionalCapability, isLookReservedCapability } from './parse';

export type LookInvariantResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly message: string };

/**
 * Style and content references must keep distinct kinds.
 * A style URI must not be labeled content and vice versa when both are present
 * with the same id (identity collision across kinds).
 */
export function assertLookReferenceKindSemantics(
  references: readonly LookReference[],
): LookInvariantResult {
  const byId = new Map<string, LookReference>();
  for (const ref of references) {
    const existing = byId.get(ref.id);
    if (existing && existing.kind !== ref.kind) {
      return {
        ok: false,
        code: 'look-reference-kind-collision',
        message: `LookReference id "${ref.id}" cannot be both style and content`,
      };
    }
    byId.set(ref.id, ref);
  }
  return { ok: true };
}

/**
 * Capabilities may mix functional + reserved. Unknowns are already stripped by
 * parse; this checks that remaining values are classified.
 */
export function assertLookCapabilitiesSupported(
  version: LookProfileVersion,
): LookInvariantResult {
  for (const cap of version.capabilities) {
    if (!isLookFunctionalCapability(cap) && !isLookReservedCapability(cap)) {
      return {
        ok: false,
        code: 'look-capability-unknown',
        message: `Unsupported LookCapability: ${cap}`,
      };
    }
  }
  return { ok: true };
}

export function assertLookProfileVersionInvariants(
  version: LookProfileVersion,
): LookInvariantResult {
  if (version.executionModes.length === 0) {
    return {
      ok: false,
      code: 'look-execution-mode-required',
      message: 'LookProfileVersion requires at least one LookExecutionMode',
    };
  }
  const refCheck = assertLookReferenceKindSemantics(version.references);
  if (!refCheck.ok) return refCheck;
  return assertLookCapabilitiesSupported(version);
}
