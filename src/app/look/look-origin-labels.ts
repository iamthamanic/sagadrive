/**
 * look-origin-labels — DE labels for LookResolutionResult.reason (#347).
 * Location: src/app/look/look-origin-labels.ts
 */
import type { LookResolutionResult } from '../../domains/look';

export const LOOK_ORIGIN_LABELS_DE: Record<LookResolutionResult['reason'], string> = {
  'personal-override': 'Persönlich',
  'session-override': 'Session',
  'saga-default': 'Saga',
  'system-default': 'System',
};

export function lookOriginLabelDe(reason: LookResolutionResult['reason']): string {
  return LOOK_ORIGIN_LABELS_DE[reason] ?? reason;
}
