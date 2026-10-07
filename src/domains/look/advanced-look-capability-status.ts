/**
 * advanced-look-capability-status — UI-facing Advanced capability projection (#356).
 * Location: src/domains/look/advanced-look-capability-status.ts
 *
 * Pure: maps a provider-capability list → Rendered/Live status rows. No React/I/O.
 * Pass `listAdvancedLookProviders()` from the registry — never invent client flags.
 */

import type { AdvancedLookProviderCapabilities } from './advanced-adaption';

export type AdvancedLookModeStatusId = 'available' | 'unavailable';

export type AdvancedLookModeStatusRow = {
  readonly mode: 'rendered' | 'realtime';
  readonly labelDe: string;
  readonly status: AdvancedLookModeStatusId;
  readonly statusLabelDe: string;
  readonly hintDe: string;
  readonly providerId: string | null;
  /** Primary action must stay disabled when unavailable — no fake run. */
  readonly runEnabled: boolean;
  readonly runLabelDe: string;
};

export type AdvancedLookCapabilityStatusView = {
  readonly basicSummaryDe: string;
  readonly advancedSummaryDe: string;
  readonly providerCount: number;
  readonly rows: readonly AdvancedLookModeStatusRow[];
};

const BASIC_SUMMARY_DE =
  'Basic Look Adaption ist die aktuelle Echtzeit-Stufe: deterministische Analyse und Look-Knöpfe ohne Neural-Engine.';

const ADVANCED_SUMMARY_DE =
  'Advanced Look Adaption ist die AI-/Neural-Stufe für Rendered und Live. Ohne installierten Provider bleibt sie sichtbar, aber nicht ausführbar.';

function pickProviderForMode(
  providers: readonly AdvancedLookProviderCapabilities[],
  mode: 'rendered' | 'realtime',
): AdvancedLookProviderCapabilities | null {
  for (const provider of providers) {
    if (mode === 'rendered' && provider.supportsRendered) return provider;
    if (mode === 'realtime' && provider.supportsRealtime) return provider;
  }
  return null;
}

function modeRow(
  mode: 'rendered' | 'realtime',
  providers: readonly AdvancedLookProviderCapabilities[],
): AdvancedLookModeStatusRow {
  const provider = pickProviderForMode(providers, mode);
  const available = provider !== null;

  // Capability display may become "available" when a provider registers;
  // execution stays disabled until a later engine slice — never fake-run.
  if (mode === 'rendered') {
    return {
      mode: 'rendered',
      labelDe: 'Rendered (Offline)',
      status: available ? 'available' : 'unavailable',
      statusLabelDe: available ? 'Provider verfügbar' : 'Noch nicht verfügbar',
      hintDe: available
        ? `Provider „${provider.providerId}“ meldet Rendered-Support — Engine noch nicht angebunden.`
        : 'Kein Provider für Rendered konfiguriert — kein Mock-Render.',
      providerId: provider?.providerId ?? null,
      runEnabled: false,
      runLabelDe: available
        ? 'Rendered · Engine fehlt'
        : 'Rendered nicht verfügbar',
    };
  }

  return {
    mode: 'realtime',
    labelDe: 'Live (Realtime)',
    status: available ? 'available' : 'unavailable',
    statusLabelDe: available ? 'Provider verfügbar' : 'Noch nicht verfügbar',
    hintDe: available
      ? `Provider „${provider.providerId}“ meldet Live/Realtime-Support — Engine noch nicht angebunden.`
      : 'Kein Provider für Live konfiguriert — keine Fake-Ausführung.',
    providerId: provider?.providerId ?? null,
    runEnabled: false,
    runLabelDe: available ? 'Live · Engine fehlt' : 'Live nicht verfügbar',
  };
}

/**
 * Build capability status for the Look Editor Advanced section.
 * Pass `listAdvancedLookProviders()` (or a test double list) — never invent flags.
 */
export function buildAdvancedLookCapabilityStatusView(
  providers: readonly AdvancedLookProviderCapabilities[],
): AdvancedLookCapabilityStatusView {
  return {
    basicSummaryDe: BASIC_SUMMARY_DE,
    advancedSummaryDe: ADVANCED_SUMMARY_DE,
    providerCount: providers.length,
    rows: [modeRow('rendered', providers), modeRow('realtime', providers)],
  };
}
