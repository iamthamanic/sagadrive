/**
 * Avatar V2 Modular Generate Flow — Editierbar vertical slice (#269 / Epic #248).
 * Location: src/domains/character/avatar/modular-generate-flow-v1.ts
 *
 * Orchestrates the #268 handoff job graph into a concrete editor result.
 * Provider mesh is raw material only — SagaDrive materializes body/identity/
 * wardrobe/props. Blob never marked full modular. No React / network.
 */

import {
  buildModularGenerateHandoffFor269,
  type ModularGenerateApproachId,
  type ModularGenerateGoldenFixtureId,
} from './modular-generate-decomposition-spike-v1';
import {
  buildGenerateEditorSeed,
  type GenerateProductModeId,
} from './generate-product-flow-v1';
import type { AvatarV2BodyFamily, AvatarV2Modularity } from './composition-contract-v2';
import type { CanonicalBodyFamilyId } from './canonical-body-families-v1';
import { STARTER_WEARABLE_IDS, type StarterWearableId } from './starter-wardrobe-manifest-v1';

export const MODULAR_GENERATE_FLOW_CONTRACT_VERSION =
  'SagaDriveModularGenerateFlowV1' as const;

export type ModularGenerateFlowStatus =
  | 'running'
  | 'ready'
  | 'partial'
  | 'degraded-free-form'
  | 'failed';

export interface ModularGenerateStageProgressV1 {
  stageId: string;
  labelDe: string;
  status: 'pending' | 'running' | 'done' | 'skipped' | 'failed';
}

export interface ModularGenerateFlowResultV1 {
  contractVersion: typeof MODULAR_GENERATE_FLOW_CONTRACT_VERSION;
  status: ModularGenerateFlowStatus;
  approachId: ModularGenerateApproachId;
  productMode: GenerateProductModeId;
  /** Empty until Analyzer — never from provider success. */
  capabilities: readonly [];
  bodyFamily: AvatarV2BodyFamily;
  modularity: AvatarV2Modularity;
  /** True only when GLB/wearable contract actually satisfied — never from blob. */
  fullModular: false | true;
  starterWardrobeIds: readonly StarterWearableId[];
  propIds: readonly string[];
  stages: readonly ModularGenerateStageProgressV1[];
  limitationsDe: readonly string[];
  headlineDe: string;
  detailDe: string;
  modelUrl?: string;
}

const STAGE_LABEL_DE: Record<string, string> = {
  'parse-intent': 'Ziel verstehen',
  'resolve-body-family': 'Körper wählen',
  'materialize-base-body': 'Basis-Körper laden',
  'transfer-identity': 'Look übertragen',
  'apply-traits': 'Traits anwenden',
  'attach-wearables': 'Kleidung anlegen',
  'attach-props': 'Props anlegen',
  'structure-analyze': 'Struktur prüfen',
};

const FIXTURE_BODY_FAMILY: Record<
  ModularGenerateGoldenFixtureId,
  CanonicalBodyFamilyId | 'custom'
> = {
  human: 'standard',
  elf: 'standard',
  dwarf: 'compact',
  'gumo-like': 'custom',
  'outfit-shirt-pants-boots-prop': 'standard',
};

const DEFAULT_WARDROBE: readonly StarterWearableId[] = [
  'underwear',
  'basic-shirt',
  'basic-pants',
  'basic-boots',
];

function allStages(
  statuses: Record<string, ModularGenerateStageProgressV1['status']>,
): ModularGenerateStageProgressV1[] {
  const handoff = buildModularGenerateHandoffFor269();
  return handoff.jobGraph.stages.map((s) => ({
    stageId: s.stageId,
    labelDe: STAGE_LABEL_DE[s.stageId] ?? s.stageId,
    status: statuses[s.stageId] ?? 'pending',
  }));
}

/**
 * Run modular generate orchestration for Editierbar intent.
 * Unusual anatomy (gumo-like) → free-form degrade per #268.
 */
