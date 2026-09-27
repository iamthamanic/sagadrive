/**
 * Look domain value types — LookProfile contracts (#339).
 * Location: src/domains/look/types.ts
 *
 * Pure TypeScript; no React, Supabase, or provider (ToonLab) types.
 */

/** How a look version was authored / obtained. */
export const LOOK_SOURCES = [
  'manual',
  'preset',
  'reference-analysis',
  'imported',
] as const;

export type LookSource = (typeof LOOK_SOURCES)[number];

/** When / how a look is executed by a future runtime. */
export const LOOK_EXECUTION_MODES = ['realtime', 'rendered'] as const;

export type LookExecutionMode = (typeof LOOK_EXECUTION_MODES)[number];

/**
 * Capabilities a look may declare.
 * Functional capabilities are supported in v1 contracts; reserved ones are
 * documented for future world renderers and must parse without crashing.
 */
export const LOOK_FUNCTIONAL_CAPABILITIES = [
  'character',
  'lighting',
  'postFx',
] as const;

export const LOOK_RESERVED_CAPABILITIES = [
  'environment',
  'sky',
  'water',
  'vegetation',
  'terrain',
  'props',
  'vfx',
] as const;

export const LOOK_CAPABILITIES = [
  ...LOOK_FUNCTIONAL_CAPABILITIES,
  ...LOOK_RESERVED_CAPABILITIES,
] as const;

export type LookFunctionalCapability =
  (typeof LOOK_FUNCTIONAL_CAPABILITIES)[number];

export type LookReservedCapability =
  (typeof LOOK_RESERVED_CAPABILITIES)[number];

export type LookCapability = (typeof LOOK_CAPABILITIES)[number];

/** Where a look assignment applies in the inheritance chain. */
export const LOOK_SCOPES = [
  'system',
  'saga',
  'session',
  'player-character',
] as const;

export type LookScope = (typeof LOOK_SCOPES)[number];

/**
 * Reference kind: style vs content must never be swapped semantically.
 * `style` = look/aesthetic reference; `content` = subject/motif reference.
 */
export const LOOK_REFERENCE_KINDS = ['style', 'content'] as const;

export type LookReferenceKind = (typeof LOOK_REFERENCE_KINDS)[number];

export type LookReference = {
  readonly id: string;
  readonly kind: LookReferenceKind;
  /** Opaque URI or library resource id — domain does not fetch. */
  readonly uri: string;
  readonly label?: string;
};

export type LookProfileVersion = {
  readonly profileId: string;
  readonly version: number;
  readonly source: LookSource;
  readonly displayName: string;
  readonly references: readonly LookReference[];
  readonly capabilities: readonly LookCapability[];
  readonly executionModes: readonly LookExecutionMode[];
  readonly createdAtIso: string;
};

export type LookProfile = {
  readonly id: string;
  readonly currentVersion: number;
  readonly ownerScope: LookScope;
  /** Optional ownership label (user/saga id) — not authorization. */
  readonly ownerId: string | null;
};

/** Inputs for deterministic look resolution. */
export type LookResolutionContext = {
  readonly systemDefaultProfileId: string;
  readonly sagaDefaultProfileId: string | null;
  readonly sessionOverrideProfileId: string | null;
  readonly personalOverrideProfileId: string | null;
  /** When false, stored personal overrides are ignored. */
  readonly playerOverridesAllowed: boolean;
};

export type LookResolutionTarget = 'world' | 'player-character';

export type LookResolutionResult = {
  readonly profileId: string;
  readonly scopeApplied: LookScope;
  readonly reason:
    | 'session-override'
    | 'personal-override'
    | 'saga-default'
    | 'system-default';
};
