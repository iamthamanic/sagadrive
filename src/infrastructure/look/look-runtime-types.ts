/**
 * look-runtime-types — Provider-neutral LookRuntime contracts (#342).
 * Location: src/infrastructure/look/look-runtime-types.ts
 *
 * Infrastructure only. No React. Domains/look must not import ToonLab.
 */
import type {
  LookCapability,
  LookExecutionMode,
  LookProfileVersion,
} from '../../domains/look/types';

/** Named baseline mode that restores load-time materials/maps. */
export type LookRuntimeBaselineMode = 'pbr-neutral';

export type LookStyleProviderId = 'host-mtoon' | 'toonlab' | 'none';

export type LookMaterialRole =
  | 'skin'
  | 'hair'
  | 'eyes'
  | 'cloth'
  | 'leather'
  | 'metal'
  | 'cybernetic'
  | 'unclassified';

export type LookRuntimeApplyStatus =
  | 'applied'
  | 'partial'
  | 'restored'
  | 'unsupported'
  | 'blocked';

export type LookCapabilityApplyResult = {
  readonly capability: LookCapability;
  readonly status: LookRuntimeApplyStatus;
  readonly noticeDe: string | null;
};

export type LookRuntimeApplyResult = {
  readonly status: LookRuntimeApplyStatus;
  readonly providerId: LookStyleProviderId;
  readonly profileId: string | null;
  readonly version: number | null;
  readonly executionMode: LookExecutionMode | null;
  readonly capabilities: readonly LookCapabilityApplyResult[];
  readonly noticeDe: string | null;
};

export type LookRuntimeTarget = {
  readonly root: unknown;
  readonly scene: unknown;
  readonly styleLights: unknown;
  /** Load-time material snapshots — restore before every apply. */
  readonly materialSnapshots: unknown;
  readonly isImportModel: boolean;
  readonly colors: {
    readonly skin?: string;
    readonly hair?: string;
    readonly clothing?: string;
    readonly eyes?: string;
  };
};

export type LookStyleAdapter = {
  readonly id: LookStyleProviderId;
  readonly isAvailable: () => boolean;
  readonly unavailableReasonDe: string | null;
  readonly apply: (input: {
    readonly version: LookProfileVersion;
    readonly target: LookRuntimeTarget;
    readonly executionMode: LookExecutionMode;
  }) => LookRuntimeApplyResult;
  readonly restoreBaseline: (target: LookRuntimeTarget) => LookRuntimeApplyResult;
};