export function runModularGenerateFlow(input: {
  productMode: GenerateProductModeId;
  /** Controlled golden fixture — never private user assets in checks. */
  fixtureId?: ModularGenerateGoldenFixtureId;
  modelUrl?: string;
  /** Simulate wearable stage failure → partial. */
  failWearables?: boolean;
  /** Simulate body family resolution failure → free-form. */
  forceUnusualAnatomy?: boolean;
  /**
   * Force degraded approach (generate body + catalog wearables) when library
   * transfer path is insufficient — still never blob-as-full-modular.
   */
  useDegradedApproach?: boolean;
}): ModularGenerateFlowResultV1 {
  const handoff = buildModularGenerateHandoffFor269();

  if (input.productMode !== 'editable-wardrobe') {
    const seed = buildGenerateEditorSeed({
      modelUrl: input.modelUrl ?? 'https://example.invalid/free.glb',
      productMode: 'free-form',
    });
    return {
      contractVersion: MODULAR_GENERATE_FLOW_CONTRACT_VERSION,
      status: 'degraded-free-form',
      approachId: 'free-form-blob',
      productMode: 'free-form',
      capabilities: [],
      bodyFamily: 'custom',
      modularity: 'monolithic',
      fullModular: false,
      starterWardrobeIds: [],
      propIds: [],
      stages: allStages({
        'parse-intent': 'done',
        'resolve-body-family': 'skipped',
        'materialize-base-body': 'skipped',
        'transfer-identity': 'skipped',
        'apply-traits': 'skipped',
        'attach-wearables': 'skipped',
        'attach-props': 'skipped',
        'structure-analyze': 'done',
      }),
      limitationsDe: seed.composition.limitationsDe,
      headlineDe: 'Freie Form',
      detailDe: 'Kein modularer Editierbar-Pfad — Original-/Custom-Körper.',
      modelUrl: input.modelUrl,
    };
  }

  const fixtureId = input.fixtureId ?? 'human';
  const unusual =
    input.forceUnusualAnatomy === true ||
    FIXTURE_BODY_FAMILY[fixtureId] === 'custom';

  if (unusual) {
    return {
      contractVersion: MODULAR_GENERATE_FLOW_CONTRACT_VERSION,
      status: 'degraded-free-form',
      approachId: handoff.defaultApproachId,
      productMode: 'editable-wardrobe',
      capabilities: [],
      bodyFamily: 'custom',
      modularity: 'monolithic',
      fullModular: false,
      starterWardrobeIds: [],
      propIds: [],
      stages: allStages({
        'parse-intent': 'done',
        'resolve-body-family': 'failed',
        'materialize-base-body': 'skipped',
        'transfer-identity': 'skipped',
        'apply-traits': 'skipped',
        'attach-wearables': 'skipped',
        'attach-props': 'skipped',
        'structure-analyze': 'done',
      }),
      limitationsDe: [
        'Ungewöhnliche Anatomie — kein kanonischer Körper. Weiter als Freie Form.',
        'Standardkleidung passt nicht automatisch.',
      ],
      headlineDe: 'Als Freie Form fortgesetzt',
      detailDe:
        'Editierbar war das Ziel, aber kein Body-Family-Match — ehrliche Custom-Nutzung.',
      modelUrl: input.modelUrl,
    };
  }

  const bodyFamily = FIXTURE_BODY_FAMILY[fixtureId] as CanonicalBodyFamilyId;
  const wearablesFailed = input.failWearables === true;
  const degraded = input.useDegradedApproach === true;
  const approachId: ModularGenerateApproachId = degraded
    ? handoff.degradedFallbackApproachId
    : handoff.defaultApproachId;
  const wardrobe = wearablesFailed
    ? (['underwear'] as const satisfies readonly StarterWearableId[])
    : DEFAULT_WARDROBE;
  const props =
    fixtureId === 'outfit-shirt-pants-boots-prop' ? (['starter-prop'] as const) : [];

  // Never full modular from a clothed blob — only when catalog wearables attached.
  const fullModular = !wearablesFailed;

  return {
    contractVersion: MODULAR_GENERATE_FLOW_CONTRACT_VERSION,
    status: wearablesFailed ? 'partial' : 'ready',
    approachId,
    productMode: 'editable-wardrobe',
    capabilities: [],
    bodyFamily,
    modularity: fullModular ? 'modular-parts' : 'limited',
    fullModular,
    starterWardrobeIds: [...wardrobe],
    propIds: [...props],
    stages: allStages({
      'parse-intent': 'done',
      'resolve-body-family': 'done',
      'materialize-base-body': 'done',
      'transfer-identity': degraded ? 'skipped' : 'done',
      'apply-traits': 'done',
      'attach-wearables': wearablesFailed ? 'failed' : 'done',
      'attach-props': props.length > 0 ? 'done' : 'skipped',
      'structure-analyze': 'done',
    }),
    limitationsDe: wearablesFailed
      ? [
          'Kleidungs-Schritt fehlgeschlagen — eingeschränkt modular, Avatar bleibt nutzbar.',
          'Keine Capabilities aus Provider-Erfolg.',
        ]
      : degraded
        ? [
            'Degraded: generierter Körper + Katalog-Kleidung — kein Blob als full modular.',
            'Fähigkeiten folgen der Strukturanalyse.',
          ]
        : [
            'Editierbarer modularer Avatar — Fähigkeiten folgen der Strukturanalyse.',
          ],
    headlineDe: wearablesFailed
      ? 'Teilweise modular bereit'
      : 'Editierbar & kleidungsfähig bereit',
    detailDe: wearablesFailed
      ? 'Basis-Körper und Look stehen; Kleidung nur teilweise.'
      : degraded
        ? 'Körper generiert, Kleidung aus Katalog — im Editor wechselbar.'
        : 'Kanonischer Körper mit Katalog-Kleidung — wechselbar im Editor.',
    modelUrl: input.modelUrl,
  };
}

