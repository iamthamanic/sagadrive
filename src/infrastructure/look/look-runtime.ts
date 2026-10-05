/**
 * look-runtime — Provider-neutral Look apply/restore orchestrator (#342).
 * Location: src/infrastructure/look/look-runtime.ts
 *
 * Selects host-mtoon by default; ToonLab adapter is consulted only when available.
 * AvatarCanvas / domains must not import ToonLab.
 */
import type { LookExecutionMode, LookProfileVersion } from '../../domains/look/types';
import { createHostMtoonLookAdapter } from './adapters/host-mtoon-look-adapter';
import { createToonLabLookAdapter } from './adapters/toonlab-look-adapter';
import type {
  LookRuntimeApplyResult,
  LookRuntimeTarget,
  LookStyleAdapter,
  LookStyleProviderId,
} from './look-runtime-types';

export type LookRuntimeOptions = {
  readonly preferProvider?: LookStyleProviderId;
  readonly hostAdapter?: LookStyleAdapter;
  readonly toonLabAdapter?: LookStyleAdapter;
};

export class LookRuntime {
  private readonly host: LookStyleAdapter;
  private readonly toonLab: LookStyleAdapter;
  private readonly preferProvider: LookStyleProviderId;
  private lastResult: LookRuntimeApplyResult | null = null;

  constructor(options: LookRuntimeOptions = {}) {
    this.host = options.hostAdapter ?? createHostMtoonLookAdapter();
    this.toonLab = options.toonLabAdapter ?? createToonLabLookAdapter();
    this.preferProvider = options.preferProvider ?? 'host-mtoon';
  }

  getLastResult(): LookRuntimeApplyResult | null {
    return this.lastResult;
  }

  selectAdapter(executionMode: LookExecutionMode): LookStyleAdapter {
    if (
      this.preferProvider === 'toonlab' &&
      this.toonLab.isAvailable() &&
      executionMode === 'rendered'
    ) {
      return this.toonLab;
    }
    // Realtime avatar preview stays on host WebGL/MToon until spike GO.
    if (this.toonLab.isAvailable() && this.preferProvider === 'toonlab') {
      return this.toonLab;
    }
    return this.host;
  }

  restorePbrNeutral(target: LookRuntimeTarget): LookRuntimeApplyResult {
    const result = this.host.restoreBaseline(target);
    this.lastResult = result;
    return result;
  }

  applyLookProfile(
    version: LookProfileVersion,
    target: LookRuntimeTarget,
    executionMode: LookExecutionMode = 'realtime',
  ): LookRuntimeApplyResult {
    const mode =
      version.executionModes.includes(executionMode)
        ? executionMode
        : (version.executionModes[0] ?? 'realtime');
    const adapter = this.selectAdapter(mode);
    if (!adapter.isAvailable()) {
      // Fail soft to host so preview still works when ToonLab is preferred but blocked.
      const fallback = this.host.apply({ version, target, executionMode: mode });
      this.lastResult = {
        ...fallback,
        noticeDe:
          adapter.unavailableReasonDe ??
          'Bevorzugter Look-Provider nicht verfügbar — Host-MToon verwendet.',
        status: fallback.status === 'applied' ? 'partial' : fallback.status,
      };
      return this.lastResult;
    }
    const result = adapter.apply({ version, target, executionMode: mode });
    this.lastResult = result;
    return result;
  }
}

export function createLookRuntime(options?: LookRuntimeOptions): LookRuntime {
  return new LookRuntime(options);
}
