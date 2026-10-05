/**
 * toonlab-look-adapter — Stub LookStyleAdapter while ToonLab spike is BLOCKED (#342 / #341).
 * Location: src/infrastructure/look/adapters/toonlab-look-adapter.ts
 *
 * Does NOT import or depend on `@call-me-sensei/toonlab`. Unblock path lives in
 * `toonlab-compatibility-spike.ts` minimalIntegrationPath.
 */
import { evaluateToonLabCompatibilitySpike } from '../../character/avatar/toonlab-compatibility-spike';
import type { LookRuntimeApplyResult, LookStyleAdapter } from '../look-runtime-types';

const BLOCKED_DE =
  'ToonLab ist auf dem aktuellen WebGL/MToon-Stack blockiert (three/VRM-Peers + WebGPU/TSL). Kein stilles Upgrade.';

function blockedResult(profileId: string | null, version: number | null): LookRuntimeApplyResult {
  return {
    status: 'blocked',
    providerId: 'toonlab',
    profileId,
    version,
    executionMode: null,
    capabilities: [],
    noticeDe: BLOCKED_DE,
  };
}

export function createToonLabLookAdapter(): LookStyleAdapter {
  const decision = evaluateToonLabCompatibilitySpike();
  const available = decision.verdict === 'GO';

  return {
    id: 'toonlab',
    isAvailable: () => available,
    unavailableReasonDe: available ? null : BLOCKED_DE,
    apply: ({ version }) => blockedResult(version.profileId, version.version),
    restoreBaseline: () => blockedResult(null, null),
  };
}