/** Progress labels for UI — SagaDrive steps, no provider internals. */
export function listModularGenerateProgressLabelsDe(): readonly string[] {
  return buildModularGenerateHandoffFor269().jobGraph.stages.map(
    (s) => STAGE_LABEL_DE[s.stageId] ?? s.stageId,
  );
}

export function assertModularGenerateFlowInvariants(): {
  ok: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const ready = runModularGenerateFlow({
    productMode: 'editable-wardrobe',
    fixtureId: 'human',
    modelUrl: 'https://example.invalid/h.glb',
  });
  if (ready.status !== 'ready') issues.push('human ready');
  if (ready.fullModular !== true) issues.push('human full modular via catalog');
  if (ready.capabilities.length !== 0) issues.push('caps empty');
  if (!ready.starterWardrobeIds.includes('basic-shirt')) issues.push('wardrobe');
  if (ready.approachId !== 'vision-parse-library-body-catalog-wearables') {
    issues.push('default approach');
  }

  const gumo = runModularGenerateFlow({
    productMode: 'editable-wardrobe',
    fixtureId: 'gumo-like',
  });
  if (gumo.status !== 'degraded-free-form') issues.push('gumo free-form');
  if (gumo.fullModular !== false) issues.push('gumo not modular');

  const partial = runModularGenerateFlow({
    productMode: 'editable-wardrobe',
    fixtureId: 'human',
    failWearables: true,
  });
  if (partial.status !== 'partial') issues.push('partial status');
  if (partial.fullModular !== false) issues.push('partial not full modular');

  const free = runModularGenerateFlow({ productMode: 'free-form' });
  if (free.bodyFamily !== 'custom') issues.push('free custom');

  const outfit = runModularGenerateFlow({
    productMode: 'editable-wardrobe',
    fixtureId: 'outfit-shirt-pants-boots-prop',
  });
  if (outfit.propIds.length < 1) issues.push('props separated');

  // Blob forbid: even outfit path never claims modularity from autosplit.
  if (outfit.approachId === 'full-mesh-autosplit') issues.push('no autosplit');

  const degraded = runModularGenerateFlow({
    productMode: 'editable-wardrobe',
    fixtureId: 'human',
    useDegradedApproach: true,
  });
  if (degraded.approachId !== 'generate-body-only-catalog-wearables') {
    issues.push('degraded approach');
  }
  if (degraded.fullModular !== true) issues.push('degraded still catalog modular');

  const labels = listModularGenerateProgressLabelsDe();
  if (labels.length < 6) issues.push('progress labels');
  if (!labels.some((l) => /Körper/.test(l))) issues.push('body label DE');

  // Sanity: STARTER ids still defined
  if (!STARTER_WEARABLE_IDS.includes('basic-shirt')) issues.push('starter ids');

  return { ok: issues.length === 0, issues };
}
