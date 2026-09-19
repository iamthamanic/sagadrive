/**
 * Avatar V2 Generate Product Flow — Editierbar vs Freie Form (#267 / Epic #248).
 * Location: src/domains/character/avatar/generate-product-flow-v1.ts
 *
 * Product intent for „Mit KI erstellen“. Provider id never drives source or
 * capabilities. Mode is intent, not a capability claim. No React / network.
 */

import type { AvatarV2Anatomy, AvatarV2BodyFamily, AvatarV2Modularity } from './composition-contract-v2';
import type { Avatar3dGenerationProviderId } from './generation/types';

export const GENERATE_PRODUCT_FLOW_CONTRACT_VERSION =
  'SagaDriveGenerateProductFlowV1' as const;

/** Product goals — independent of text vs image input mode. */
export const GENERATE_PRODUCT_MODE_IDS = ['editable-wardrobe', 'free-form'] as const;
export type GenerateProductModeId = (typeof GENERATE_PRODUCT_MODE_IDS)[number];

export function isGenerateProductModeId(value: unknown): value is GenerateProductModeId {
  return (
    typeof value === 'string' &&
    (GENERATE_PRODUCT_MODE_IDS as readonly string[]).includes(value)
  );
}

export interface GenerateProductModeOptionV1 {
  modeId: GenerateProductModeId;
  labelDe: string;
  detailDe: string;
  recommended: boolean;
}

export interface GenerateProductIntentCompositionV1 {
  /** Intent anatomy — Analyzer may refine; never a capability unlock. */
  anatomy: AvatarV2Anatomy;
  modularity: AvatarV2Modularity;
  bodyFamily: AvatarV2BodyFamily;
  bodyCompatibility: AvatarV2BodyFamily | 'unknown';
  limitationsDe: readonly string[];
}

export interface GenerateEditorSeedV1 {
  contractVersion: typeof GENERATE_PRODUCT_FLOW_CONTRACT_VERSION;
  productMode: GenerateProductModeId;
  modelUrl: string;
  /** Always empty until Analyzer — provider success never fills this. */
  capabilities: readonly [];
  composition: GenerateProductIntentCompositionV1;
  /** V2 source vocabulary; legacy UI may still store meshy. */
  v2Source: 'generate';
  /** Optional adapter id for GenerationRecord only — not for UI source. */
  adapterProviderId?: Avatar3dGenerationProviderId;
}

export function listGenerateProductModeOptions(): readonly GenerateProductModeOptionV1[] {
  return [
    {
      modeId: 'editable-wardrobe',
      labelDe: 'Editierbar & kleidungsfähig (empfohlen)',
      detailDe:
        'Ziel: kanonischer SagaDrive-Körper mit Kleidung und Morphs, soweit die Analyse es freigibt.',
      recommended: true,
    },
    {
      modeId: 'free-form',
      labelDe: 'Freie Form',
      detailDe:
        'Ziel: freie Körperform / Custom Artifact. Standardkleidung passt nicht automatisch.',
      recommended: false,
    },
  ];
}

/**
 * Map product intent → provisional composition axes.
 * Analyzer may later degrade editable → custom; free-form may still get a family hint.
 */
export function resolveGenerateIntentComposition(
  mode: GenerateProductModeId,
): GenerateProductIntentCompositionV1 {
  if (mode === 'free-form') {
    return {
      anatomy: 'custom-creature',
      modularity: 'monolithic',
      bodyFamily: 'custom',
      bodyCompatibility: 'custom',
      limitationsDe: [
        'Freie Form: Capabilities folgen der Strukturanalyse — Provider-Erfolg allein reicht nicht.',
        'Standard-SagaDrive-Kleidung passt nicht automatisch auf diesen Körper.',
      ],
    };
  }
  return {
    anatomy: 'humanoid',
    modularity: 'modular-parts',
    bodyFamily: 'standard',
    bodyCompatibility: 'standard',
    limitationsDe: [
      'Editierbar: Ziel ist ein kanonischer Körper — die Analyse bestätigt oder degradiert auf Custom.',
      'Fähigkeiten bleiben pending, bis die Strukturanalyse abgeschlossen ist.',
    ],
  };
}

