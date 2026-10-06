/**
 * advanced-look-provider-registry — Pluggable Advanced Look provider registry (#355).
 * Location: src/domains/look/advanced-look-provider-registry.ts
 *
 * Hosts capability declarations only. No neural engines are registered yet —
 * negotiateAdvancedLookProvider must degrade when no capable provider exists.
 */

import type { AdvancedLookProviderCapabilities } from './advanced-adaption';

const providers = new Map<string, AdvancedLookProviderCapabilities>();

export function registerAdvancedLookProvider(
  capabilities: AdvancedLookProviderCapabilities,
): void {
  const id = capabilities.providerId?.trim();
  if (!id) {
    throw new Error('Advanced Look providerId is required');
  }
  providers.set(id, {
    providerId: id,
    supportsRendered: capabilities.supportsRendered === true,
    supportsRealtime: capabilities.supportsRealtime === true,
    supportedGuideInputs: [...capabilities.supportedGuideInputs],
  });
}

export function unregisterAdvancedLookProvider(providerId: string): void {
  providers.delete(providerId);
}

export function getAdvancedLookProvider(
  providerId: string,
): AdvancedLookProviderCapabilities | null {
  return providers.get(providerId) ?? null;
}

export function listAdvancedLookProviders(): readonly AdvancedLookProviderCapabilities[] {
  return [...providers.values()];
}

/**
 * Pick the first registered provider that supports the requested execution mode.
 * Returns null when none match — callers must degrade explicitly.
 */
export function resolveAdvancedLookProviderForMode(
  executionMode: 'rendered' | 'realtime',
): AdvancedLookProviderCapabilities | null {
  for (const provider of providers.values()) {
    if (executionMode === 'rendered' && provider.supportsRendered) return provider;
    if (executionMode === 'realtime' && provider.supportsRealtime) return provider;
  }
  return null;
}

/** Test helper — clears registry between unit checks. */
export function __resetAdvancedLookProviderRegistryForTests(): void {
  providers.clear();
}