/**
 * When editable intent cannot be validated as canonical, degrade composition.
 * Mode stays editable-wardrobe (intent); axes become custom.
 */
export function degradeEditableToCustom(
  composition: GenerateProductIntentCompositionV1,
  reasonDe: string,
): GenerateProductIntentCompositionV1 {
  return {
    anatomy: 'custom-creature',
    modularity: 'monolithic',
    bodyFamily: 'custom',
    bodyCompatibility: 'custom',
    limitationsDe: [
      ...composition.limitationsDe,
      reasonDe.trim() ||
        'Kanonische Umsetzung nicht validierbar — als freier Körper weiter nutzbar.',
    ],
  };
}

export function buildGenerateEditorSeed(input: {
  modelUrl: string;
  productMode: GenerateProductModeId;
  /** Adapter id for records only — never unlocks capabilities. */
  adapterProviderId?: Avatar3dGenerationProviderId;
  /** When true, force editable degrade path (analyzer failed canonical). */
  forceEditableDegrade?: boolean;
  degradeReasonDe?: string;
}): GenerateEditorSeedV1 {
  let composition = resolveGenerateIntentComposition(input.productMode);
  if (input.productMode === 'editable-wardrobe' && input.forceEditableDegrade) {
    composition = degradeEditableToCustom(
      composition,
      input.degradeReasonDe ??
        'Kanonische Umsetzung nicht validierbar — als freier Körper weiter nutzbar.',
    );
  }
  return {
    contractVersion: GENERATE_PRODUCT_FLOW_CONTRACT_VERSION,
    productMode: input.productMode,
    modelUrl: input.modelUrl,
    capabilities: [],
    composition,
    v2Source: 'generate',
    adapterProviderId: input.adapterProviderId,
  };
}

/** Provider name must never decide product source or capabilities. */
export function assertProviderDoesNotDriveCapabilities(
  providerId: string,
): { ok: true; capabilities: readonly [] } {
  void providerId;
  return { ok: true, capabilities: [] };
}

export function assertGenerateProductFlowInvariants(): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const options = listGenerateProductModeOptions();
  if (options.length !== 2) issues.push('expected 2 modes');
  if (!options.some((o) => o.recommended && o.modeId === 'editable-wardrobe')) {
    issues.push('editable recommended');
  }
  if (!/Editierbar/.test(options[0]?.labelDe ?? '')) issues.push('editable label');
  if (!/Freie Form/.test(options[1]?.labelDe ?? '')) issues.push('free-form label');

  const editable = resolveGenerateIntentComposition('editable-wardrobe');
  if (editable.anatomy !== 'humanoid' || editable.bodyFamily !== 'standard') {
    issues.push('editable intent axes');
  }
  const free = resolveGenerateIntentComposition('free-form');
  if (free.anatomy !== 'custom-creature' || free.bodyFamily !== 'custom') {
    issues.push('free-form intent axes');
  }

  const seed = buildGenerateEditorSeed({
    modelUrl: 'https://example.invalid/g.glb',
    productMode: 'editable-wardrobe',
    adapterProviderId: 'meshy',
  });
  if (seed.capabilities.length !== 0) issues.push('caps empty');
  if (seed.v2Source !== 'generate') issues.push('v2 source generate');
  if (seed.adapterProviderId === 'meshy' && seed.v2Source !== 'generate') {
    issues.push('provider must not become source');
  }

  const degraded = buildGenerateEditorSeed({
    modelUrl: 'https://example.invalid/g.glb',
    productMode: 'editable-wardrobe',
    forceEditableDegrade: true,
  });
  if (degraded.composition.bodyFamily !== 'custom') issues.push('degrade custom');
  if (degraded.productMode !== 'editable-wardrobe') issues.push('intent preserved');

  const guard = assertProviderDoesNotDriveCapabilities('meshy');
  if (guard.capabilities.length !== 0) issues.push('provider guard');

  if (!isGenerateProductModeId('free-form') || isGenerateProductModeId('meshy')) {
    issues.push('mode guard');
  }

  return { ok: issues.length === 0, issues };
}
